import { NextResponse } from 'next/server';
import { monitorState } from '@/lib/code-monitor/state';

export async function GET() {
  return NextResponse.json({ machines: monitorState.getMachines() });
}
