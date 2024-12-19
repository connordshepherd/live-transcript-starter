/**
 * This component renders the initial state of the application,
 * displaying a large "Start Meeting" button.
 * It is shown before the meeting has begun.
 */

import { Mic } from 'lucide-react'

type InitialStateProps = {
  onStart: () => void
}

export default function InitialState({ onStart }: InitialStateProps) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <button
        onClick={onStart}
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
      >
        <div className="flex items-center space-x-3">
          <Mic className="w-8 h-8" />
          <span>Start Meeting</span>
        </div>
      </button>
    </div>
  )
}

