/**
 * This component renders a summary card, which displays a condensed version
 * of a segment of the meeting, including a title, content, and timestamp.
 */
type SummaryCardProps = {
    title: string
    content: string
    timestamp: string
  }
  
  export default function SummaryCard({ title, content, timestamp }: SummaryCardProps) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-800">{content}</p>
        <p className="text-xs text-gray-600 mt-3">{new Date(timestamp).toLocaleTimeString()}</p>
      </div>
    )
  }