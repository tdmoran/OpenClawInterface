import { NextRequest, NextResponse } from 'next/server';
import { monitorState } from '@/lib/code-monitor/state';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { machineId, instruction } = body;

  if (!machineId || !instruction) {
    return NextResponse.json({ error: 'Missing machineId or instruction' }, { status: 400 });
  }

  const command = monitorState.enqueueCommand(machineId, instruction);
  if (!command) {
    return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
  }

  return NextResponse.json({ commandId: command.id });
}

export async function GET(req: NextRequest) {
  const machineId = req.nextUrl.searchParams.get('machineId');

  if (!machineId) {
    return NextResponse.json({ error: 'Missing machineId' }, { status: 400 });
  }

  const token = req.headers.get('X-Monitor-Token') || '';
  if (!monitorState.validateToken(machineId, token)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const commands = monitorState.pollCommands(machineId);
  return NextResponse.json({ commands });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { commandId, status, result, error } = body;

  if (!commandId) {
    return NextResponse.json({ error: 'Missing commandId' }, { status: 400 });
  }

  const token = req.headers.get('X-Monitor-Token') || '';

  // Find the command to get machineId for token validation
  const allCommands = monitorState.getCommands();
  const command = allCommands.find((c) => c.id === commandId);

  if (!command) {
    return NextResponse.json({ error: 'Command not found' }, { status: 404 });
  }

  if (!monitorState.validateToken(command.machineId, token)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const ok = monitorState.updateCommand(commandId, { status, result, error });
  if (!ok) {
    return NextResponse.json({ error: 'Failed to update command' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
