/**
 * A simplified TranscriptView that only shows final transcript entries.
 * We assume `transcript` is already filtered in the parent so that it contains
 * only final transcript entries of type 'transcript'.
 */

'use client'

import { X } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useRef } from 'react'

type FinalTranscriptEntry = {
  speaker: number
  text: string
}

type TranscriptViewProps = {
  onClose: () => void
  transcript: FinalTranscriptEntry[]
}

export default function TranscriptView({ onClose, transcript }: TranscriptViewProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Scroll to the bottom whenever transcript updates
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [transcript])

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 text-white flex items-center justify-between">
        <h2 className="text-lg font-semibold">Full Transcript</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <ScrollArea className="flex-1 p-4 text-gray-800">
        <div className="space-y-4">
          {transcript.length === 0 ? (
            <p>No final transcripts available yet.</p>
          ) : (
            transcript.map((entry, index) => (
              <div key={index} className="border-b pb-2">
                <span className="font-semibold">Speaker {entry.speaker}:</span>{' '}
                <span>{entry.text}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
