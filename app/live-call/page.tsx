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

// New: EnhancedMessage type for summarized output
export type EnhancedMessage = {
  type: 'enhanced';
  speaker: number;
  text: string;
  originalTexts: string[];
};

export type DisplayEntry = TranscriptEntry | ConsolidatedMessage | EnhancedMessage;

export default function LiveCallPage() {
  const [transcript, setTranscript] = useState<DisplayEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<TranscriptEntry[]>([]);
  const [currentCollectedText, setCurrentCollectedText] = useState<string[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(0);

  // Track how many utterances we've collected for the current speaker
  const [consolidatedBuffer, setConsolidatedBuffer] = useState<ConsolidatedMessage[]>([]);
  const utteranceCountRef = useRef<number>(0);

  // New state to control audio on/off
  const [isAudioOn, setIsAudioOn] = useState(false);

  const { connection, connectToDeepgram, disconnectFromDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  const summarizeAndEnhance = useCallback(async (messages: ConsolidatedMessage[]) => {
    if (messages.length === 0) return null;

    // Join all utterances into a single transcript string
    const transcriptText = messages.map(m => m.text).join(' ');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: transcriptText }),
      });

      const data = await response.json();
      return data.summary as string;
    } catch (error) {
      console.error('Error getting summary:', error);
      return null;
    }
  }, []);

  // Create a consolidated message when an utterance ends or a speaker changes
  const createConsolidatedMessage = useCallback((trigger: 'utterance_end' | 'speaker_change', newSpeaker?: number) => {
    console.log("Attempting to create consolidated message", {
      currentCollectedText,
      trigger,
      speaker: currentSpeaker
    });
    
    if (currentCollectedText.length > 0) {
      const consolidatedEntry: ConsolidatedMessage = {
        type: 'consolidated',
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

      // Add this consolidated message to the buffer
      setConsolidatedBuffer(prev => [...prev, consolidatedEntry]);

      // Increment utterance count for current speaker
      utteranceCountRef.current += 1;

      // Clear the collected text
      setCurrentCollectedText([]);

      // Check if we should summarize:
      // Conditions:
      // 1. Speaker changed
      // 2. Same speaker has now produced 5 utterances
      if (trigger === 'speaker_change' || utteranceCountRef.current >= 5) {
        (async () => {
          const summary = await summarizeAndEnhance(consolidatedBuffer);
          if (summary) {
            const enhancedEntry: EnhancedMessage = {
              type: 'enhanced',
              speaker: currentSpeaker,
              text: summary,
              originalTexts: consolidatedBuffer.map(m => m.text)
            };
            setTranscript(prev => [...prev, enhancedEntry]);
          }
          // Reset for next batch
          setConsolidatedBuffer([]);
          utteranceCountRef.current = 0;
        })();
      }

      // If we received a new speaker, update currentSpeaker
      if (newSpeaker !== undefined) {
        setCurrentSpeaker(newSpeaker);
      }
    } else {
      console.log("No text to consolidate");
      // If speaker changed but no text, still update speaker
      if (newSpeaker !== undefined) {
        setCurrentSpeaker(newSpeaker);
      }
    }
  }, [currentCollectedText, currentSpeaker, summarizeAndEnhance, consolidatedBuffer]);

  // Effect to handle starting/stopping microphone & connection based on isAudioOn
  useEffect(() => {
    if (isAudioOn) {
      // If microphone is not setup yet, set it up
      if (microphoneState === MicrophoneState.NotSetup) {
        setupMicrophone();
      }

      // If microphone is ready and Deepgram connection not open, connect now
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

      // If both microphone ready and connection open, start the microphone
      if (microphoneState === MicrophoneState.Ready && connectionState === LiveConnectionState.OPEN) {
        startMicrophone();
      }
    } else {
      // If turning off, stop microphone & disconnect from Deepgram if needed
      if (microphoneState === MicrophoneState.Open) {
        stopMicrophone();
      }
      if (connection) {
        disconnectFromDeepgram();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioOn, microphoneState, connectionState]);

  // Event listeners for transcription when isAudioOn is true
  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;

    const handleConsolidation = (trigger: 'utterance_end' | 'speaker_change', newSpeaker?: number) => {
      setCurrentCollectedText(currentText => {
        if (currentText.length > 0) {
          const consolidatedEntry: ConsolidatedMessage = {
            type: 'consolidated',
            speaker: currentSpeaker,
            text: currentText.join(' '),
            trigger
          };
    
          setTranscript(prev => [...prev, consolidatedEntry]);
          setConsolidatedBuffer(prev => [...prev, consolidatedEntry]);

          utteranceCountRef.current += 1;

          (async () => {
            if (trigger === 'speaker_change' || utteranceCountRef.current >= 5) {
              const summary = await summarizeAndEnhance([...consolidatedBuffer, consolidatedEntry]);
              if (summary) {
                const enhancedEntry: EnhancedMessage = {
                  type: 'enhanced',
                  speaker: newSpeaker !== undefined ? newSpeaker : currentSpeaker,
                  text: summary,
                  originalTexts: [...consolidatedBuffer, consolidatedEntry].map(m => m.text)
                };
                setTranscript(prev => [...prev, enhancedEntry]);
              }
              setConsolidatedBuffer([]);
              utteranceCountRef.current = 0;
            }
            if (newSpeaker !== undefined) {
              setCurrentSpeaker(newSpeaker);
            }
          })();

        }
        return []; // Clear buffer
      });
    };

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
          // Check for speaker change first
          if (newEntry.speaker !== currentSpeaker) {
            // If speaker changed, consolidate what's currently collected and then switch speakers
            createConsolidatedMessage('speaker_change', newEntry.speaker);
          }
          // Add new text to collection buffer
          setCurrentCollectedText(prev => [...prev, newEntry.text]);
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
        if (lastEntry && lastEntry.type === 'transcript') {
          return [...prev.slice(0, -1), {
            ...lastEntry,
            isUtteranceEnd: true,
            lastWordEnd: data.last_word_end
          }];
        }
        return prev;
      });
    
      // Utterance ended, create consolidated message
      createConsolidatedMessage('utterance_end');
    };

    if (isAudioOn && connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.addListener('UtteranceEnd', onUtteranceEnd);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      connection.removeListener('UtteranceEnd', onUtteranceEnd);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudioOn, connectionState, microphone, currentSpeaker, createConsolidatedMessage]);

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
