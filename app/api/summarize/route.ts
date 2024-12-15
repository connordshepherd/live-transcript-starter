import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { transcript } = await request.json();

  console.log(`Received summarization request. Transcript length: ${transcript.length}`);

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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes transcripts."
          },
          {
            role: "user",
            content: `Summarize this transcript: ${transcript}`
          }
        ]
      }),
    });

    const data = await response.json();
    const summary = data.choices[0].message.content;

    console.log(`Generated summary. Length: ${summary.length}`);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to get summary' }, { status: 500 });
  }
}
