import { NextRequest, NextResponse } from 'next/server';
import { monitorState } from '@/lib/code-monitor/state';
import type { CommandStatus } from '@/types/code-monitor';

const VALID_COMMAND_STATUSES: CommandStatus[] = ['pending', 'dispatched', 'running', 'completed', 'error'];

const MAX_INSTRUCTION_LENGTH = 5000;
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

  const { machineId, instruction } = body as { machineId: unknown; instruction: unknown };

  if (typeof machineId !== 'string' || machineId.length === 0 || machineId.length > MAX_ID_LENGTH) {
    return NextResponse.json({ error: 'machineId must be a non-empty string (max 256 chars)' }, { status: 400 });
  }

  if (typeof instruction !== 'string' || instruction.length === 0 || instruction.length > MAX_INSTRUCTION_LENGTH) {
    return NextResponse.json({ error: `instruction must be a non-empty string (max ${MAX_INSTRUCTION_LENGTH} chars)` }, { status: 400 });
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

  const { commandId, status, result, error } = body as {
    commandId: unknown;
    status: unknown;
    result: unknown;
    error: unknown;
  };

  if (typeof commandId !== 'string' || commandId.length === 0 || commandId.length > MAX_ID_LENGTH) {
    return NextResponse.json({ error: 'commandId must be a non-empty string (max 256 chars)' }, { status: 400 });
  }

  if (status !== undefined && (typeof status !== 'string' || !VALID_COMMAND_STATUSES.includes(status as CommandStatus))) {
    return NextResponse.json({ error: `status must be one of: ${VALID_COMMAND_STATUSES.join(', ')}` }, { status: 400 });
  }

  if (result !== undefined && typeof result !== 'string') {
    return NextResponse.json({ error: 'result must be a string if provided' }, { status: 400 });
  }

  if (error !== undefined && typeof error !== 'string') {
    return NextResponse.json({ error: 'error must be a string if provided' }, { status: 400 });
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

  const validatedStatus = status as CommandStatus | undefined;
  const validatedResult = result as string | undefined;
  const validatedError = error as string | undefined;

  const ok = monitorState.updateCommand(commandId, {
    status: validatedStatus,
    result: validatedResult,
    error: validatedError,
  });
  if (!ok) {
    return NextResponse.json({ error: 'Failed to update command' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
