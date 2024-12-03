"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import LiveCall from "../components/LiveCall";
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

interface TranscriptEntry {
  speaker: number;
  text: string;
  isUtteranceEnd?: boolean;
  lastWordEnd?: number;
}

export default function LiveCallPage() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<TranscriptEntry[]>([]);
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, microphoneState } = useMicrophone();
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  // Set up microphone on component mount
  useEffect(() => {
    setupMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect to Deepgram when microphone is ready
  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: "nova-2-meeting",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
        diarize: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState]);

  // Set up event listeners for microphone data and transcription events
  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;

    const onData = (e: BlobEvent) => {
      // iOS SAFARI FIX: Prevent empty packets from being sent
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const words = data.channel.alternatives[0].words || [];
      if (words.length > 0) {
        const newEntry: TranscriptEntry = {
          speaker: words[0].speaker || 0,
          text: words.map(word => word.word).join(' ')
        };

        if (data.is_final) {
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
        if (lastEntry) {
          return [...prev.slice(0, -1), {
            ...lastEntry,
            isUtteranceEnd: true,
            lastWordEnd: data.last_word_end
          }];
        }
        return prev;
      });
    };

    // Add event listeners when connection is open
    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.addListener('UtteranceEnd', onUtteranceEnd);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
      startMicrophone();
    }

    // Clean up event listeners on unmount
    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.removeListener('UtteranceEnd', onUtteranceEnd);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState]);

  // Manage keep-alive interval for the Deepgram connection
  useEffect(() => {
    if (!connection) return;

    if (
      microphoneState !== MicrophoneState.Open &&
      connectionState === LiveConnectionState.OPEN
    ) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, connectionState]);

  return <LiveCall transcript={[...transcript, ...interimTranscript]} />;
}