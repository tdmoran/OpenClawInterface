import { NextRequest, NextResponse } from 'next/server';
import { getFileWatcher } from '@/lib/code-monitor/file-watcher';

export async function GET() {
  const watcher = getFileWatcher();
  return NextResponse.json(watcher.getStatus());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, watchedFolder } = body as { action?: string; watchedFolder?: string };

  const watcher = getFileWatcher();

  if (watchedFolder) {
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
    default:
      return NextResponse.json({ error: 'Invalid action. Use start, stop, or restart.' }, { status: 400 });
  }

  return NextResponse.json(watcher.getStatus());
}
