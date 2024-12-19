/**
 * This component renders a user's chat message in the main content area.
 * It displays the message content and timestamp.
 */
type UserChatMessageProps = {
    content: string
    timestamp: string
  }
  
  export default function UserChatMessage({ content, timestamp }: UserChatMessageProps) {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-500 text-white rounded-lg p-3 max-w-[80%]">
          <p>{content}</p>
          <p className="text-xs text-blue-100 mt-1">{new Date(timestamp).toLocaleTimeString()}</p>
        </div>
      </div>
    )
  }