"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  const handleStartNewMeeting = async () => {
    try {
      const res = await fetch('/api/meetings', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create meeting');
      const data = await res.json();
      router.push(`/live-call?meetingId=${data.id}`);
    } catch (err) {
      console.error(err);
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
