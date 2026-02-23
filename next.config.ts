import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@xyflow/react'],
  serverExternalPackages: ['@ngrok/ngrok'],
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Proxy WebSocket connections to the local gateway so LAN clients
        // (e.g. phones) can reach it through the Next.js server.
        source: '/gateway-ws',
        destination: 'http://localhost:18789',
      },
    ];
  },
};

export default nextConfig;
