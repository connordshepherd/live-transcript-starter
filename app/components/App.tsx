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

  const [recentTranscript, setRecentTranscript] = useState<string>('');
  const [summaryTranscript, setSummaryTranscript] = useState<string>('');
  const transcriptBuffer = useRef<string[]>([]);
  const lastSummaryTime = useRef<number>(Date.now());

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

  const summaryCount = useRef(0);

  useEffect(() => {
    const updateInterval = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastSummary = currentTime - lastSummaryTime.current;

      // Update the recent transcript
      const recentText = transcriptBuffer.current.join(' ');
      setRecentTranscript(recentText);

      // If 30 seconds have passed, trigger a new summary
      if (timeSinceLastSummary >= 30000) {
        console.log(`Triggering summary #${summaryCount.current + 1}`);
        console.log(`Recent text length: ${recentText.length}`);
        console.log(`Transcript buffer size: ${transcriptBuffer.current.length}`);
        console.log(`First few words: ${recentText.split(' ').slice(0, 10).join(' ')}...`);
        
        if (recentText.length > 0) {
          setSummaryTranscript(recentText);
          lastSummaryTime.current = currentTime;
          summaryCount.current += 1;
        } else {
          console.warn('Skipping summary due to empty transcript');
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(updateInterval);
  }, []);

  useEffect(() => {
    if (finalTranscriptions.length > 0) {
      const newTranscript = finalTranscriptions
        .map(sentence => 
          sentence.map(word => word.word).join(' ')
        )
        .join(' ');
      
      // Add new transcript to the buffer
      transcriptBuffer.current.push(newTranscript);
      
      // Keep only the last 120 seconds (assuming 2 words per second)
      let totalWords = 0;
      let index = transcriptBuffer.current.length - 1;
      while (index >= 0 && totalWords < 240) {
        totalWords += transcriptBuffer.current[index].split(' ').length;
        index--;
      }
      if (index >= 0) {
        transcriptBuffer.current = transcriptBuffer.current.slice(index + 1);
      }

      const bufferWordCount = transcriptBuffer.current.join(' ').split(' ').length;
      console.log(`Updated transcript buffer. Current length: ${bufferWordCount} words`);
      console.log(`Buffer size: ${transcriptBuffer.current.length}`);
      console.log(`First few words: ${transcriptBuffer.current.join(' ').split(' ').slice(0, 10).join(' ')}...`);
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
        <div className="flex-auto h-full w-1/2 border-l border-gray-300">
          <Summary transcript={summaryTranscript} />
        </div>
      </div>
    </div>
  );
};

export default App;
