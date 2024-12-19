import { useState } from 'react'
import { Send } from 'lucide-react'
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

/**
 * This component renders the input section at the bottom of the application.
 * It includes a text input for user messages and quick suggestion buttons.
 */

type InputSectionProps = {
  onSendMessage: (message: string) => void
}

export default function InputSection({ onSendMessage }: InputSectionProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  // Quick suggestion messages
  const suggestions = [
    "Define that",
    "Help me Google that",
    "What's the main point so far?",
  ]

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Horizontal scroll for suggestions. The whitespace-nowrap ensures they line up horizontally.
         If they overflow, horizontal scrolling will be enabled by ScrollArea. */}
      <ScrollArea className="w-full scrollbar-none">
        <div className="flex space-x-2 mb-2 pb-2 whitespace-nowrap">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm whitespace-nowrap"
              onClick={() => onSendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white rounded-r-lg px-4 h-[42px] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
