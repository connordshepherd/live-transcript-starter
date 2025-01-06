// file: /app/api/meetings/[meetingId]/transcript/route.ts

import { NextResponse } from 'next/server';
import {
  createTranscriptLine,
  getTranscriptLinesByMeetingId,
} from '@/lib/db/queries';

// GET: Retrieve all transcript lines for this meeting
export async function GET(
  request: Request,
  { params }: { params: { meetingId: string } }
) {
  const { meetingId } = params;
  if (!meetingId) {
    return NextResponse.json({ error: 'Missing meetingId' }, { status: 400 });
  }

  try {
    const lines = await getTranscriptLinesByMeetingId(meetingId);
    return NextResponse.json(lines);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch transcript lines' },
      { status: 500 }
    );
  }
}

// POST: Create a new transcript line
export async function POST(
  request: Request,
  { params }: { params: { meetingId: string } }
) {
  const { meetingId } = params;
  if (!meetingId) {
    return NextResponse.json({ error: 'Missing meetingId' }, { status: 400 });
  }

  try {
    const { speaker, text } = await request.json();

    if (typeof speaker !== 'number' || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid speaker/text' }, { status: 400 });
    }

    const newLine = await createTranscriptLine({
      meetingId,
      speaker,
      text,
    });
    return NextResponse.json(newLine);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create transcript line' },
      { status: 500 }
    );
  }
}
