"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  const isConnecting = useRef(false);

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

  useEffect(() => {
    setupMicrophone();
  }, [setupMicrophone]);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready && !isConnecting.current) {
      isConnecting.current = true;
      console.log("Microphone ready, connecting to Deepgram");
      try {
        connectToDeepgram({
          model: "nova-2",
          interim_results: true,
          smart_format: true,
          filler_words: true,
          utterance_end_ms: 3000,
          diarize: true,
        });
      } catch (error) {
        console.error("Failed to connect to Deepgram:", error);
      } finally {
        isConnecting.current = false;
      }
    }
  }, [microphoneState, connectToDeepgram]);

  useEffect(() => {
    if (!microphone || !connection) return;
  
    console.log(`Connection state: ${connectionState}`);
  
    const onData = (e: BlobEvent) => {
      if (e.data.size > 0 && connectionState === LiveConnectionState.OPEN) {
        connection.send(e.data);
      }
    };
  
    if (connectionState === LiveConnectionState.OPEN) {
      console.log("Connection open, setting up listeners");
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
      connection.addListener(LiveTranscriptionEvents.Transcript, handleTranscript);
      
      if (microphone.state !== 'recording') {
        console.log("Starting microphone");
        try {
          startMicrophone();
        } catch (error) {
          console.error("Failed to start microphone:", error);
        }
      }
    }
  
    return () => {
      console.log("Cleaning up listeners");
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      connection.removeListener(LiveTranscriptionEvents.Transcript, handleTranscript);
    };
  }, [connectionState, connection, microphone, startMicrophone, handleTranscript]);

  useEffect(() => {
    if (connectionState === LiveConnectionState.OPEN && connection) {
      const keepAliveInterval = setInterval(() => {
        connection.keepAlive();
      }, 10000);

      return () => clearInterval(keepAliveInterval);
    }
  }, [connectionState, connection]);

  return <LiveCall transcript={[...transcript, ...interimTranscript]} />;
}