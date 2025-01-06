import { Card, CardContent } from "@/components/ui/card"
import { AlignLeft, Users } from 'lucide-react'

type PastMeetingCardProps = {
  startDateTime: string
  transcriptLines: number
  participants: number
  onClick: () => void
}

export default function PastMeetingCard({ startDateTime, transcriptLines, participants, onClick }: PastMeetingCardProps) {
  return (
    <Card className="cursor-pointer hover:bg-gray-50 transition-colors duration-200" onClick={onClick}>
      <CardContent className="p-4">
        <p className="font-semibold text-lg mb-2">{new Date(startDateTime).toLocaleString()}</p>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <AlignLeft className="w-4 h-4 mr-1" />
            <span>{transcriptLines} lines</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            <span>{participants} participants</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

