"use client";

import { useEffect, useState, useCallback } from "react";
import LiveCall from "../components/LiveCall";
import { 
  useDeepgram, 
  LiveConnectionState, 
  LiveTranscriptionEvents, 
  LiveTranscriptionEvent 
} from "../context/DeepgramContextProvider";
import { 
  useMicrophone, 
  MicrophoneState, 
  MicrophoneEvents 
} from "../context/MicrophoneContextProvider";

interface TranscriptEntry {
  speaker: number;
  text: string;
}

export default function LiveCallPage() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<TranscriptEntry[]>([]);
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, microphoneState } = useMicrophone();

  const handleTranscript = useCallback((data: LiveTranscriptionEvent) => {
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
  }, []);

  // Set up microphone on component mount
  useEffect(() => {
    setupMicrophone();
  }, [setupMicrophone]);

  // Connect to Deepgram when microphone is ready
  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      console.log("Microphone ready, connecting to Deepgram");
      connectToDeepgram({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
        diarize: true,
      });
    }
  }, [microphoneState, connectToDeepgram]);

  // Set up event listeners for microphone data and transcription events
  useEffect(() => {
    if (!microphone || !connection) return;

    const onData = (e: BlobEvent) => {
      // iOS SAFARI FIX: Prevent empty packets from being sent
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    // Add event listeners when connection is open
    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, handleTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
      startMicrophone();
    }

    // Clean up event listeners on unmount
    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, handleTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
    };
  }, [connectionState, connection, microphone, startMicrophone, handleTranscript]);

  // Manage keep-alive interval for the Deepgram connection
  useEffect(() => {
    if (!connection) return;

    if (connectionState === LiveConnectionState.OPEN) {
      connection.keepAlive();

      const keepAliveInterval = setInterval(() => {
        connection.keepAlive();
      }, 10000);

      return () => clearInterval(keepAliveInterval);
    }
  }, [connectionState, connection]);

  return <LiveCall transcript={[...transcript, ...interimTranscript]} />;
}