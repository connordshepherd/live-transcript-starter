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
import { useSearchParams } from "next/navigation";

/**
 * We keep the transcript entry structure the same:
 * "type" to identify it's a transcript line,
 * "speaker" to track which speaker said it,
 * "text" for the line content.
 */
type TranscriptEntry = {
  type: "transcript";
  speaker: number;
  text: string;
};

type DisplayEntry = TranscriptEntry; // In this example, we only have transcript entries.

export default function LiveCallPage() {
  // Grab the "meetingId" parameter from the URL query string
  // Example: /live-call?meetingId=abc123
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("meetingId");

  // Local states to manage transcript lines
  const [transcript, setTranscript] = useState<DisplayEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<TranscriptEntry[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(0);

  // Manage microphone & Deepgram
  const { connection, connectToDeepgram, disconnectFromDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();

  // Keep-alive interval reference
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  // Additional states for toggling audio, transcript expansion, and capturing chat messages
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  // Our chat/summary messages
  const [messages, setMessages] = useState<
    Array<{
      id: number;
      type: "summary" | "user" | "ai";
      title?: string;
      content: string;
      timestamp: string;
      quotedMessage?: string;
    }>
  >([]);

  // Track the last count at which we summarized
  const [lastSummarizedCount, setLastSummarizedCount] = useState<number>(0);

  // Combine final and interim transcript lines for rendering
  const combinedTranscript: DisplayEntry[] = [
    ...transcript,
    ...interimTranscript.map((t) => ({
      type: "transcript" as const,
      speaker: t.speaker,
      text: t.text,
    })),
  ];

  /************************************************************************
   * 1) FETCH EXISTING TRANSCRIPT LINES ON MOUNT
   ************************************************************************/
  useEffect(() => {
    // If there's no meetingId in the URL, skip
    if (!meetingId) return;

    // Load the existing transcript lines from our new API route
    const loadTranscript = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/transcript`);
        if (!res.ok) {
          throw new Error("Failed to fetch transcript");
        }

        // The server is expected to return an array of lines like:
        // [
        //   { id, meetingId, speaker, text, createdAt },
        //   ...
        // ]
        const data = await res.json();

        // Transform them into our local shape: { type: "transcript", speaker, text }
        const existingTranscript: TranscriptEntry[] = data.map((row: any) => ({
          type: "transcript",
          speaker: row.speaker,
          text: row.text,
        }));

        // Store them in our local state
        setTranscript(existingTranscript);
      } catch (err) {
        console.error(err);
      }
    };

    loadTranscript();
  }, [meetingId]);

  /************************************************************************
   * 2) FETCH AI RESPONSES (unchanged from your code)
   ************************************************************************/
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

  /************************************************************************
   * 3) HANDLE MESSAGES/SUMMARIES (unchanged from your code)
   ************************************************************************/
  const handleSendMessage = async (message: string) => {
    // Add user message to local state
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "user",
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Use the combined transcript to gather context
    const fullTranscript = combinedTranscript.map((entry) => entry.text).join("\n");

    // Then fetch an AI response
    const aiResponse = await fetchAIResponse(message, fullTranscript);

    // Add AI response to local state
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
   * Monitor the length of final transcript lines and trigger summary
   * every 20 lines, but only if we haven't summarized at this line count before.
   */
  useEffect(() => {
    const finalTranscriptLines = combinedTranscript.filter((e) => e.type === "transcript").length;
    if (finalTranscriptLines > 0 && finalTranscriptLines % 20 === 0 && finalTranscriptLines !== lastSummarizedCount) {
      generateSummary();
      setLastSummarizedCount(finalTranscriptLines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedTranscript, lastSummarizedCount]);

  /************************************************************************
   * 4) MANAGE MICROPHONE AND DEEPGRAM (mostly unchanged from your code)
   ************************************************************************/
  useEffect(() => {
    if (isAudioOn) {
      // If user toggles "on," ensure microphone is setup
      if (microphoneState === MicrophoneState.NotSetup) {
        setupMicrophone();
      }

      // If mic is ready but Deepgram isn't open, connect to it
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

      // If mic is ready and Deepgram is open, start capturing audio
      if (microphoneState === MicrophoneState.Ready && connectionState === LiveConnectionState.OPEN) {
        startMicrophone();
      }
    } else {
      // If user toggles "off," stop audio
      if (microphoneState === MicrophoneState.Open) {
        stopMicrophone();
      }
      if (connection) {
        disconnectFromDeepgram();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioOn, microphoneState, connectionState]);

  /************************************************************************
   * 5) HANDLE TRANSCRIPTION EVENTS
   ************************************************************************/
  useEffect(() => {
    if (!microphone || !connection) return;

    // Send mic data to Deepgram as it's available
    const onData = (e: BlobEvent) => {
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    // Called whenever there's new transcript data
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

          // Add final transcript to local state
          setTranscript((prev) => [...prev, newEntry]);
          setInterimTranscript([]);

          // *************************************************
          //  POST FINAL TRANSCRIPT LINE TO OUR API
          // *************************************************
          if (meetingId) {
            fetch(`/api/meetings/${meetingId}/transcript`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                speaker: newEntry.speaker,
                text: newEntry.text,
              }),
            }).catch((err) => {
              console.error("Error storing transcript line:", err);
            });
          }
        } else {
          // For interim lines, just update local state without saving
          setInterimTranscript([newEntry]);
        }
      }
    };

    const onUtteranceEnd = () => {
      // We no longer do anything special on utterance end.
    };

    // Register event listeners when audio is on and connection is open
    if (isAudioOn && connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.addListener("UtteranceEnd", onUtteranceEnd);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
    }

    // Cleanup
    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.removeListener("UtteranceEnd", onUtteranceEnd);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
    };
  }, [isAudioOn, connectionState, microphone, connection, currentSpeaker, meetingId]);

  /************************************************************************
   * 6) KEEP-ALIVE MANAGEMENT
   ************************************************************************/
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

  // Compute the "last line" for display in the small bar
  const lastLine =
    combinedTranscript.length > 0 ? combinedTranscript[combinedTranscript.length - 1].text : "No transcript yet...";

  /************************************************************************
   * 7) RENDER
   ************************************************************************/
  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* A bar at the top that shows a snippet of the transcript and mic toggle */}
      <LiveTranscriptBar
        transcript={lastLine}
        isRecording={isAudioOn}
        onToggleRecording={() => setIsAudioOn(!isAudioOn)}
        isExpanded={isTranscriptExpanded}
        onToggleExpand={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
      />

      {/* Show an expanded transcript if the user wants */}
      {isTranscriptExpanded && (
        <TranscriptView
          onClose={() => setIsTranscriptExpanded(false)}
          transcript={combinedTranscript
            .filter((entry) => entry.type === "transcript")
            .map((entry) => ({
              speaker: entry.speaker,
              text: entry.text,
            }))}
        />
      )}

      {/* Main content area to display chat / summaries */}
      <MainContentArea messages={messages} />

      {/* Input section for user messages */}
      <InputSection onSendMessage={handleSendMessage} />
    </div>
  );
}
