import { NextRequest, NextResponse } from 'next/server';
import { dashboardSecret } from '@/lib/dashboard-secret';

export async function GET(req: NextRequest) {
  // Only allow same-origin requests to obtain the secret.
  // Browsers always send Origin on cross-origin fetches, and Referer on
  // same-origin fetches.  A missing Origin + present same-origin Referer
  // is the normal same-origin case.  We also allow matching Origin.
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  let allowed = false;

  if (!origin && referer && host) {
    // Same-origin fetch: no Origin header, Referer starts with our host
    try {
      const refererHost = new URL(referer).host;
      allowed = refererHost === host;
    } catch {
      // malformed referer
    }
  } else if (origin && host) {
    // Cross-origin fetch or explicit Origin: must match
    try {
      const originHost = new URL(origin).host;
      allowed = originHost === host;
    } catch {
      // malformed origin
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ token: dashboardSecret });
}
