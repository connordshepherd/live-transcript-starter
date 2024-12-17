/**
 * This component renders an AI's reply message in the main content area.
 * It displays the AI's response, the original user query (if provided), and a timestamp.
 */
type AIReplyMessageProps = {
    content: string
    timestamp: string
    quotedMessage?: string
  }
  
  export default function AIReplyMessage({ content, timestamp, quotedMessage }: AIReplyMessageProps) {
    return (
      <div className="flex justify-start">
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg p-4 max-w-[80%] shadow-md">
          {quotedMessage && (
            <div className="bg-white bg-opacity-50 rounded p-2 mb-3 text-sm border-l-4 border-purple-400">
              <p className="font-semibold text-purple-700">User asked:</p>
              <p className="text-gray-700">{quotedMessage}</p>
            </div>
          )}
          <p className="text-gray-800">{content}</p>
          <p className="text-xs text-gray-600 mt-2">{new Date(timestamp).toLocaleTimeString()}</p>
        </div>
      </div>
    )
  }