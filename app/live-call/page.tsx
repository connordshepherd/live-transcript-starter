"use client";

import { useEffect, useState, useRef } from "react";
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
  const dataQueue = useRef<Blob[]>([]);

  useEffect(() => {
    setupMicrophone();
  }, [setupMicrophone]);

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

  useEffect(() => {
    if (!microphone || !connection) return;

    console.log(`Connection state: ${connectionState}`);

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0) {
        if (connectionState === LiveConnectionState.OPEN && connection) {
          connection.send(e.data);
        } else {
          dataQueue.current.push(e.data);
        }
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

    if (connectionState === LiveConnectionState.OPEN) {
      console.log("Connection open, setting up listeners");
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      
      if (microphone.state !== 'recording') {
        console.log("Starting microphone");
        startMicrophone();
      }

      // Send any queued data
      while (dataQueue.current.length > 0) {
        const data = dataQueue.current.shift();
        if (data) connection.send(data);
      }
    }

    return () => {
      console.log("Cleaning up listeners");
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
    };
  }, [connectionState, connection, microphone, startMicrophone]);

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