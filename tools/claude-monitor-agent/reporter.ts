import { hostname } from 'node:os';

interface RegisterResponse {
  machineId: string;
  authToken: string;
}

interface HeartbeatStats {
  activeSessions?: number;
  cpuUsage?: number;
  memUsage?: number;
}

export async function register(
  dashboardUrl: string,
  machineName: string
): Promise<RegisterResponse | null> {
  try {
    const res = await fetch(`${dashboardUrl}/api/code-monitor/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: machineName,
        hostname: hostname(),
        os: process.platform,
      }),
    });
    if (!res.ok) {
      console.error(`[reporter] Registration failed: ${res.status} ${res.statusText}`);
      return null;
    }
    return (await res.json()) as RegisterResponse;
  } catch (err) {
    console.error('[reporter] Registration error:', (err as Error).message);
    return null;
  }
}

export async function sendHeartbeat(
  dashboardUrl: string,
  machineId: string,
  token: string,
  stats?: HeartbeatStats
): Promise<boolean> {
  try {
    const res = await fetch(`${dashboardUrl}/api/code-monitor/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Monitor-Token': token,
      },
      body: JSON.stringify({ machineId, ...stats }),
    });
    if (!res.ok) {
      console.error(`[reporter] Heartbeat failed: ${res.status} ${res.statusText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[reporter] Heartbeat error:', (err as Error).message);
    return false;
  }
}

export async function reportEvent(
  dashboardUrl: string,
  machineId: string,
  token: string,
  event: Record<string, unknown>
): Promise<boolean> {
  try {
    const res = await fetch(`${dashboardUrl}/api/code-monitor/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Monitor-Token': token,
      },
      body: JSON.stringify({ machineId, ...event }),
    });
    if (!res.ok) {
      console.error(`[reporter] Event report failed: ${res.status} ${res.statusText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[reporter] Event report error:', (err as Error).message);
    return false;
  }
}

export async function deregister(
  dashboardUrl: string,
  machineId: string,
  token: string
): Promise<boolean> {
  try {
    const res = await fetch(`${dashboardUrl}/api/code-monitor/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Monitor-Token': token,
      },
      body: JSON.stringify({ action: 'deregister', machineId }),
    });
    if (!res.ok) {
      console.error(`[reporter] Deregistration failed: ${res.status} ${res.statusText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[reporter] Deregistration error:', (err as Error).message);
    return false;
  }
}
