import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Phone, PhoneOff, Moon } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"

// Keep the types
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

// Keep the soundwave animation component
const SoundwaveAnimation = () => (
  <div className="soundwave">
    <div className="bar"></div>
    <div className="bar"></div>
    <div className="bar"></div>
  </div>
);

interface LiveCallProps {
  transcript: DisplayEntry[];
  onRunningStateChange: (isRunning: boolean) => void;
}

// Main LiveCall component
export default function LiveCall({ transcript, onRunningStateChange }: LiveCallProps) {
  const [isRunning, setIsRunning] = useState(false)

  // Keep the styles effect
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-background">
      {/* Simplified header with just the status indicator */}
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          {isRunning ? (
            <SoundwaveAnimation />
          ) : (
            <div className="w-3 h-3 rounded-full bg-secondary" />
          )}
          <span className="text-foreground">
            {isRunning ? 'Transcribing...' : 'Ready'}
          </span>
        </div>
        {/* Single control button */}
        <Button
          variant={isRunning ? "destructive" : "default"}
          onClick={() => {
            const newState = !isRunning;
            setIsRunning(newState);
            onRunningStateChange(newState);
          }}
        >
          {isRunning ? 'Pause' : 'Start'}
        </Button>
      </header>

      {/* Main content area - transcript */}
      <main className="flex-grow flex flex-col overflow-hidden">
        <ScrollArea className="h-[calc(100vh-100px)]">
          {/* Rest of the transcript rendering code stays the same */}
        </ScrollArea>
      </main>
    </div>
  )
}

// Keep the styles for the soundwave animation
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