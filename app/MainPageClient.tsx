'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PastMeetingCard from './components/PastMeetingCard';

type MeetingWithStats = {
  id: string;
  startTime: string;
  transcriptLines: number;
  participants: number;
};

export default function MainPageClient() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // On mount, fetch the list of past meetings
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/meetings')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch meetings');
        return res.json();
      })
      .then((data: MeetingWithStats[]) => {
        setMeetings(data);
      })
      .catch((err) => {
        console.error('Error fetching meetings:', err);
        // You might show a toast or something
      })
      .finally(() => setIsLoading(false));
  }, []);

  // START NEW MEETING
  const handleStartNewMeeting = async () => {
    try {
      console.log('Attempting to create new meeting...');
      const res = await fetch('/api/meetings', { method: 'POST' });
      console.log('API Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to create meeting. Server response:', errorText);
        throw new Error(`Failed to create meeting: ${errorText}`);
      }

      const data = await res.json();
      console.log('Meeting created successfully:', data);
      router.push(`/live-call?meetingId=${data.id}`);
    } catch (err) {
      console.error('Detailed error:', err);
      alert('Error creating meeting. Maybe you need to log in?');
    }
  };

  // When the user clicks on a PastMeetingCard
  const handleOpenPastMeeting = (meetingId: string) => {
    // For example, route to a "past meeting details" page or reuse your existing meeting screen:
    router.push(`/live-call?meetingId=${meetingId}&isPast=true`);
  };

  return (
    <div className="p-4">
      <button
        onClick={handleStartNewMeeting}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Start New Meeting
      </button>

      <hr className="my-6" />

      <h2 className="text-xl font-bold mb-4">Past Meetings</h2>
      {isLoading && <p>Loading past meetings...</p>}

      {!isLoading && meetings.length === 0 && (
        <p className="text-gray-500">No past meetings yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {meetings.map((m) => (
          <PastMeetingCard
            key={m.id}
            startDateTime={m.startTime}
            transcriptLines={m.transcriptLines}
            participants={m.participants}
            onClick={() => handleOpenPastMeeting(m.id)}
          />
        ))}
      </div>
    </div>
  );
}
