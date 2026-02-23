import { NextRequest, NextResponse } from 'next/server';
import { dashboardSecret } from './dashboard-secret';

export function requireDashboardAuth(req: NextRequest): NextResponse | null {
  const token = req.headers.get('X-Dashboard-Token');
  if (token === dashboardSecret) return null;
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
