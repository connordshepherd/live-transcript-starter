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
import InitialState from "../components/InitialState";

type TranscriptEntry = {
  type: "transcript";
  speaker: number;
  text: string;
};

type DisplayEntry = TranscriptEntry; // Only transcript entries remain

export default function LiveCallPage() {
  const [isMeetingStarted, setIsMeetingStarted] = useState(false);
  const [transcript, setTranscript] = useState<DisplayEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<TranscriptEntry[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(0);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const { connection, connectToDeepgram, disconnectFromDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  const handleStartMeeting = () => {
    setIsMeetingStarted(true);
  };

  const [messages, setMessages] = useState<Array<{
    id: number;
    type: "summary" | "user" | "ai";
    title?: string;
    content: string;
    timestamp: string;
    quotedMessage?: string;
  }>>([]);

  // Track the last count at which we summarized
  const [lastSummarizedCount, setLastSummarizedCount] = useState<number>(0);

  const combinedTranscript: DisplayEntry[] = [
    ...transcript,
    ...interimTranscript.map((t) => ({
      type: "transcript" as const,
      speaker: t.speaker,
      text: t.text,
    })),
  ];

  const fetchAIResponse = async (userMessage: string, transcriptText: string) => {
    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          transcript: transcriptText,
        }),
      });

      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error("Error fetching AI response:", error);
      return "Sorry, I couldn't process your request at this time.";
    }
  };

  const handleSendMessage = async (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "user",
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);

    const fullTranscript = combinedTranscript.map((entry) => entry.text).join("\n");

    const aiResponse = await fetchAIResponse(message, fullTranscript);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "ai",
        content: aiResponse,
        timestamp: new Date().toISOString(),
        quotedMessage: message,
      },
    ]);
  };

  /**
   * Generate a summary of the last 20 lines of transcript.
   * If we have multiple summaries, include up to the last 3 summaries in the prompt.
   */
  const generateSummary = async () => {
    const finalTranscriptEntries = combinedTranscript.filter((e) => e.type === "transcript") as TranscriptEntry[];
    const totalFinalLines = finalTranscriptEntries.length;

    if (totalFinalLines === 0) return;

    // Identify the slice of 20 lines we want
    const startIndex = totalFinalLines - 20;
    const last20Lines = finalTranscriptEntries.slice(startIndex, totalFinalLines);

    // Get the last 1-3 summaries
    const pastSummaries = messages.filter((m) => m.type === "summary").slice(-3);

    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: last20Lines.map((line) => ({ speaker: line.speaker, text: line.text })),
        pastSummaries: pastSummaries.map((s) => s.content),
      }),
    });

    if (!response.ok) {
      console.error("Error generating summary:", response.statusText);
      return;
    }

    const data = await response.json();
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "summary",
        title: "Summary",
        content: data.summary,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  /**
   * Monitor the length of final transcript lines and trigger summary every 20 lines,
   * but only if we haven't summarized at this line count before.
   */
  useEffect(() => {
    const finalTranscriptLines = combinedTranscript.filter((e) => e.type === "transcript").length;
    if (finalTranscriptLines > 0 && finalTranscriptLines % 20 === 0 && finalTranscriptLines !== lastSummarizedCount) {
      generateSummary();
      setLastSummarizedCount(finalTranscriptLines);
    }
  }, [combinedTranscript, lastSummarizedCount]);

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
  }, [isAudioOn, microphoneState, connectionState, connection, startMicrophone, stopMicrophone, disconnectFromDeepgram, setupMicrophone]);

  // Set up transcription event listeners
  useEffect(() => {
    if (!microphone || !connection) return;

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const words = data.channel.alternatives[0].words || [];
      if (words.length > 0) {
        const newEntry: TranscriptEntry = {
          type: "transcript",
          speaker: words[0].speaker || 0,
          text: words.map((word) => word.word).join(" "),
        };

        if (data.is_final) {
          // If the speaker changes, update currentSpeaker
          if (newEntry.speaker !== currentSpeaker) {
            setCurrentSpeaker(newEntry.speaker);
          }
          setTranscript((prev) => [...prev, newEntry]);
          setInterimTranscript([]);
        } else {
          setInterimTranscript([newEntry]);
        }
      }
    };

    const onUtteranceEnd = () => {
      // We no longer do anything special on utterance end.
    };

    if (isAudioOn && connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.addListener("UtteranceEnd", onUtteranceEnd);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.removeListener("UtteranceEnd", onUtteranceEnd);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
    };
  }, [isAudioOn, connectionState, microphone, connection, currentSpeaker]);

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

  if (!isMeetingStarted) {
    // Show the InitialState until the user starts the meeting
    return <InitialState onStart={() => setIsMeetingStarted(true)} />;
  }
  // Once the meeting is started, show the main layout

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
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
            .filter((entry) => entry.type === "transcript")
            .map((entry) => ({
              speaker: (entry as TranscriptEntry).speaker,
              text: (entry as TranscriptEntry).text,
            }))}
        />
      )}

      <MainContentArea messages={messages} />
      <InputSection onSendMessage={handleSendMessage} />
    </div>
  );
}
