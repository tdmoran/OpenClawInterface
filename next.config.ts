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
    const gatewayUrl = process.env.GATEWAY_PROXY_URL || 'http://localhost:18789';
    // Only proxy when running locally or when an explicit proxy URL is set.
    // On Vercel the client connects to the gateway directly via NEXT_PUBLIC_GATEWAY_URL.
    if (!process.env.GATEWAY_PROXY_URL && process.env.VERCEL) {
      return [];
    }
    return [
      {
        // Proxy WebSocket connections to the gateway so LAN clients
        // (e.g. phones) can reach it through the Next.js server.
        source: '/gateway-ws',
        destination: gatewayUrl,
      },
    ];
  },
};

export default nextConfig;
