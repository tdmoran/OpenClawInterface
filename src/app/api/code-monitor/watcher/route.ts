import { NextRequest, NextResponse } from 'next/server';
import { getFileWatcher } from '@/lib/code-monitor/file-watcher';
import { requireDashboardAuth } from '@/lib/api-auth';

export async function GET() {
  const watcher = getFileWatcher();
  return NextResponse.json(watcher.getStatus());
}

const MAX_PATH_LENGTH = 1024;
const VALID_ACTIONS = ['start', 'stop', 'restart'] as const;

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

  const { action, watchedFolder } = body as { action: unknown; watchedFolder: unknown };

  if (typeof action !== 'string' || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ error: 'action must be one of: start, stop, restart' }, { status: 400 });
  }

  if (watchedFolder !== undefined) {
    if (typeof watchedFolder !== 'string' || watchedFolder.length === 0 || watchedFolder.length > MAX_PATH_LENGTH) {
      return NextResponse.json({ error: `watchedFolder must be a non-empty string (max ${MAX_PATH_LENGTH} chars)` }, { status: 400 });
    }
    // Reject path traversal attempts
    if (watchedFolder.includes('..')) {
      return NextResponse.json({ error: 'watchedFolder must not contain path traversal sequences' }, { status: 400 });
    }
  }

  const watcher = getFileWatcher();

  if (typeof watchedFolder === 'string') {
    watcher.setWatchedFolder(watchedFolder);
  }

  switch (action) {
    case 'start':
      watcher.start();
      break;
    case 'stop':
      watcher.stop();
      break;
    case 'restart':
      watcher.stop();
      watcher.start();
      break;
  }

  return NextResponse.json(watcher.getStatus());
}
