import { NextRequest, NextResponse } from 'next/server';
import { monitorState } from '@/lib/code-monitor/state';
import { requireDashboardAuth } from '@/lib/api-auth';

const MAX_FIELD_LENGTH = 256;

export async function POST(req: NextRequest) {
  const authError = requireDashboardAuth(req);
  if (authError) return authError;
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

  const { name, hostname, os, action, machineId } = body as {
    name: unknown;
    hostname: unknown;
    os: unknown;
    action: unknown;
    machineId: unknown;
  };

  if (action === 'deregister') {
    if (typeof machineId !== 'string' || machineId.length === 0 || machineId.length > MAX_FIELD_LENGTH) {
      return NextResponse.json({ error: 'machineId must be a non-empty string for deregister' }, { status: 400 });
    }
    const token = req.headers.get('X-Monitor-Token') || '';
    if (!monitorState.validateToken(machineId, token)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    monitorState.removeMachine(machineId);
    return NextResponse.json({ ok: true });
  }

  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_FIELD_LENGTH) {
    return NextResponse.json({ error: 'name must be a non-empty string (max 256 chars)' }, { status: 400 });
  }

  if (typeof hostname !== 'string' || hostname.length === 0 || hostname.length > MAX_FIELD_LENGTH) {
    return NextResponse.json({ error: 'hostname must be a non-empty string (max 256 chars)' }, { status: 400 });
  }

  if (typeof os !== 'string' || os.length === 0 || os.length > MAX_FIELD_LENGTH) {
    return NextResponse.json({ error: 'os must be a non-empty string (max 256 chars)' }, { status: 400 });
  }

  const result = monitorState.registerMachine(name, hostname, os);
  return NextResponse.json(result);
}
