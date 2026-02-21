import { NextRequest, NextResponse } from 'next/server';
import { monitorState } from '@/lib/code-monitor/state';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { machineId, activeSessions, cpuUsage, memUsage } = body;

  if (!machineId) {
    return NextResponse.json({ error: 'Missing machineId' }, { status: 400 });
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
