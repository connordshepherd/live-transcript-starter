"use client";

import React from "react";
import { useRouter } from "next/navigation";

// ------------------------------------------------------------------
// Uncomment or replace these imports if/when you want your placeholders active
// import InitialState from "./components/InitialState";
// import PastMeetingCard from "./components/PastMeetingCard";
// ------------------------------------------------------------------

export default function Page() {
  const router = useRouter();

  // We only need a simple click handler to route to /live-call and autostart
  const handleStartNewMeeting = () => {
    router.push("/live-call");
  };

  return (
    <div className="p-4">
      {/* 
        ----------------------------------------------------------------
        Keep your placeholders here or uncomment them if you want them
        ----------------------------------------------------------------
        
        <InitialState />
        <PastMeetingCard />
        
        ... other placeholders or content you need ...
      */}

      <div className="mt-4">
        <button
          onClick={handleStartNewMeeting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Start New Meeting
        </button>
      </div>
    </div>
  );
}
