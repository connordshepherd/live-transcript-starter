// This component represents a live call transcription interface. It displays a list of transcript entries
// and consolidated messages, and provides controls for starting and stopping audio recording.
// The component handles UI elements such as a soundwave animation and dynamically updates the displayed transcript
// as audio is transcribed in real-time.

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"

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

const SoundwaveAnimation = () => (
  // This component shows a simple soundwave animation when audio is on
  <div className="soundwave">
    <div className="bar"></div>
    <div className="bar"></div>
    <div className="bar"></div>
  </div>
);

interface LiveCallProps {
  transcript: DisplayEntry[];
  isAudioOn: boolean; 
  onToggleAudio: () => void; 
}

export default function LiveCall({ transcript, isAudioOn, onToggleAudio }: LiveCallProps) {
  // State that tracks whether we are currently listening (recording) or not
  const [isListening, setIsListening] = useState(false);

  // Function to toggle listening state and call the provided onToggleAudio callback
  const toggleListening = () => {
    onToggleAudio();
    setIsListening(prev => !prev);
  }

  // Effect that injects custom CSS styles into the document head when this component mounts
  // and removes them on unmount.
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-background">
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          {/* Conditional rendering of the soundwave when audio is on, otherwise show a static indicator */}
          {isAudioOn ? (
            <SoundwaveAnimation />
          ) : (
            <div className="w-3 h-3 rounded-full bg-secondary" />
          )}
          <span className="text-foreground">{isAudioOn ? 'Listening' : 'Idle'}</span>
        </div>
        
        {/* Button to start or pause the recording */}
        <div className="flex items-center space-x-2">
          <Button
            variant={isAudioOn ? "destructive" : "default"}
            onClick={toggleListening}
          >
            {isAudioOn ? (
              <>
                <PhoneOff className="h-4 w-4 mr-2" />
                Pause Recording
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Start Recording
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="flex-grow flex flex-col overflow-hidden">
        {/* ScrollArea to show transcript entries */}
        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="space-y-4 p-4">
            {/* Render each entry in the transcript array */}
            {transcript.map((entry, index) => {
              // Type guards to differentiate between transcript entries and consolidated messages
              const isTranscriptEntry = (entry: DisplayEntry): entry is TranscriptEntry => 
                entry.type === 'transcript';
              const isConsolidatedMessage = (entry: DisplayEntry): entry is ConsolidatedMessage => 
                entry.type === 'consolidated';

              if (isTranscriptEntry(entry)) {
                return (
                  <div key={index} className="mb-2">
                    <span className="font-bold text-card-foreground">
                      SPEAKER {entry.speaker}:
                    </span>
                    <span className="text-card-foreground">
                      {entry.text}
                    </span>
                    {entry.isUtteranceEnd && (
                      <span className="ml-2 text-sm text-yellow-500">
                        [UTTERANCE END at {entry.lastWordEnd?.toFixed(2)}s]
                      </span>
                    )}
                  </div>
                );
              } else if (isConsolidatedMessage(entry)) {
                return (
                  <div key={index} className="mb-2 p-2 bg-blue-100 dark:bg-blue-900 rounded">
                    <span className="font-bold">
                      CONSOLIDATED (SPEAKER {entry.speaker}) - 
                      {entry.trigger === 'utterance_end' ? 'Utterance End' : 'Speaker Change'}:
                    </span>
                    <span className="block mt-1">
                      {entry.text}
                    </span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}

// Custom inline styles for the soundwave animation
const styles = `
  .soundwave {
    display: flex;
    align-items: center;
    height: 15px;
    width: 20px;
  }

  .bar {
    background: #0070f3;
    height: 100%;
    width: 3px;
    margin: 0 1px;
    animation: soundwave-animation 0.9s infinite ease-in-out;
  }

  .bar:nth-child(2) {
    animation-delay: 0.3s;
  }

  .bar:nth-child(3) {
    animation-delay: 0.6s;
  }

  @keyframes soundwave-animation {
    0%, 100% { height: 15%; }
    50% { height: 100%; }
  }
`;
