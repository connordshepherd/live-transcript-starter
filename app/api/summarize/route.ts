import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { lines, pastSummaries } = await request.json() as {
    lines: Array<{ speaker: number; text: string }>;
    pastSummaries: string[];
  };

  const formattedLines = lines.map((line, index) => `Speaker ${line.speaker}: ${line.text}`).join('\n');

  let prompt = `You are a helpful assistant that summarizes transcripts.

Summarize these 50 lines of transcribed audio. Look for main ideas, speakers, and key points. Your response should be 3-4 sentences.

Transcript:
${formattedLines}
`;

  if (pastSummaries && pastSummaries.length > 0) {
    prompt += `

Also, here are the last ${pastSummaries.length} chunk(s) of summary that have already been produced. Don't re-summarize their content, but use them as context:
${pastSummaries.map((sum, i) => `Previous Summary ${i+1}:\n${sum}\n`).join('')}
`;
  }

  // Replace this URL with your actual GPT-4 API endpoint
  const gpt4Url = 'https://api.openai.com/v1/chat/completions';

  try {
    const response = await fetch(gpt4Url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes transcripts."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
    });

    const data = await response.json();
    const summary = data.choices[0].message.content;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to get summary' }, { status: 500 });
  }
}
