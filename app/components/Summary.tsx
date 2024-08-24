// app/components/Summary.tsx
import { useState, useEffect } from 'react';

type SummaryProps = {
  transcript: string;
};

const Summary: React.FC<SummaryProps> = ({ transcript }) => {
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    const getSummary = async () => {
      if (!transcript) return;
      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transcript }),
        });
        const data = await response.json();
        setSummary(data.summary);
      } catch (error) {
        console.error('Error getting summary:', error);
      }
    };
  
    getSummary();
  }, [transcript]);

  return (
    <div className="bg-white p-4 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-black">Summary</h2>
      {summary ? (
        <p className="text-black">{summary}</p>
      ) : (
        <p className="text-gray-500 italic">Waiting for summary...</p>
      )}
    </div>
  );
};

export default Summary;
