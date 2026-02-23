import { NextRequest } from 'next/server';
import { requireDashboardAuth } from '@/lib/api-auth';

const MOONSHOT_API_URL = 'https://api.moonshot.ai/v1/chat/completions';

const SYSTEM_PROMPT = `You are Clawkins, the AI assistant for Clawkins Homebase — the monitoring dashboard for OpenClaw AI agent framework deployments.

Your role:
- Answer questions about the live system state: agents, sessions, health, costs, tokens, errors, and channels.
- When dashboard context is provided below, treat it as the current ground truth. Use specific numbers and details from it to answer questions accurately.
- If the user asks about something not covered in the context, say so honestly rather than guessing.
- Keep answers concise, direct, and helpful. Use markdown formatting (bold, lists, code) when it improves readability.
- When reporting counts or metrics, cite the exact values from the dashboard state.
- If the dashboard shows no data (e.g., gateway disconnected, no agents), explain that clearly.`;

const MAX_MESSAGE_LENGTH = 10_000;
const MAX_MESSAGES = 50;

export async function POST(req: NextRequest) {
  const authError = requireDashboardAuth(req);
  if (authError) return authError;

  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'MOONSHOT_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate Content-Type header
  const contentType = req.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return new Response(JSON.stringify({ error: 'Request body must be a JSON object' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, dashboardContext } = body as { messages: unknown; dashboardContext: unknown };

  // Validate messages array
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages must be a non-empty array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (messages.length > MAX_MESSAGES) {
    return new Response(JSON.stringify({ error: `messages array exceeds maximum of ${MAX_MESSAGES}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) {
      return new Response(JSON.stringify({ error: 'Each message must be an object' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { role, content } = msg as { role: unknown; content: unknown };
    if (typeof role !== 'string' || !['user', 'assistant', 'system'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Each message must have a valid role (user, assistant, system)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (typeof content !== 'string' || content.length === 0) {
      return new Response(JSON.stringify({ error: 'Each message must have a non-empty string content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Validate optional dashboardContext
  if (dashboardContext !== undefined && typeof dashboardContext !== 'string') {
    return new Response(JSON.stringify({ error: 'dashboardContext must be a string if provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build the full system prompt, optionally enriched with live dashboard state
  const systemContent = dashboardContext
    ? `${SYSTEM_PROMPT}\n\n---\n\nBelow is a real-time snapshot of the dashboard state. Use this data to answer the user's questions with specific, accurate details.\n\n${dashboardContext}`
    : `${SYSTEM_PROMPT}\n\n---\n\nNote: No live dashboard context is available. The gateway may be disconnected. Let the user know you cannot see live data right now.`;

  const response = await fetch(MOONSHOT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'kimi-k2.5',
      messages: [
        { role: 'system', content: systemContent },
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
