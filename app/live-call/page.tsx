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
  // State for the full transcript
  const [transcript, setTranscript] = useState<DisplayEntry[]>([]);
  // Interim transcripts for partial utterances
  const [interimTranscript, setInterimTranscript] = useState<TranscriptEntry[]>([]);
  // Current speaker text buffer
  const [currentCollectedText, setCurrentCollectedText] = useState<string[]>([]);
  // Current speaker number
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(0);
  // Controls audio on/off (recording state)
  const [isAudioOn, setIsAudioOn] = useState(false);
  // Controls whether full transcript is expanded
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  const { connection, connectToDeepgram, disconnectFromDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();

  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  // Add new state for chat messages
  const [messages, setMessages] = useState<Array<{
    id: number;
    type: 'summary' | 'user' | 'ai';
    title?: string;
    content: string;
    timestamp: string;
    quotedMessage?: string;
  }>>([]);

  const fetchAIResponse = async (userMessage: string, transcript: DisplayEntry[]) => {
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: userMessage // You might want to send more context from transcript here
        }),
      });
      
      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Error fetching AI response:', error);
      return "Sorry, I couldn't process your request at this time.";
    }
  };

  // Add handler for new messages
  const handleSendMessage = async (message: string) => {
    // First add the user message
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }]);
  
    // Then fetch and add AI response
    const aiResponse = await fetchAIResponse(message, combinedTranscript);
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'ai',
      content: aiResponse,
      timestamp: new Date().toISOString(),
      quotedMessage: message // Include the original message
    }]);
  };

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

  // Combine final and interim transcripts for display
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

  // For the LiveTranscriptBar, we'll show the last line of the transcript as a snippet
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
            }))
          }
        />
      )}

      <MainContentArea messages={messages} />
      <InputSection onSendMessage={handleSendMessage} />
    </div>
  );
}