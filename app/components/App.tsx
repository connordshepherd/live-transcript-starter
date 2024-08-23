"use client";

import { useEffect, useRef, useState } from "react";
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
import Visualizer from "./Visualizer";

interface TranscriptionSegment {
  speaker: number;
  text: string;
}

const App: () => JSX.Element = () => {
  const [interimTranscript, setInterimTranscript] = useState<TranscriptionSegment | null>(null);
  const [finalTranscriptions, setFinalTranscriptions] = useState<TranscriptionSegment[]>([{ speaker: -1, text: "Powered by Deepgram" }]);
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, microphoneState } =
    useMicrophone();
  const keepAliveInterval = useRef<any>();

  useEffect(() => {
    setupMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
        diarize: true,  // Enable diarization
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState]);

  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const words = data.channel.alternatives[0].words || [];
      if (words.length === 0) return;

      const transcript = data.channel.alternatives[0].transcript;
      const isFinal = data.is_final;
      const speaker = words[0].speaker;

      if (transcript !== "") {
        const newSegment: TranscriptionSegment = { speaker, text: transcript };
        if (isFinal) {
          setFinalTranscriptions(prev => [...prev, newSegment]);
          setInterimTranscript(null);
        } else {
          setInterimTranscript(newSegment);
        }
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

      startMicrophone();
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState]);

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
      clearInterval(keepAliveInterval.current);
    }

    return () => {
      clearInterval(keepAliveInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, connectionState]);

  const renderTranscription = (segment: TranscriptionSegment, isInterim: boolean = false) => {
    const speakerLabel = segment.speaker >= 0 ? `SPEAKER ${segment.speaker + 1}: ` : '';
    const className = isInterim ? "bg-gray-800/70 p-2 mb-2 text-white italic" : "bg-black/70 p-2 mb-2 text-white";
    return (
      <p className={className}>
        <strong>{speakerLabel}</strong>{segment.text}
      </p>
    );
  };

  return (
    <>
      <div className="flex h-full antialiased">
        <div className="flex flex-row h-full w-full overflow-x-hidden">
          <div className="flex flex-col flex-auto h-full">
            <div className="relative w-full h-full">
              {microphone && <Visualizer microphone={microphone} />}
              <div className="absolute inset-0 max-w-4xl mx-auto overflow-y-auto p-4">
                {finalTranscriptions.map((segment, index) => (
                  <React.Fragment key={index}>
                    {renderTranscription(segment)}
                  </React.Fragment>
                ))}
                {interimTranscript && renderTranscription(interimTranscript, true)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
