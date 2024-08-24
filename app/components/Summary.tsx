// app/components/Summary.tsx
import { useState, useEffect } from 'react';

type SummaryProps = {
  transcript: string;
};

const Summary: React.FC<SummaryProps> = ({ transcript }) => {
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    const getSummary = async () => {
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

    if (transcript) {
      getSummary();
    }
  }, [transcript]);

  return (
    <div className="bg-white p-4 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Summary</h2>
      <p>{summary}</p>
    </div>
  );
};

export default Summary;
