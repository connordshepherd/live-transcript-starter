// app/components/Summary.tsx
import { useState, useEffect } from 'react';

type SummaryProps = {
  transcript: string;
};

const Summary: React.FC<SummaryProps> = ({ transcript }) => {
  const [summary, setSummary] = useState<string>('');
  const [summaryCount, setSummaryCount] = useState(0);

  useEffect(() => {
    const getSummary = async () => {
      if (!transcript || transcript.length === 0) {
        console.warn('Skipping summary request due to empty transcript');
        return;
      }
      console.log(`Requesting summary #${summaryCount + 1}`);
      console.log(`Transcript length: ${transcript.length}`);
      console.log(`First few words: ${transcript.split(' ').slice(0, 10).join(' ')}...`);
      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transcript }),
        });
        const data = await response.json();
        console.log(`Received summary #${summaryCount + 1}`);
        console.log(`Summary length: ${data.summary.length}`);
        setSummary(data.summary);
        setSummaryCount(prev => prev + 1);
      } catch (error) {
        console.error('Error getting summary:', error);
      }
    };

    getSummary();
  }, [transcript]);

  return (
    <div className="bg-white p-4 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-black">Summary #{summaryCount}</h2>
      {summary ? (
        <p className="text-black">{summary}</p>
      ) : (
        <p className="text-gray-500 italic">Waiting for summary...</p>
      )}
    </div>
  );
};

export default Summary;
