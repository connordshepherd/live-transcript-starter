// app/components/LiveCall.tsx

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, MicOff, Phone, PhoneOff, Moon, Plus } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import ChatWidget from './ChatWidget'

// Component for the soundwave animation
const SoundwaveAnimation = () => (
  <div className="soundwave">
    <div className="bar"></div>
    <div className="bar"></div>
    <div className="bar"></div>
  </div>
);

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
  isAnimated?: boolean
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
  const chatScrollAreaRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (chatScrollAreaRef.current) {
      const scrollArea = chatScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }

  // Handle when Excel is mentioned in the transcript
  const handleExcelDetected = () => {
    // Step 1: Show "Excel mentioned..." with animation
    setIsLoading(true)
    const excelDetectedMessage: ChatMessage = {
      type: 'ai',
      excerpt: 'Question detected...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAnimated: true,
    }
    setMessages(prevMessages => [...prevMessages, excelDetectedMessage])
    scrollToBottom()

    // Step 2: Replace with "Preparing Excel tips..." after 1 second
    setTimeout(() => {
      const preparingMessage: ChatMessage = {
        type: 'ai',
        excerpt: 'Answering question: <b>Uses of Excel Pivot Tables...</b>',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      }
      setMessages(prevMessages => [...prevMessages.slice(0, -1), preparingMessage])
      scrollToBottom()

      // Step 3: Replace with final Excel tips after 2 more seconds
      setTimeout(() => {
        const finalTips: ChatMessage = {
          type: 'ai',
          excerpt: "Excel PivotTables are a tool for analyzing large datasets by grouping and aggregating data without altering the original data.",
          summary: "For example, If you have a list of sales transactions with columns for \"Date,\" \"Salesperson,\" \"Region,\" and \"Amount,\" you can use a PivotTable to see total sales for each salesperson or region.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'Microsoft Support',
        }
        setMessages(prevMessages => [...prevMessages.slice(0, -1), finalTips])
        setIsLoading(false)
        scrollToBottom()
      }, 2000)
    }, 1000)
  }

  // Hook to detect when Excel is mentioned in the transcript
  useEffect(() => {
    const lastEntry = transcript[transcript.length - 1];
    if (lastEntry && lastEntry.text.toLowerCase().includes("microsoft excel")) {
      handleExcelDetected();
    }
  }, [transcript]);

  // Handle when Salesforce is mentioned in the transcript
  const handleSalesforceDetected = () => {
    // Step 1: Show "Salesforce mentioned..." with animation
    setIsLoading(true)
    const salesforceDetectedMessage: ChatMessage = {
      type: 'ai',
      excerpt: 'Question detected...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAnimated: true,
    }
    setMessages(prevMessages => [...prevMessages, salesforceDetectedMessage])
    scrollToBottom()

    // Step 2: Replace with "Active Salesforce Integrations..." after 1 second
    setTimeout(() => {
      const preparingMessage: ChatMessage = {
        type: 'ai',
        excerpt: 'Answering question: <b>Active Salesforce Integrations...</b>',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      }
      setMessages(prevMessages => [...prevMessages.slice(0, -1), preparingMessage])
      scrollToBottom()

      // Step 3: Replace with final Salesforce tips after 2 more seconds
      setTimeout(() => {
        const finalTips: ChatMessage = {
          type: 'ai',
          excerpt: "We currently natively integrate with Salesforce Service Cloud and Salesforce Sales Cloud. Both are supported in the Pro or Enterprise plans.",
          summary: "An integration with Salesforce Commerce cloud is in beta.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'integrations_final.pdf',
        }
        setMessages(prevMessages => [...prevMessages.slice(0, -1), finalTips])
        setIsLoading(false)
        scrollToBottom()
      }, 2000)
    }, 1000)
  }

  // Hook to detect when Excel is mentioned in the transcript
  useEffect(() => {
    const lastEntry = transcript[transcript.length - 1];
    if (lastEntry && lastEntry.text.toLowerCase().includes("salesforce integrations")) {
      handleSalesforceDetected();
    }
  }, [transcript]);

  // Toggle the listening state
  const toggleListening = () => {
    setIsListening(prevState => !prevState)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (message: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prevMessages => [...prevMessages, userMessage])
    scrollToBottom()

    // Step 1: Show "Question detected..." with animation
    setIsLoading(true)
    const questionDetectedMessage: ChatMessage = {
      type: 'ai',
      excerpt: 'Research task detected...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAnimated: true,
    }
    setMessages(prevMessages => [...prevMessages, questionDetectedMessage])
    scrollToBottom()

    // Step 2: Replace with "Answering question..." after 1 second
    setTimeout(() => {
      const answeringMessage: ChatMessage = {
        type: 'ai',
        excerpt: 'Researching contact: <b>david@brickandmortar.co</b>',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      }
      setMessages(prevMessages => [...prevMessages.slice(0, -1), answeringMessage])
      scrollToBottom()

      // Step 3: Replace with final answer after 2 more seconds
      setTimeout(() => {
        const finalAnswer: ChatMessage = {
          type: 'ai',
          excerpt: "Brick & Mortar builds software that measures the dollar value of foot traffic for retailers. Founded 2018.",
          summary: "David Chen has been Senior Director of Technology since 2020. Before that, he did engineering management roles at Apple and Sephora.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'LinkedIn - David Chen',
        }
        setMessages(prevMessages => [...prevMessages.slice(0, -1), finalAnswer])
        setIsLoading(false)
        scrollToBottom()
      }, 2000)
    }, 1000)
  }

  // Add this useEffect hook here, before the return statement
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
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          {isListening ? (
            <SoundwaveAnimation />
          ) : (
            <div className="w-3 h-3 rounded-full bg-secondary" />
          )}
          <span className="text-foreground">{isListening ? 'Listening' : 'Idle'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleListening}
            >
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
            <ScrollArea className="h-[calc(100vh-250px)]" ref={chatScrollAreaRef}>
              <ChatWidget 
                onSendMessage={handleSendMessage} 
                messages={messages} 
                isLoading={isLoading} 
              />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="transcript" className="flex-grow">
            <ScrollArea className="h-[calc(100vh-250px)]">
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
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="bg-input text-input-foreground"
            onClick={() => {
              // Placeholder for future file upload functionality
              console.log('File upload button clicked');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
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