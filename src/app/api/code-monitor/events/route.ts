import { NextRequest, NextResponse } from 'next/server';
import { monitorState } from '@/lib/code-monitor/state';
import type { CodeEvent } from '@/types/code-monitor';

const MAX_EVENTS_PER_BATCH = 100;
const MAX_ID_LENGTH = 256;

export async function POST(req: NextRequest) {
  // Validate Content-Type
  const contentType = req.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const { machineId, events } = body as { machineId: unknown; events: unknown };

  if (typeof machineId !== 'string' || machineId.length === 0 || machineId.length > MAX_ID_LENGTH) {
    return NextResponse.json({ error: 'machineId must be a non-empty string (max 256 chars)' }, { status: 400 });
  }

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'events must be an array' }, { status: 400 });
  }

  if (events.length > MAX_EVENTS_PER_BATCH) {
    return NextResponse.json({ error: `events array exceeds maximum batch size of ${MAX_EVENTS_PER_BATCH}` }, { status: 400 });
  }

  const token = req.headers.get('X-Monitor-Token') || '';
  if (!monitorState.validateToken(machineId, token)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  for (const event of events as CodeEvent[]) {
    monitorState.addEvent({
      ...event,
      id: event.id || crypto.randomUUID(),
      machineId,
      timestamp: event.timestamp || Date.now(),
    });
  }

  return NextResponse.json({ ok: true, count: events.length });
}

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial state snapshot
      const snapshot = monitorState.getState();
      const snapshotPayload = `data: ${JSON.stringify({ type: 'snapshot', data: snapshot })}\n\n`;
      controller.enqueue(encoder.encode(snapshotPayload));

      // Register as SSE client for future broadcasts
      const client = { controller };
      monitorState.addSSEClient(client);

      // Cleanup when the connection closes
      const cleanup = () => {
        monitorState.removeSSEClient(client);
      };

      // The cancel callback is called when the client disconnects
      return cleanup;
    },
    cancel() {
      // Stream cancelled by the client - cleanup is handled in start's return
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
