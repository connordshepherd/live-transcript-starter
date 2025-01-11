import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { message, transcript } = await request.json();

  console.log(`Received answer request. Message: "${message}", Transcript length: ${transcript.length}`);

  const gpt4Url = 'https://api.openai.com/v1/chat/completions';

  try {
    const response = await fetch(gpt4Url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that answers questions about call transcripts."
          },
          {
            role: "user",
            content: `Here is a transcript of a call: ${transcript}\n\nHere is a user's query: ${message}\n\nPlease answer the user's query to the best of your ability.`
          }
        ]
      }),
    });

    const data = await response.json();
    const answer = data.choices[0].message.content;

    console.log(`Generated answer. Length: ${answer.length}`);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to get answer' }, { status: 500 });
  }
}