import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Phone, PhoneOff, Moon } from 'lucide-react'
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
  <div className="soundwave">
    <div className="bar"></div>
    <div className="bar"></div>
    <div className="bar"></div>
  </div>
);

interface LiveCallProps {
  transcript: DisplayEntry[];
  isAudioOn: boolean; // New prop
  onToggleAudio: () => void; // New prop
}

export default function LiveCall({ transcript, isAudioOn, onToggleAudio }: LiveCallProps) {
  const [isListening, setIsListening] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false)
  const [isQuiet, setIsQuiet] = useState(false)

  const toggleListening = () => {
    // Instead of toggling local isAudioOn, call onToggleAudio passed from parent
    onToggleAudio();
    setIsListening(prev => !prev);
  }

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
          {isAudioOn ? (
            <SoundwaveAnimation />
          ) : (
            <div className="w-3 h-3 rounded-full bg-secondary" />
          )}
          <span className="text-foreground">{isAudioOn ? 'Listening' : 'Idle'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            className="border-input hover:bg-accent hover:text-accent-foreground"
            onClick={toggleListening}
          >
            {isAudioOn ? <Mic className="h-4 w-4 text-foreground" /> : <MicOff className="h-4 w-4 text-foreground" />}
          </Button>
          <span className="text-foreground">{isAudioOn ? 'Audio On' : 'Audio Off'}</span>
        </div>
      </header>

      <div className="flex justify-between mb-4">
        <Button
          variant={isCallActive ? "destructive" : "default"}
          onClick={() => setIsCallActive(!isCallActive)}
        >
          {isCallActive ? (
            <>
              <PhoneOff className="h-4 w-4 mr-2" />
              End Call
            </>
          ) : (
            <>
              <Phone className="h-4 w-4 mr-2" />
              Start Call
            </>
          )}
        </Button>
        <Button
          variant={isQuiet ? "secondary" : "outline"}
          onClick={() => setIsQuiet(!isQuiet)}
          className="text-foreground"
        >
          <Moon className="h-4 w-4 mr-2 text-foreground" />
          {isQuiet ? 'Resume' : 'Be Quiet'}
        </Button>
      </div>

      <main className="flex-grow flex flex-col overflow-hidden">
        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="space-y-4 p-4">
            {transcript.map((entry, index) => {
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
