"use client";

import { useEffect, useState, useRef } from "react";
import {
  LiveConnectionState,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from "../context/DeepgramContextProvider";
import {
  MicrophoneEvents,
  MicrophoneState,
  useMicrophone,
} from "../context/MicrophoneContextProvider";

import LiveTranscriptBar from "../components/LiveTranscriptBar";
import TranscriptView from "../components/TranscriptView";
import MainContentArea from "../components/MainContentArea";
import InputSection from "../components/InputSection";

type TranscriptEntry = {
  type: 'transcript';
  speaker: number;
  text: string;
  isUtteranceEnd?: boolean;
  lastWordEnd?: number;
};

export type ConsolidatedMessage = {
  type: 'consolidated';
  speaker: number;
  text: string;
  trigger: 'utterance_end' | 'speaker_change';
};

export type DisplayEntry = TranscriptEntry | ConsolidatedMessage;

export default function LiveCallPage() {
  const [transcript, setTranscript] = useState<DisplayEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<TranscriptEntry[]>([]);
  const [currentCollectedText, setCurrentCollectedText] = useState<string[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(0);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  const { connection, connectToDeepgram, disconnectFromDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();

  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  const [messages, setMessages] = useState<Array<{
    id: number;
    type: 'summary' | 'user' | 'ai';
    title?: string;
    content: string;
    timestamp: string;
    quotedMessage?: string;
  }>>([]);

  const combinedTranscript: DisplayEntry[] = [
    ...transcript,
    ...interimTranscript.map(t => ({
      type: 'transcript' as const,
      speaker: t.speaker,
      text: t.text,
      isUtteranceEnd: t.isUtteranceEnd,
      lastWordEnd: t.lastWordEnd
    }))
  ];

  const fetchAIResponse = async (userMessage: string, transcript: string) => {
    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          transcript: transcript
        }),
      });
      
      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error('Error fetching AI response:', error);
      return "Sorry, I couldn't process your request at this time.";
    }
  };
  
  const handleSendMessage = async (message: string) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }]);
  
    const fullTranscript = combinedTranscript.map(entry => entry.text).join('\n');
  
    const aiResponse = await fetchAIResponse(message, fullTranscript);
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'ai',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      quotedMessage: message
    }]);
  };

  /**
   * Generate a summary of the last 50 lines of transcript.
   * If we have multiple summaries, include up to the last 3 summaries in the prompt.
   */
  const generateSummary = async () => {
    const finalTranscriptEntries = combinedTranscript.filter(e => e.type === 'transcript') as TranscriptEntry[];
    const totalFinalLines = finalTranscriptEntries.length;

    if (totalFinalLines === 0) return;

    // Identify the slice of 50 lines we want. 
    // If totalFinalLines = 50, we want [0..49]. If 100, we want [50..99], and so forth.
    const startIndex = totalFinalLines - 50; // This works because we'll only call this when totalFinalLines % 50 === 0
    const last50Lines = finalTranscriptEntries.slice(startIndex, totalFinalLines);

    // Get the last 1-3 summaries
    const pastSummaries = messages
      .filter(m => m.type === 'summary')
      .slice(-3);

    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: last50Lines,
        pastSummaries: pastSummaries.map(s => s.content),
      }),
    });

    if (!response.ok) {
      console.error('Error generating summary:', response.statusText);
      return;
    }

    const data = await response.json();
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'summary',
      title: 'Summary',
      content: data.summary,
      timestamp: new Date().toISOString()
    }]);
  };

  /**
   * Monitor the length of final transcript lines and trigger summary every 50 lines.
   */
  useEffect(() => {
    const finalTranscriptLines = combinedTranscript.filter(e => e.type === 'transcript').length;
    if (finalTranscriptLines > 0 && finalTranscriptLines % 50 === 0) {
      // Trigger summary generation
      generateSummary();
    }
  }, [combinedTranscript]);

  // Manage microphone and Deepgram connection when isAudioOn changes
  useEffect(() => {
    if (isAudioOn) {
      if (microphoneState === MicrophoneState.NotSetup) {
        setupMicrophone();
      }

      if (microphoneState === MicrophoneState.Ready && connectionState !== LiveConnectionState.OPEN) {
        connectToDeepgram({
          model: "nova-2-meeting",
          interim_results: true,
          smart_format: true,
          filler_words: true,
          utterance_end_ms: 1200,
          diarize: true,
        });
      }

      if (microphoneState === MicrophoneState.Ready && connectionState === LiveConnectionState.OPEN) {
        startMicrophone();
      }
    } else {
      if (microphoneState === MicrophoneState.Open) {
        stopMicrophone();
      }
      if (connection) {
        disconnectFromDeepgram();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioOn, microphoneState, connectionState]);

  // Set up transcription event listeners
  useEffect(() => {
    if (!microphone || !connection) return;

    const handleConsolidation = (trigger: 'utterance_end' | 'speaker_change', newSpeaker?: number) => {
      if (currentCollectedText.length > 0) {
        const consolidatedEntry = {
          type: 'consolidated' as const,
          speaker: currentSpeaker,
          text: currentCollectedText.join(' '),
          trigger
        };
        setTranscript(prev => [...prev, consolidatedEntry]);
        setCurrentCollectedText([]);
      }

      if (newSpeaker !== undefined) {
        setCurrentSpeaker(newSpeaker);
      }
    };

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const words = data.channel.alternatives[0].words || [];
      if (words.length > 0) {
        const newEntry: TranscriptEntry = {
          type: 'transcript',
          speaker: words[0].speaker || 0,
          text: words.map(word => word.word).join(' '),
          isUtteranceEnd: false
        };

        if (data.is_final) {
          if (newEntry.speaker !== currentSpeaker) {
            handleConsolidation('speaker_change', newEntry.speaker);
          }
          setCurrentCollectedText(prev => [...prev, newEntry.text]);
          setTranscript(prev => [...prev, newEntry]);
          setInterimTranscript([]);
        } else {
          setInterimTranscript([newEntry]);
        }
      }
    };

    const onUtteranceEnd = (data: any) => {
      setTranscript(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry && lastEntry.type === 'transcript') {
          return [...prev.slice(0, -1), {
            ...lastEntry,
            isUtteranceEnd: true,
            lastWordEnd: data.last_word_end
          }];
        }
        return prev;
      });
      handleConsolidation('utterance_end');
    };

    if (isAudioOn && connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.addListener('UtteranceEnd', onUtteranceEnd);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.removeListener('UtteranceEnd', onUtteranceEnd);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
    };
  }, [isAudioOn, connectionState, microphone, connection, currentSpeaker, currentCollectedText]);

  // Keep-alive management
  useEffect(() => {
    if (!connection) return;

    if (microphoneState !== MicrophoneState.Open && connectionState === LiveConnectionState.OPEN) {
      connection.keepAlive();
      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
    }

    return () => {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
    };
  }, [microphoneState, connectionState, connection]);

  const lastLine = combinedTranscript.length > 0 ? combinedTranscript[combinedTranscript.length - 1].text : "No transcript yet...";

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <LiveTranscriptBar
        transcript={lastLine}
        isRecording={isAudioOn}
        onToggleRecording={() => setIsAudioOn(!isAudioOn)}
        isExpanded={isTranscriptExpanded}
        onToggleExpand={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
      />

      {isTranscriptExpanded && (
        <TranscriptView
          onClose={() => setIsTranscriptExpanded(false)}
          transcript={combinedTranscript
            .filter(entry => entry.type === 'transcript')
            .map(entry => ({
              speaker: (entry as TranscriptEntry).speaker,
              text: (entry as TranscriptEntry).text
            }))}
        />
      )}

      <MainContentArea messages={messages} />
      <InputSection onSendMessage={handleSendMessage} />
    </div>
  );
}
