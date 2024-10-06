// app/components/LiveCall.tsx

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, MicOff, Phone, PhoneOff, Moon } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import ChatWidget from './ChatWidget'

// Define the type for a transcript entry
interface TranscriptEntry {
  speaker: number;
  text: string;
}

// Define the props type for the LiveCall component
interface LiveCallProps {
  transcript: TranscriptEntry[];
}

interface ChatMessage {
  type: 'ai' | 'user'
  excerpt?: string
  timestamp: string
  source?: string
  summary?: string
  content?: string
  isDefault?: boolean
}

const defaultMessages: ChatMessage[] = [
  {
    type: 'ai',
    excerpt: "Hi there! I'm listening to your call and will provide helpful tips based on the conversation. Feel free to ask me questions about what's been discussed.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isDefault: true,
  },
  {
    type: 'ai',
    excerpt: "Need quick info? Type in an email or website, and I'll give you a brief summary.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isDefault: true,
  },
  {
    type: 'ai',
    excerpt: "Use the + button to upload reference files. I'll use them to offer relevant hints during your call.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isDefault: true,
  },
]

// Main LiveCall component
export default function LiveCall({ transcript }: LiveCallProps) {
  // State variables to manage various UI states
  const [isListening, setIsListening] = useState(false)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isQuiet, setIsQuiet] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages)
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = (message: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prevMessages => [...prevMessages, userMessage])

    // Show loading spinner
    setIsLoading(true)

    // Simulate AI response after 2 seconds
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        type: 'ai',
        excerpt: 'This is an excerpt from the source document for the simulated AI response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'SimulatedSource.txt',
        summary: 'This is a summary of the simulated AI response.'
      }
      setMessages(prevMessages => [...prevMessages, aiResponse])
      setIsLoading(false)
    }, 2000)
  }

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
          <TabsContent value="chat" className="flex-grow">
            <ChatWidget 
              onSendMessage={handleSendMessage} 
              messages={messages} 
              isLoading={isLoading} 
            />
          </TabsContent>
          <TabsContent value="transcript" className="flex-grow">
            <ScrollArea className="h-[calc(100vh-150px)]">
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
        </Tabs>
      </main>

      <footer className="mt-4">
        <form onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('chatInput') as HTMLInputElement;
          if (input.value.trim()) {
            handleSendMessage(input.value);
            input.value = '';
          }
        }} className="flex space-x-2">
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