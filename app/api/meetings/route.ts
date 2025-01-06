import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';    // <-- important
import { createMeeting } from '@/lib/db/queries';

export async function POST(req: NextRequest) {
  // 1) Get the session from NextAuth
  const session = await auth();

  // 2) If no user ID, return 401
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 3) Create the meeting in your database
  try {
    const newMeeting = await createMeeting(session.user.id);
    return NextResponse.json(newMeeting);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
