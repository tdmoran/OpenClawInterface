import { NextRequest, NextResponse } from 'next/server';
import ngrok from '@ngrok/ngrok';
import { requireDashboardAuth } from '@/lib/api-auth';

// Module-level singleton so the tunnel persists across requests
let activeListener: ngrok.Listener | null = null;
let activeUrl: string | null = null;

export async function GET(req: NextRequest) {
  const authError = requireDashboardAuth(req);
  if (authError) return authError;
  return NextResponse.json({
    active: activeListener !== null,
    url: activeUrl,
  });
}

export async function POST(req: NextRequest) {
  const authError = requireDashboardAuth(req);
  if (authError) return authError;
  // Already running — return existing URL
  if (activeListener && activeUrl) {
    return NextResponse.json({ active: true, url: activeUrl });
  }

  try {
    const listener = await ngrok.forward({
      addr: 'localhost:3000',
      authtoken_from_env: true,
    });

    activeListener = listener;
    activeUrl = listener.url() ?? null;

    return NextResponse.json({ active: true, url: activeUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to start tunnel';
    return NextResponse.json({ active: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = requireDashboardAuth(req);
  if (authError) return authError;
  if (activeListener) {
    try {
      await activeListener.close();
    } catch {
      // Listener may already be closed — ignore
    }
    activeListener = null;
    activeUrl = null;
  }

  return NextResponse.json({ active: false });
}
