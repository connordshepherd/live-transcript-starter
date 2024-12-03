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

//import { TranscriptEntry } from "../types/transcript";
//import { ConsolidatedMessage } from "../types/consolidatedMessage";
//import { DisplayEntry } from "../types/displayEntry";

export default function LiveCallPage() {
  const [transcript, setTranscript] = useState<DisplayEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<TranscriptEntry[]>([]);
  const [currentCollectedText, setCurrentCollectedText] = useState<string[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(0);
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, microphoneState } = useMicrophone();
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  // Create a consolidated message when an utterance ends or a speaker changes
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
        utterance_end_ms: 1200,
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
        const newEntry = {
          type: 'transcript' as const,
          speaker: words[0].speaker || 0,
          text: words.map(word => word.word).join(' '),
          isUtteranceEnd: false
        };
    
        if (data.is_final) {
          // Add debug logging
          console.log("Final transcript:", {
            newSpeaker: newEntry.speaker,
            currentSpeaker,
            text: newEntry.text
          });
          
          // Check for speaker change
          if (newEntry.speaker !== currentSpeaker) {
            console.log("Speaker changed from", currentSpeaker, "to", newEntry.speaker);
            createConsolidatedMessage('speaker_change');
            setCurrentSpeaker(newEntry.speaker);
          }
          
          setCurrentCollectedText(prev => [...prev, newEntry.text]);
          setTranscript(prev => [...prev, newEntry]);
          setInterimTranscript([]);
        } else {
          setInterimTranscript([newEntry]);
        }
      }
    };
    
    const onUtteranceEnd = (data: any) => {
      console.log("Utterance end detected", data);
      
      // First create the consolidated message
      createConsolidatedMessage('utterance_end');
      
      // Then update the transcript with the utterance end marker
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

  return <LiveCall transcript={[
    ...transcript,
    ...interimTranscript.map(t => ({
      type: 'transcript' as const,
      speaker: t.speaker,
      text: t.text,
      isUtteranceEnd: t.isUtteranceEnd,
      lastWordEnd: t.lastWordEnd
    }))
  ]} />;
}