'use client'

import { Mic, X, ChevronDown } from 'lucide-react'

type LiveTranscriptBarProps = {
  transcript: string
  isRecording: boolean
  onToggleRecording: () => void
  isExpanded: boolean
  onToggleExpand: () => void
}

/**
 * The LiveTranscriptBar component now receives all state from its parent:
 * - transcript: A string representing the current transcript snippet.
 * - isRecording: A boolean indicating if we are currently recording.
 * - onToggleRecording: A callback to start/stop recording.
 * - isExpanded: A boolean indicating whether the full transcript is shown.
 * - onToggleExpand: A callback to expand/collapse the transcript view.
 */
export default function LiveTranscriptBar({
  transcript,
  isRecording,
  onToggleRecording,
  isExpanded,
  onToggleExpand
}: LiveTranscriptBarProps) {
  return (
    <>
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={onToggleRecording}
              className="bg-white text-blue-500 px-3 py-1 rounded-full flex items-center space-x-2 transition-colors duration-300 hover:bg-blue-100"
            >
              <div className="relative">
                <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
                {isRecording && (
                  <div className="absolute inset-0 bg-blue-500 opacity-30 rounded-full animate-ping"></div>
                )}
              </div>
              <span className="text-sm font-medium">
                {isRecording ? 'Pause Recording' : 'Resume Recording'}
              </span>
            </button>
            <p className="text-sm font-medium truncate flex-1">{transcript}</p>
          </div>
          <button
            onClick={onToggleExpand}
            className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors duration-200"
          >
            {isExpanded ? (
              <X className="w-6 h-6" />
            ) : (
              <ChevronDown className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </>
  )
}
