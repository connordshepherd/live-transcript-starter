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

// Add additional prompt instructions
prompt += `

As you summarize, don't refer to "the transcript" or "this section" or stuff like that in your response. Be concrete about which speaker says what.

<STYLE EXAMPLES>
BAD Example: "In this transcript section, the speakers agree that they will set a meeting for next Thursday."
GOOD Example: "Speaker 2 and Speaker 3 want to set a meeting for next Thursday."
BAD Example: "In the transcript, multiple speakers discuss the feasibility of refactoring the frontend in Node JS. Resources are also discussed."
GOOD Example: "Speaker 0 suggests that the frontend be refactored in Node JS, but Speaker 1 has doubts about the timeline. The key point of disagreement is engineering resources - Speaker 1 says there are enough frontend engineers, but Speaker 0 disagrees."
</STYLE EXAMPLES>`;

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
        model: "gpt-4o",
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
