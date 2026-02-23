import { randomUUID } from 'crypto';

const GLOBAL_KEY = '__dashboardSecret__';

function initSecret(): string {
  const existing = (globalThis as Record<string, unknown>)[GLOBAL_KEY];
  if (typeof existing === 'string') return existing;

  const secret = process.env.DASHBOARD_SECRET || randomUUID();
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = secret;

  console.log(`[Dashboard] Auth secret: ${secret}`);
  return secret;
}

export const dashboardSecret: string = initSecret();
