import { NextRequest, NextResponse } from 'next/server';
import { monitorState } from '@/lib/code-monitor/state';
import type { CodeEvent } from '@/types/code-monitor';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { machineId, events } = body as { machineId: string; events: CodeEvent[] };

  if (!machineId || !Array.isArray(events)) {
    return NextResponse.json({ error: 'Missing machineId or events array' }, { status: 400 });
  }

  const token = req.headers.get('X-Monitor-Token') || '';
  if (!monitorState.validateToken(machineId, token)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  for (const event of events) {
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
