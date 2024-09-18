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
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);
  const dataQueue = useRef<Blob[]>([]);

  useEffect(() => {
    setupMicrophone();
  }, [setupMicrophone]);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
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

    microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
    connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);

    if (connectionState === LiveConnectionState.OPEN) {
      if (microphone.state !== 'recording') {
        startMicrophone();
      }
    }

    return () => {
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
    };
  }, [connectionState, connection, microphone, startMicrophone]);

  useEffect(() => {
    if (connectionState === LiveConnectionState.OPEN && connection) {
      // Send any queued data
      while (dataQueue.current.length > 0) {
        const data = dataQueue.current.shift();
        if (data) connection.send(data);
      }

      // Start keep-alive interval
      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);

      // Start microphone if not already recording
      if (microphone && microphone.state !== 'recording') {
        startMicrophone();
      }
    } else {
      // Clear keep-alive interval if connection is not open
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
    }

    return () => {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
    };
  }, [connectionState, connection, microphone, startMicrophone]);

  return <LiveCall transcript={[...transcript, ...interimTranscript]} />;
}