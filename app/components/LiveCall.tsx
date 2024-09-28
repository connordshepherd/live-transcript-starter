// app/components/LiveCall.tsx

import React from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, MicOff, Phone, PhoneOff, MessageSquare, RefreshCw, Moon, Sparkles } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"

// Sample chat messages for demonstration purposes
const chatMessages = [
  { 
    type: 'tip', 
    content: "Quantum entanglement is a phenomenon in quantum physics where two particles become interconnected, and the quantum state of each particle cannot be described independently of the other, even when separated by a large distance. Einstein famously referred to this as 'spooky action at a distance'.", 
    source: 'QuantumPhysics.txt', 
    summary: "This concept is crucial for understanding quantum mechanics and has potential applications in quantum computing and cryptography.", 
    timestamp: '10:30 AM' 
  },
  { type: 'user', content: 'Can you give me another tip?', timestamp: '10:35 AM' },
  { 
    type: 'tip', 
    content: "The Heisenberg Uncertainty Principle states that it's impossible to simultaneously know both the exact position and the exact momentum of a particle. This fundamental limit of precision is not due to the limitations of our measuring instruments, but is an inherent property of quantum systems.", 
    source: 'UncertaintyPrinciple.txt', 
    summary: "This principle is a cornerstone of quantum mechanics and has profound implications for our understanding of the nature of reality at the quantum level.", 
    timestamp: '10:36 AM' 
  },
]

// Action buttons for chat messages
const actionButtons = [
  { label: 'Give Me More', icon: <MessageSquare className="h-4 w-4 mr-2" /> },
  { label: 'Give Me Something Else', icon: <RefreshCw className="h-4 w-4 mr-2" /> },
  { label: 'Mark as Important', icon: <Sparkles className="h-4 w-4 mr-2" /> },
]

// Define the type for a transcript entry
interface TranscriptEntry {
    speaker: number;
    text: string;
  }
  
// Define the props type for the LiveCall component
interface LiveCallProps {
    transcript: TranscriptEntry[];
  }

// Main LiveCall component
export default function LiveCall({ transcript }: LiveCallProps) {
  // State variables to manage various UI states
  const [isListening, setIsListening] = React.useState(false)
  const [isAudioOn, setIsAudioOn] = React.useState(true)
  const [isCallActive, setIsCallActive] = React.useState(false)
  const [isQuiet, setIsQuiet] = React.useState(false)

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-background">
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-primary' : 'bg-secondary'}`} />
          <span className="text-foreground">{isListening ? 'Listening' : 'Idle'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => setIsAudioOn(!isAudioOn)}>
            {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <span className="text-foreground">{isAudioOn ? 'Audio On' : 'Audio Off'}</span>
        </div>
      </header>

      {/* Call control buttons */}
      <div className="flex justify-between mb-4">
        {/* Start/End Call button */}
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
        {/* Be Quiet/Resume button */}
        <Button
          variant={isQuiet ? "secondary" : "outline"}
          onClick={() => setIsQuiet(!isQuiet)}
        >
          <Moon className="h-4 w-4 mr-2" />
          {isQuiet ? 'Resume' : 'Be Quiet'}
        </Button>
      </div>

      {/* Main content area with tabs for Chat and Transcript */}
      <main className="flex-grow flex flex-col overflow-hidden">
        <Tabs defaultValue="chat" className="flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="font-heading">Chat</TabsTrigger>
            <TabsTrigger value="transcript" className="font-heading">Transcript</TabsTrigger>
          </TabsList>
          <div className="flex-grow overflow-hidden">
            <TabsContent value="chat" className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4">
                  {chatMessages.map((message, index) => (
                    message.type === 'tip' ? (
                      // Render tip message as a card
                      <Card key={index} className="bg-card">
                        <CardContent className="pt-6">
                          <p className="text-xs text-muted-foreground mb-2">{message.timestamp}</p>
                          <p className="text-card-foreground mb-4">{message.content}</p>
                          <p className="text-sm text-muted-foreground mb-2">Source: {message.source}</p>
                          <p className="text-sm font-medium text-card-foreground">{message.summary}</p>
                        </CardContent>
                        <CardFooter className="flex justify-between flex-wrap">
                          {actionButtons.map((button, buttonIndex) => (
                            <Button key={buttonIndex} variant="ghost" size="sm" className="mt-2">
                              {button.icon}
                              {button.label}
                            </Button>
                          ))}
                        </CardFooter>
                      </Card>
                    ) : (
                      // Render user message
                      <div key={index} className="mb-4">
                        <p className="text-sm text-muted-foreground">{message.timestamp}</p>
                        <p className="text-foreground">{message.content}</p>
                      </div>
                    )
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="transcript" className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4">
                  {/* Render transcript entries */}
                  {transcript.map((entry, index) => (
                    <div key={index} className="mb-2">
                      <span className="font-bold text-card-foreground">SPEAKER {entry.speaker}: </span>
                      <span className="text-card-foreground">{entry.text}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <footer className="mt-4">
        <form className="flex space-x-2">
          <Input
            name="chatInput"
            placeholder="Ask for a tip..."
            className="flex-grow bg-input text-input-foreground"
          />
          <Button type="submit" variant="secondary">Send</Button>
        </form>
      </footer>
    </div>
  )
}