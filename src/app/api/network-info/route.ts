import { NextResponse } from 'next/server';
import { networkInterfaces, hostname } from 'os';

interface NetworkAddress {
  interface: string;
  address: string;
  family: 'IPv4' | 'IPv6';
  internal: boolean;
}

export async function GET() {
  try {
    const host = hostname();
    const ifaces = networkInterfaces();
    const addresses: NetworkAddress[] = [];

    for (const [name, addrs] of Object.entries(ifaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        addresses.push({
          interface: name,
          address: addr.address,
          family: addr.family as 'IPv4' | 'IPv6',
          internal: addr.internal,
        });
      }
    }

    // Build suggested URLs: external IPv4 addresses with default gateway port
    const suggestedUrls = addresses
      .filter((a) => !a.internal && a.family === 'IPv4')
      .map((a) => `ws://${a.address}:18789`);

    return NextResponse.json({ hostname: host, addresses, suggestedUrls });
  } catch {
    return NextResponse.json({ hostname: 'unknown', addresses: [], suggestedUrls: [] }, { status: 500 });
  }
}
