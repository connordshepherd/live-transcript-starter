/**
 * This component renders the main content area of the application, displaying
 * a scrollable list of summary cards, user messages, and AI replies.
 */
import { forwardRef } from 'react'
import SummaryCard from './SummaryCard'
import UserChatMessage from './UserChatMessage'
import AIReplyMessage from './AIReplyMessage'
import { ScrollArea } from "@/components/ui/scroll-area"

type MainContentAreaProps = {
  messages: Array<{
    id: number
    type: 'summary' | 'user' | 'ai'
    title?: string
    content: string
    timestamp: string
    quotedMessage?: string
  }>
}

const MainContentArea = forwardRef<HTMLDivElement, MainContentAreaProps>(({ messages }, ref) => {
  return (
    <ScrollArea className="flex-1">
      <div ref={ref} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          switch (message.type) {
            case 'summary':
              return <SummaryCard key={message.id} title={message.title!} content={message.content} timestamp={message.timestamp} />
            case 'user':
              return <UserChatMessage key={message.id} content={message.content} timestamp={message.timestamp} />
            case 'ai':
              return <AIReplyMessage key={message.id} content={message.content} timestamp={message.timestamp} quotedMessage={message.quotedMessage} />
            default:
              return null
          }
        })}
      </div>
    </ScrollArea>
  )
})

MainContentArea.displayName = 'MainContentArea'

export default MainContentArea