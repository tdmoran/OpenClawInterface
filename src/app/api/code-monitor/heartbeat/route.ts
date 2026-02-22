import { NextRequest, NextResponse } from 'next/server';
import { monitorState } from '@/lib/code-monitor/state';

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

  const { machineId, activeSessions, cpuUsage, memUsage } = body as {
    machineId: unknown;
    activeSessions: unknown;
    cpuUsage: unknown;
    memUsage: unknown;
  };

  if (typeof machineId !== 'string' || machineId.length === 0 || machineId.length > MAX_ID_LENGTH) {
    return NextResponse.json({ error: 'machineId must be a non-empty string (max 256 chars)' }, { status: 400 });
  }

  if (activeSessions !== undefined && typeof activeSessions !== 'number') {
    return NextResponse.json({ error: 'activeSessions must be a number if provided' }, { status: 400 });
  }

  if (cpuUsage !== undefined && typeof cpuUsage !== 'number') {
    return NextResponse.json({ error: 'cpuUsage must be a number if provided' }, { status: 400 });
  }

  if (memUsage !== undefined && typeof memUsage !== 'number') {
    return NextResponse.json({ error: 'memUsage must be a number if provided' }, { status: 400 });
  }

  const token = req.headers.get('X-Monitor-Token') || '';
  if (!monitorState.validateToken(machineId, token)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ok = monitorState.heartbeat(machineId, { activeSessions, cpuUsage, memUsage });
  if (!ok) {
    return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
