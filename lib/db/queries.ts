'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
  meetingTranscript,
  meetingMessage
} from './schema';

import { meeting, meetingAttendee } from './schema';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(`${process.env.POSTGRES_URL!}?sslmode=require`);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  content,
  userId,
}: {
  id: string;
  title: string;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function createMeeting(userId: string) {
  // Create Meeting row
  const [newMeeting] = await db.insert(meeting)
    .values({
      startTime: new Date(),
    })
    .returning({
      id: meeting.id,
      startTime: meeting.startTime,
    });

  // Create pivot record to associate the meeting with the user
  await db.insert(meetingAttendee)
    .values({
      meetingId: newMeeting.id,
      userId,
    });

  return newMeeting;
}

// Create one transcript line
export async function createTranscriptLine({
  meetingId,
  speaker,
  text,
}: {
  meetingId: string;
  speaker: number;
  text: string;
}) {
  try {
    const [row] = await db
      .insert(meetingTranscript)
      .values({ meetingId, speaker, text })
      .returning({
        id: meetingTranscript.id,
        speaker: meetingTranscript.speaker,
        text: meetingTranscript.text,
        createdAt: meetingTranscript.createdAt,
      });

    return row;
  } catch (error) {
    console.error('Failed to create transcript line:', error);
    throw error;
  }
}

// Get all transcript lines for a given meeting
export async function getTranscriptLinesByMeetingId(meetingId: string) {
  try {
    return await db
      .select()
      .from(meetingTranscript)
      .where(eq(meetingTranscript.meetingId, meetingId))
      .orderBy(meetingTranscript.createdAt); // oldest -> newest
  } catch (error) {
    console.error('Failed to fetch transcript lines by meeting:', error);
    throw error;
  }
}

// Example helper to fetch all meetings + stats
export async function getAllMeetingsWithStats() {
  // 1) Fetch the raw list of meetings
  const allMeetings = await db
    .select()
    .from(meeting)
    .orderBy(desc(meeting.startTime));

  // 2) For each meeting, count transcript lines + participants
  const results = [];
  for (const m of allMeetings) {
    // count the transcript lines
    const [transcriptCount] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(meetingTranscript)
      .where(eq(meetingTranscript.meetingId, m.id));

    // count participants
    const [attendeeCount] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(meetingAttendee)
      .where(eq(meetingAttendee.meetingId, m.id));

    results.push({
      id: m.id,
      startTime: m.startTime.toISOString(), // or .toLocaleString(), but usually .toISOString() for JSON
      transcriptLines: transcriptCount.count,
      participants: attendeeCount.count,
    });
  }

  return results;
}

// -----------------------------------------------------
// NEW: Create / fetch meeting messages (summary/user/ai)
// -----------------------------------------------------
export async function createMeetingMessage({
  meetingId,
  type,
  content,
  title,
  quotedMessage,
  timestamp,
}: {
  meetingId: string;
  type: 'summary' | 'user' | 'ai';
  content: string;
  title?: string;
  quotedMessage?: string;
  // This is optional; if not provided, DB defaults to now()
  timestamp?: string;
}) {
  try {
    const [newMsg] = await db
      .insert(meetingMessage)
      .values({
        meetingId,
        type,
        content,
        title,
        quotedMessage,
        // if you want to let DB handle the default, remove this line:
        ...(timestamp && { timestamp: new Date(timestamp) }),
      })
      .returning({
        id: meetingMessage.id,
        meetingId: meetingMessage.meetingId,
        type: meetingMessage.type,
        content: meetingMessage.content,
        title: meetingMessage.title,
        quotedMessage: meetingMessage.quotedMessage,
        timestamp: meetingMessage.timestamp,
      });

    return newMsg;
  } catch (error) {
    console.error('Failed to create meeting message:', error);
    throw error;
  }
}

export async function getMeetingMessagesByMeetingId(meetingId: string) {
  try {
    return await db
      .select()
      .from(meetingMessage)
      .where(eq(meetingMessage.meetingId, meetingId))
      .orderBy(asc(meetingMessage.timestamp));
  } catch (error) {
    console.error('Failed to fetch meeting messages:', error);
    throw error;
  }
}

export async function getMeetingsForUserWithStats(userId: string) {
  // 1) Fetch only the meetings where the user is an attendee
  //    (notice the `.innerJoin(meetingAttendee, ...)` and `.where(eq(meetingAttendee.userId, userId))`)
  const userMeetings = await db
    .select({
      id: meeting.id,
      startTime: meeting.startTime
    })
    .from(meeting)
    .innerJoin(meetingAttendee, eq(meeting.id, meetingAttendee.meetingId))
    .where(eq(meetingAttendee.userId, userId))
    .orderBy(desc(meeting.startTime));

  // 2) For each meeting, count transcripts + participants
  const results = [];
  for (const m of userMeetings) {
    const [transcriptCount] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(meetingTranscript)
      .where(eq(meetingTranscript.meetingId, m.id));

    const [attendeeCount] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(meetingAttendee)
      .where(eq(meetingAttendee.meetingId, m.id));

    results.push({
      id: m.id,
      startTime: m.startTime.toISOString(),
      transcriptLines: transcriptCount.count,
      participants: attendeeCount.count,
    });
  }

  return results;
}