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
import Summary from "./Summary";

type WordWithSpeaker = {
  word: string;
  speaker: number;
};

const App: React.FC = () => {
  const [interimTranscript, setInterimTranscript] = useState<WordWithSpeaker[]>([]);
  const [finalTranscriptions, setFinalTranscriptions] = useState<WordWithSpeaker[][]>([]);
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, microphoneState } =
    useMicrophone();
  const keepAliveInterval = useRef<any>();

  const [fullTranscript, setFullTranscript] = useState<string>('');
  const [summaryTranscript, setSummaryTranscript] = useState<string>('');

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
        diarize: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState]);

  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;

    const onData = (e: BlobEvent) => {
      // iOS SAFARI FIX:
      // Prevent packetZero from being sent. If sent at size 0, the connection will close. 
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const words = data.channel.alternatives[0].words || [];
      const wordsWithSpeaker: WordWithSpeaker[] = words.map(word => ({
        word: word.word,
        speaker: word.speaker || 0,
      }));

      if (wordsWithSpeaker.length > 0) {
        if (data.is_final) {
          setFinalTranscriptions(prev => [...prev, wordsWithSpeaker]);
          setInterimTranscript([]);
        } else {
          setInterimTranscript(wordsWithSpeaker);
        }
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

      startMicrophone();
    }

    return () => {
      // prettier-ignore
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

  useEffect(() => {
    const interval = setInterval(() => {
      const last120Seconds = fullTranscript.split(' ').slice(-240).join(' '); // Assuming average of 2 words per second
      setSummaryTranscript(last120Seconds);
    }, 10000);

    return () => clearInterval(interval);
  }, [fullTranscript]);

  useEffect(() => {
    if (finalTranscriptions.length > 0) {
      const newTranscript = finalTranscriptions
        .map(sentence => 
          sentence.map(word => word.word).join(' ')
        )
        .join(' ');
      setFullTranscript(prev => `${prev} ${newTranscript}`.trim());
    }
  }, [finalTranscriptions]);

  return (
    <div className="flex h-full antialiased">
      <div className="flex flex-row h-full w-full overflow-x-hidden">
        {/* Left half - Transcription */}
        <div className="flex flex-col flex-auto h-full w-1/2">
          <div className="relative w-full h-full">
            {microphone && <Visualizer microphone={microphone} />}
            <div className="absolute inset-0 max-w-2xl mx-auto overflow-y-auto p-4">
              {finalTranscriptions.map((sentence, index) => (
                <p key={index} className="bg-black/70 p-2 mb-2 text-white">
                  {sentence.map((word, wordIndex) => (
                    <span key={wordIndex}>
                      {wordIndex === 0 || word.speaker !== sentence[wordIndex - 1].speaker
                        ? ` [SPEAKER ${word.speaker}] `
                        : ' '}
                      {word.word}
                    </span>
                  ))}
                </p>
              ))}
              {interimTranscript.length > 0 && (
                <p className="bg-gray-800/70 p-2 mb-2 text-white italic">
                  {interimTranscript.map((word, index) => (
                    <span key={index}>
                      {index === 0 || word.speaker !== interimTranscript[index - 1].speaker
                        ? ` [SPEAKER ${word.speaker}] `
                        : ' '}
                      {word.word}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Right half - Summary */}
        <div className="flex-auto h-full w-1/2">
          <Summary transcript={summaryTranscript} />
        </div>
      </div>
    </div>
  );
};

export default App;
