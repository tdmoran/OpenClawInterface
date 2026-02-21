import { NextRequest } from 'next/server';

const MOONSHOT_API_URL = 'https://api.moonshot.ai/v1/chat/completions';

const SYSTEM_PROMPT = `You are Clawkins, the AI assistant for Clawkins Homebase. You help users understand and manage their OpenClaw AI agent framework deployment. You can discuss agents, sessions, system health, token usage, configuration, and general AI topics. Keep answers concise and helpful. Use markdown formatting when appropriate.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'MOONSHOT_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages } = await req.json();

  const response = await fetch(MOONSHOT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'kimi-k2.5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      temperature: 1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return new Response(JSON.stringify({ error: `Moonshot API error: ${response.status} ${error}` }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Forward the SSE stream directly to the client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
