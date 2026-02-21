import { NextRequest, NextResponse } from 'next/server';
import { monitorState } from '@/lib/code-monitor/state';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, hostname, os, action, machineId } = body;

  if (action === 'deregister') {
    const token = req.headers.get('X-Monitor-Token') || '';
    if (!machineId || !monitorState.validateToken(machineId, token)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    monitorState.removeMachine(machineId);
    return NextResponse.json({ ok: true });
  }

  if (!name || !hostname || !os) {
    return NextResponse.json({ error: 'Missing required fields: name, hostname, os' }, { status: 400 });
  }

  const result = monitorState.registerMachine(name, hostname, os);
  return NextResponse.json(result);
}
