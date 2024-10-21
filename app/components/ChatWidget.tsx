'use client'

import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { MessageSquare, RefreshCw, Sparkles, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

const actionButtons = [
  { label: 'Give Me More', icon: <MessageSquare className="h-3 w-3 mr-1" /> },
  { label: 'Give Me Something Else', icon: <RefreshCw className="h-3 w-3 mr-1" /> },
  { label: 'Mark as Important', icon: <Sparkles className="h-3 w-3 mr-1" /> },
]

interface ChatWidgetProps {
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  isLoading: boolean;
}

const AnimatedEllipsis: React.FC<{ text: string }> = ({ text }) => {
  const [dots, setDots] = useState('...')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return <span dangerouslySetInnerHTML={{ __html: text.replace('...', dots) }} />
}

export default function ChatWidget({ onSendMessage, messages, isLoading }: ChatWidgetProps) {
  const allMessages = [...messages];

  return (
    <div className="flex flex-col bg-background">
      <div className="space-y-4 p-4">
        {allMessages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'} rounded-lg p-3 shadow-sm`}>
              {message.type === 'user' ? (
                <>
                  <p className="text-sm mb-1">{message.content}</p>
                  <p className="text-xs text-primary-foreground/70">{message.timestamp}</p>
                </>
              ) : (
                <>
                  {message.isAnimated ? (
                    <AnimatedEllipsis text={message.excerpt || ''} />
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-2" dangerouslySetInnerHTML={{ __html: message.excerpt || '' }} />
                      {message.summary && (
                        <p className="text-sm mb-2">{message.summary}</p>
                      )}
                      <div className="flex justify-between items-center text-xs text-secondary-foreground/70 mb-2">
                        <span>{message.timestamp}</span>
                        {message.source && <span>Source: {message.source}</span>}
                      </div>
                      {!message.isDefault && (
                        <div className="flex justify-between flex-wrap">
                          {actionButtons.map((button, buttonIndex) => (
                            <Button key={buttonIndex} variant="ghost" size="sm" className="h-6 text-xs px-2 py-0">
                              {button.icon}
                              {button.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}