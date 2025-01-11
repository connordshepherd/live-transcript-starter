"use client";

import { useEffect, useState, useRef, Suspense } from "react";
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

// ADDED for Meeting Messages:
type MeetingMessageType = "summary" | "user" | "ai";
type MeetingMessageEntry = {
  id?: string; // Changed from number to string to match UUID from database
  type: MeetingMessageType;
  title?: string;
  content: string;
  timestamp: string;
  quotedMessage?: string;
};

function LiveCallContent() {
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

  // Additional states for toggling audio, transcript expansion
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  // -------------------------------------------------------------
  // ADDED for Meeting Messages:
  // We'll store chat / summary / AI messages from DB here
  // -------------------------------------------------------------
  const [messages, setMessages] = useState<MeetingMessageEntry[]>([]);

  // Track the last count at which we summarized
  const [lastSummarizedCount, setLastSummarizedCount] = useState<number>(0);

  // Combine final + interim for rendering
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
    if (!meetingId) return;

    // Load the existing transcript lines
    const loadTranscript = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/transcript`);
        if (!res.ok) {
          throw new Error("Failed to fetch transcript");
        }
        const data = await res.json();

        const existingTranscript: TranscriptEntry[] = data.map((row: any) => ({
          type: "transcript",
          speaker: row.speaker,
          text: row.text,
        }));

        setTranscript(existingTranscript);
      } catch (err) {
        console.error(err);
      }
    };

    // ADDED for Meeting Messages: load any existing user/AI/summary messages
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/messages`);
        if (!res.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data = await res.json();
        setMessages(data); // array of MeetingMessageEntry from DB
      } catch (err) {
        console.error(err);
      }
    };

    loadTranscript();
    loadMessages();
  }, [meetingId]);

  /************************************************************************
   * 2) FETCH AI RESPONSES
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
   * 3) HANDLE MESSAGES/SUMMARIES
   ************************************************************************/
  // We now post new messages to /api/meetings/[meetingId]/messages
  const handleSendMessage = async (messageText: string) => {
    if (!meetingId) return;

    // 1) Add user message to DB:
    const userMsgPayload: Omit<MeetingMessageEntry, "id"> = {
      type: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    let createdUserMsg: MeetingMessageEntry | null = null;
    try {
      const res = await fetch(`/api/meetings/${meetingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userMsgPayload),
      });
      if (!res.ok) {
        throw new Error("Error creating user message");
      }
      createdUserMsg = await res.json();
      if (createdUserMsg) {  // Add null check
        setMessages((prev) => [...prev, createdUserMsg as MeetingMessageEntry]);
      }
    } catch (err) {
      console.error(err);
    }

    // 2) Get AI response
    const fullTranscript = combinedTranscript.map((entry) => entry.text).join("\n");
    const aiResponse = await fetchAIResponse(messageText, fullTranscript);

    // 3) Store AI message to DB
    const aiMsgPayload: Omit<MeetingMessageEntry, "id"> = {
      type: "ai",
      content: aiResponse,
      quotedMessage: messageText,
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/meetings/${meetingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiMsgPayload),
      });
      if (!res.ok) {
        throw new Error("Error creating AI message");
      }
      const createdAiMsg = await res.json();
      setMessages((prev) => [...prev, createdAiMsg]);
    } catch (err) {
      console.error(err);
    }
  };

  // Summaries also get saved in the same table
  const generateSummary = async () => {
    if (!meetingId) return;

    const finalTranscriptEntries = combinedTranscript.filter((e) => e.type === "transcript") as TranscriptEntry[];
    const totalFinalLines = finalTranscriptEntries.length;
    if (totalFinalLines === 0) return;

    const startIndex = totalFinalLines - 20;
    const last20Lines = finalTranscriptEntries.slice(startIndex, totalFinalLines);

    // Get the last 1-3 summaries
    const pastSummaries = messages.filter((m) => m.type === "summary").slice(-3);

    try {
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

      // Now store the summary in DB
      const summaryPayload: Omit<MeetingMessageEntry, "id"> = {
        type: "summary",
        content: data.summary,
        timestamp: new Date().toISOString(),
        title: "Summary",
      };

      const res = await fetch(`/api/meetings/${meetingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summaryPayload),
      });
      if (!res.ok) {
        throw new Error("Error creating summary message");
      }
      const createdSummaryMsg = await res.json();
      setMessages((prev) => [...prev, createdSummaryMsg]);
    } catch (error) {
      console.error("Error generating summary:", error);
    }
  };

  // Trigger summary every 20 lines
  useEffect(() => {
    const finalTranscriptLines = combinedTranscript.filter((e) => e.type === "transcript").length;
    if (finalTranscriptLines > 0 && finalTranscriptLines % 20 === 0 && finalTranscriptLines !== lastSummarizedCount) {
      generateSummary();
      setLastSummarizedCount(finalTranscriptLines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedTranscript, lastSummarizedCount]);

  /************************************************************************
   * 4) MANAGE MICROPHONE AND DEEPGRAM
   ************************************************************************/
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

  /************************************************************************
   * 5) HANDLE TRANSCRIPTION EVENTS
   ************************************************************************/
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
          if (newEntry.speaker !== currentSpeaker) {
            setCurrentSpeaker(newEntry.speaker);
          }

          setTranscript((prev) => [...prev, newEntry]);
          setInterimTranscript([]);

          // POST final transcript line
          if (meetingId) {
            fetch(`/api/meetings/${meetingId}/transcript`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                speaker: newEntry.speaker,
                text: newEntry.text,
              }),
            })
              .then(async (response) => {
                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                return response.json();
              })
              .then((data) => {
                console.log('Successfully stored transcript line:', data);
              })
              .catch((err) => {
                console.error('Error storing transcript line:', {
                  status: err.status,
                  message: err.message,
                  meetingId,
                  speaker: newEntry.speaker,
                  text: newEntry.text,
                });
              });
          }
        } else {
          setInterimTranscript([newEntry]);
        }
      }
    };

    const onUtteranceEnd = () => {
      // no-op
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

  const lastLine =
    combinedTranscript.length > 0 ? combinedTranscript[combinedTranscript.length - 1].text : "No transcript yet...";

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
              speaker: entry.speaker,
              text: entry.text,
            }))}
        />
      )}

      {/* Main content area with our stored messages */}
      <MainContentArea messages={messages} />

      {/* Input to send user messages */}
      <InputSection onSendMessage={handleSendMessage} />
    </div>
  );
}

export default function LiveCallPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LiveCallContent />
    </Suspense>
  );
}
