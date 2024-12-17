'use client'

import { X } from 'lucide-react'

type FinalTranscriptEntry = {
  speaker: number
  text: string
}

type TranscriptViewProps = {
  onClose: () => void
  // The parent should pass ONLY final transcript entries or a filtered list
  transcript: FinalTranscriptEntry[]
}

/**
 * A simplified TranscriptView that only shows final transcript entries.
 * We assume `transcript` is already filtered in the parent so that it contains
 * only final transcript entries of type 'transcript'.
 */
export default function TranscriptView({ onClose, transcript }: TranscriptViewProps) {
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
      <div className="flex-1 overflow-auto p-4">
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
        </div>
      </div>
    </div>
  )
}
