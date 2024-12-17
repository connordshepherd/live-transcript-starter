// This page serves as the main entry point for the live call transcription. It manages the state of the
// audio connection, microphone input, and transcription data. When the user toggles audio on, it sets up
// the microphone and connects to Deepgram, processes live transcription events, and updates the displayed
// transcript. When audio is toggled off, it shuts down the audio input and disconnects from Deepgram.

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

type TranscriptEntry = {
  type: 'transcript';
  speaker: number;
  text: string;
  isUtteranceEnd?: boolean;
  lastWordEnd?: number;
};

export type ConsolidatedMessage = {
  type: 'consolidated';
  speaker: number;
  text: string;
  trigger: 'utterance_end' | 'speaker_change';
};

export type DisplayEntry = TranscriptEntry | ConsolidatedMessage;

export default function LiveCallPage() {
  // State containing the full transcript (both transcript entries and consolidated messages)
  const [transcript, setTranscript] = useState<DisplayEntry[]>([]);
  // State for interim transcripts (partial utterances before they are finalized)
  const [interimTranscript, setInterimTranscript] = useState<TranscriptEntry[]>([]);
  // Accumulates the text for the current speaker until we hit an utterance end or speaker change
  const [currentCollectedText, setCurrentCollectedText] = useState<string[]>([]);
  // Tracks the current speaker, updates when a speaker change occurs
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(0);
  // Controls whether audio is currently on or off (recording/not recording)
  const [isAudioOn, setIsAudioOn] = useState(false);

  // Hooks and context from Deepgram and Microphone providers
  const { connection, connectToDeepgram, disconnectFromDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();

  // Interval reference used for sending keep-alive messages to Deepgram
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  // Creates a consolidated message whenever an utterance ends or a speaker changes, finalizing collected text
  const createConsolidatedMessage = (trigger: 'utterance_end' | 'speaker_change') => {
    console.log("Attempting to create consolidated message", {
      currentCollectedText,
      trigger,
      speaker: currentSpeaker
    });
    
    if (currentCollectedText.length > 0) {
      const consolidatedEntry = {
        type: 'consolidated' as const,
        speaker: currentSpeaker,
        text: currentCollectedText.join(' '),
        trigger
      };
      console.log("Created consolidated entry:", consolidatedEntry);
      
      setTranscript(prev => {
        console.log("Previous transcript:", prev);
        const newTranscript = [...prev, consolidatedEntry];
        console.log("New transcript:", newTranscript);
        return newTranscript;
      });
      setCurrentCollectedText([]);
    } else {
      console.log("No text to consolidate");
    }
  };

  // Effect to handle starting/stopping microphone & Deepgram connection when isAudioOn changes
  useEffect(() => {
    if (isAudioOn) {
      // If mic not setup, setup now
      if (microphoneState === MicrophoneState.NotSetup) {
        setupMicrophone();
      }

      // If mic ready and connection not open, connect to Deepgram
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

      // If mic ready and connection open, start the microphone
      if (microphoneState === MicrophoneState.Ready && connectionState === LiveConnectionState.OPEN) {
        startMicrophone();
      }
    } else {
      // If audio turned off, stop microphone and disconnect if needed
      if (microphoneState === MicrophoneState.Open) {
        stopMicrophone();
      }
      if (connection) {
        disconnectFromDeepgram();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioOn, microphoneState, connectionState]);

  // Effect for setting up event listeners for transcription events when audio is on
  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;

    // Helper function to handle consolidation events
    const handleConsolidation = (trigger: 'utterance_end' | 'speaker_change', newSpeaker?: number) => {
      setCurrentCollectedText(currentText => {
        if (currentText.length > 0) {
          const consolidatedEntry = {
            type: 'consolidated' as const,
            speaker: currentSpeaker,
            text: currentText.join(' '),
            trigger
          };
    
          setTranscript(prev => [...prev, consolidatedEntry]);
        }
        return []; // Clear buffer
      });
    
      if (newSpeaker !== undefined) {
        setCurrentSpeaker(newSpeaker);
      }
    };

    // Handler for microphone data events (sends audio data to Deepgram)
    const onData = (e: BlobEvent) => {
      // iOS Safari fix: only send data if size > 0
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    // Handler for transcription events from Deepgram
    const onTranscript = (data: LiveTranscriptionEvent) => {
      const words = data.channel.alternatives[0].words || [];
      if (words.length > 0) {
        const newEntry = {
          type: 'transcript' as const,
          speaker: words[0].speaker || 0,
          text: words.map(word => word.word).join(' '),
          isUtteranceEnd: false
        };
    
        if (data.is_final) {
          // If speaker changes, consolidate old speaker's text before adding new
          if (newEntry.speaker !== currentSpeaker) {
            handleConsolidation('speaker_change', newEntry.speaker);
          }
    
          // Add new finalized text
          setCurrentCollectedText(prev => [...prev, newEntry.text]);
          setTranscript(prev => [...prev, newEntry]);
          setInterimTranscript([]);
        } else {
          // Interim (not final) transcript
          setInterimTranscript([newEntry]);
        }
      }
    };

    // Handler for utterance end events
    const onUtteranceEnd = (data: any) => {
      setTranscript(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry && lastEntry.type === 'transcript') {
          return [...prev.slice(0, -1), {
            ...lastEntry,
            isUtteranceEnd: true,
            lastWordEnd: data.last_word_end
          }];
        }
        return prev;
      });
    
      // Consolidate after utterance ends
      handleConsolidation('utterance_end');
    };

    // If audio is on and connection is open, add listeners
    if (isAudioOn && connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.addListener('UtteranceEnd', onUtteranceEnd);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
    }

    // Cleanup listeners on unmount or when conditions change
    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.removeListener('UtteranceEnd', onUtteranceEnd);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioOn, connectionState, microphone]);

  // Effect to manage keep-alive messages when the connection is open but microphone is not sending data
  useEffect(() => {
    if (!connection) return;

    if (
      microphoneState !== MicrophoneState.Open &&
      connectionState === LiveConnectionState.OPEN
    ) {
      // Send a keepAlive message at intervals
      connection.keepAlive();

      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      // If conditions not met, clear keepAlive intervals
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

  return <LiveCall
    transcript={[
      ...transcript,
      ...interimTranscript.map(t => ({
        type: 'transcript' as const,
        speaker: t.speaker,
        text: t.text,
        isUtteranceEnd: t.isUtteranceEnd,
        lastWordEnd: t.lastWordEnd
      }))
    ]}
    isAudioOn={isAudioOn}
    onToggleAudio={() => setIsAudioOn(!isAudioOn)}
  />;
}
