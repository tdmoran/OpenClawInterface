import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/api/code-monitor/:path*',
};

export function middleware(req: NextRequest) {
  const allowedOrigin = process.env.CODE_MONITOR_CORS_ORIGIN || '';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Token, X-Monitor-Token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Add CORS headers to actual responses
  const response = NextResponse.next();
  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Dashboard-Token, X-Monitor-Token');
  }
  return response;
}
