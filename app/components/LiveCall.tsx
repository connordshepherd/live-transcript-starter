// app/components/LiveCall.tsx

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, MicOff, Phone, PhoneOff, Moon, Plus } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import ChatWidget from './ChatWidget'
//import { TranscriptEntry } from "../types/transcript"; 
//import { ConsolidatedMessage } from "../types/consolidatedMessage";
//import { DisplayEntry } from "../types/displayEntry";

type TranscriptEntry = {
  type: 'transcript';
  speaker: number;
  text: string;
  isUtteranceEnd?: boolean;
  lastWordEnd?: number;
};

type MessageSummary = {
  messageId: number;
  summary: string;
};

export type ConsolidatedMessage = {
  type: 'consolidated';
  speaker: number;
  text: string;
  trigger: 'utterance_end' | 'speaker_change';
};

export type DisplayEntry = (TranscriptEntry | ConsolidatedMessage) & {
  id?: number;
};

// Component for the soundwave animation
const SoundwaveAnimation = () => (
  <div className="soundwave">
    <div className="bar"></div>
    <div className="bar"></div>
    <div className="bar"></div>
  </div>
);

// Define the props type for the LiveCall component
interface LiveCallProps {
  transcript: DisplayEntry[];
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
  const [inputValue, setInputValue] = useState('')
  const [summaries, setSummaries] = useState<MessageSummary[]>([]);
  const [nextMessageId, setNextMessageId] = useState(1);

  const scrollToBottom = () => {
    if (chatScrollAreaRef.current) {
      const scrollArea = chatScrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }

  // Add function to get summary for consolidated messages
  const getSummary = async (text: string, messageId: number) => {
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await response.json();
      setSummaries(prev => [...prev, { messageId, summary: data.summary }]);
    } catch (error) {
      console.error('Error getting summary:', error);
    }
  };

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
          excerpt: "Excel 💡 <b>PivotTables</b> are a tool for analyzing large datasets by grouping and aggregating data without altering the original data.",
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
          excerpt: "We currently natively integrate with ✅ Salesforce Service Cloud and ✅ Salesforce Sales Cloud. Both are supported in the Pro or Enterprise plans.",
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
  
    // Different responses based on input
    if (message.toLowerCase() === 'who am i meeting with') {
      handleContactLookup()
    } else if (message.toLowerCase() === 'recap') {
      handleRecapRequest()
    } else {
      // Default response for unhandled queries
      const defaultResponse: ChatMessage = {
        type: 'ai',
        excerpt: "I'm not sure how to help with that specific query. Try asking 'who am i meeting with' or 'recap' for a meeting summary.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prevMessages => [...prevMessages, defaultResponse])
    }
  }

  // Separate the David Smith response into its own function
  const handleContactLookup = () => {
    setIsLoading(true)
    const questionDetectedMessage: ChatMessage = {
      type: 'ai',
      excerpt: 'Research task detected...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAnimated: true,
    }
    setMessages(prevMessages => [...prevMessages, questionDetectedMessage])
    scrollToBottom()

    setTimeout(() => {
      const answeringMessage: ChatMessage = {
        type: 'ai',
        excerpt: 'Researching contact: <b>david@brickandmortar.co</b>',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      }
      setMessages(prevMessages => [...prevMessages.slice(0, -1), answeringMessage])
      scrollToBottom()

      setTimeout(() => {
        const finalAnswer: ChatMessage = {
          type: 'ai',
          excerpt: "<b>David Smith</b><br/>• Senior Director of Technology, Brick & Mortar<br/>• Started job in 2020<br/>• Before that, engineering management at Apple and Sephora",
          summary: "Brick & Mortar builds software that measures the dollar value of foot traffic for retailers. Founded 2018.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'LinkedIn - David Smith',
        }
        setMessages(prevMessages => [...prevMessages.slice(0, -1), finalAnswer])
        setIsLoading(false)
        scrollToBottom()
      }, 2000)
    }, 1000)
  }

