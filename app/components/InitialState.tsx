/**
 * This component renders the initial state of the application,
 * displaying a large "Start Meeting" button.
 * It is shown before the meeting has begun.
 */

import { Mic } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import PastMeetingCard from './PastMeetingCard'

type InitialStateProps = {
  onStart: () => void
  onSelectPastMeeting: (meetingId: string) => void
}

export default function InitialState({ onStart, onSelectPastMeeting }: InitialStateProps) {
  // Mock data for past meetings
  const pastMeetings = [
    { id: '1', startDateTime: '2023-05-10T14:00:00Z', transcriptLines: 120, participants: 5 },
    { id: '2', startDateTime: '2023-05-08T10:30:00Z', transcriptLines: 50, participants: 3 },
    { id: '3', startDateTime: '2023-05-05T09:00:00Z', transcriptLines: 180, participants: 7 },
    { id: '4', startDateTime: '2023-05-03T13:15:00Z', transcriptLines: 75, participants: 4 },
    { id: '5', startDateTime: '2023-05-01T11:00:00Z', transcriptLines: 100, participants: 6 },
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-6">
      <div className="mb-6 flex justify-center">
        <Button
          onClick={onStart}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          <div className="flex items-center space-x-3">
            <Mic className="w-8 h-8" />
            <span>Start New Meeting</span>
          </div>
        </Button>
      </div>
      <h2 className="text-2xl font-bold mb-4">Past Meetings</h2>
      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-4">
          {pastMeetings.map((meeting) => (
            <PastMeetingCard
              key={meeting.id}
              startDateTime={meeting.startDateTime}
              transcriptLines={meeting.transcriptLines}
              participants={meeting.participants}
              onClick={() => onSelectPastMeeting(meeting.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

