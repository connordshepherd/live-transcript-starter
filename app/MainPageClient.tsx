'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function MainPageClient() {
  const router = useRouter();

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

  return (
    <div className="p-4">
      <button
        onClick={handleStartNewMeeting}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Start New Meeting
      </button>
    </div>
  );
}