  // Add new function for recap response
  const handleRecapRequest = () => {
    setIsLoading(true)
    const recapDetectedMessage: ChatMessage = {
      type: 'ai',
      excerpt: 'Generating meeting recap...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAnimated: true,
    }
    setMessages(prevMessages => [...prevMessages, recapDetectedMessage])
    scrollToBottom()

    setTimeout(() => {
      const processingMessage: ChatMessage = {
        type: 'ai',
        excerpt: 'Analyzing discussion points...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      }
      setMessages(prevMessages => [...prevMessages.slice(0, -1), processingMessage])
      scrollToBottom()

      setTimeout(() => {
        const finalRecap: ChatMessage = {
          type: 'ai',
          excerpt: "📝 <b>Meeting Recap (So Far)</b><br/><br/><span><b>Pain Points</b></span><br/>• Reconciling contractor payments<br/>• Equity compensation documentation<br/>• Compliance concerns as they've started hiring in multiple states<br/><br/><span><b>Requirements:</b></span><br/>• Automated tax filing for multiple states<br/>• Better reporting capabilities for budgeting and forecasting",
          summary: "Suggested Next Step: Share case studies of ecommerce companies",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'Meeting Transcript',
        }
        setMessages(prevMessages => [...prevMessages.slice(0, -1), finalRecap])
        setIsLoading(false)
        scrollToBottom()
      }, 2000)
    }, 1000)
  }

  // Add this new function before the return statement
  const handleEndCall = () => {
    setIsLoading(true)
    const endingMessage: ChatMessage = {
      type: 'ai',
      excerpt: 'Ending call...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAnimated: true,
    }
    setMessages(prevMessages => [...prevMessages, endingMessage])
    scrollToBottom()

    setTimeout(() => {
      const generatingMessage: ChatMessage = {
        type: 'ai',
        excerpt: 'Generating followup email...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      }
      setMessages(prevMessages => [...prevMessages.slice(0, -1), generatingMessage])
      scrollToBottom()

      setTimeout(() => {
        const emailTemplate: ChatMessage = {
          type: 'ai',
          excerpt: "📧 <b>Follow-up Email Draft</b><br/><br/>Hi David,<br/><br/>It was great catching up with you today. We're really excited to start working with Brick & Mortar! Here are the next steps we discussed:<br/><br/>• Our legal team will send an MSA by EOD today<br/>• We will work to get pricing for 40 users<br/>• Please find case studies for multi-state implementations attached<br/><br/>Looking forward to catching up again next week!<br/><br/>Thanks,<br/>Sara",
          summary: "Send to: david@brickandmortar.co",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'Meeting Transcript',
        }
        setMessages(prevMessages => [...prevMessages.slice(0, -1), emailTemplate])
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
            className="border-input hover:bg-accent hover:text-accent-foreground"
            onClick={toggleListening}
          >
            {isAudioOn ? <Mic className="h-4 w-4 text-foreground" /> : <MicOff className="h-4 w-4 text-foreground" />}
          </Button>
          <span className="text-foreground">{isAudioOn ? 'Audio On' : 'Audio Off'}</span>
        </div>
      </header>

      {/* Call control buttons */}
      <div className="flex justify-between mb-4">
        <Button
          variant={isCallActive ? "destructive" : "default"}
          onClick={() => {
            setIsCallActive(!isCallActive)
            if (isCallActive) {
              handleEndCall()
            }
          }}
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
        {/* Be Quiet button */}
        <Button
          variant={isQuiet ? "secondary" : "outline"}
          onClick={() => setIsQuiet(!isQuiet)}
          className="text-foreground"
        >
          <Moon className="h-4 w-4 mr-2 text-foreground" />
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
                {transcript.map(async (entry, index) => {
                  const messageId = entry.id || nextMessageId;
                  
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
                    // Get summary for this message if we don't have one yet
                    const existingSummary = summaries.find(s => s.messageId === messageId);
                    if (!existingSummary && entry.text) {
                      await getSummary(entry.text, messageId);
                      setNextMessageId(prev => prev + 1);
                    }
      
                    return (
                      <div key={index} className="mb-2 p-2 bg-blue-100 dark:bg-blue-900 rounded">
                        <span className="font-bold">
                          CONSOLIDATED (SPEAKER {entry.speaker}) - 
                          {entry.trigger === 'utterance_end' ? 'Utterance End' : 'Speaker Change'}:
                        </span>
                        <span className="block mt-1">
                          {entry.text}
                        </span>
                        {existingSummary && (
                          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                            <span className="font-bold">Summary:</span>
                            <span className="block mt-1">{existingSummary.summary}</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-4">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (inputValue.trim()) {
            handleSendMessage(inputValue);
            setInputValue(''); // Clear the input by updating state
          }
        }} className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="border-input hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              console.log('File upload button clicked');
            }}
          >
            <Plus className="h-4 w-4 text-foreground" />
          </Button>
          <Input
            name="chatInput"
            placeholder="Ask for a tip..."
            className="flex-grow text-foreground placeholder:text-muted-foreground"
            onChange={(e) => setInputValue(e.target.value)}
            value={inputValue}
          />
          <Button 
            type="submit" 
            variant="default"
            disabled={!inputValue?.trim()}
          >
            Send
          </Button>
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