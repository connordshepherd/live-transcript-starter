import { NextResponse } from 'next/server';
import {
  createMeetingMessage,
  getMeetingMessagesByMeetingId,
} from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: { meetingId: string } }
) {
  const { meetingId } = params;
  if (!meetingId) {
    return NextResponse.json({ error: 'Missing meetingId' }, { status: 400 });
  }

  try {
    const messages = await getMeetingMessagesByMeetingId(meetingId);
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { meetingId: string } }
) {
  const { meetingId } = params;
  if (!meetingId) {
    return NextResponse.json({ error: 'Missing meetingId' }, { status: 400 });
  }

  try {
    // Expect a single message in the request body:
    // {
    //   "type": "summary" | "user" | "ai",
    //   "content": string,
    //   "title"?: string,
    //   "quotedMessage"?: string,
    //   "timestamp"?: string
    // }
    const data = await request.json();

    // Basic validation:
    if (
      !data.type ||
      !data.content ||
      typeof data.type !== 'string' ||
      typeof data.content !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // create the message in DB
    const newMessage = await createMeetingMessage({
      meetingId,
      type: data.type as 'summary' | 'user' | 'ai',
      content: data.content,
      title: data.title,
      quotedMessage: data.quotedMessage,
      timestamp: data.timestamp,
    });

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create meeting message' },
      { status: 500 }
    );
  }
}
