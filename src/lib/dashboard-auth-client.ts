let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

async function fetchToken(): Promise<string> {
  const res = await fetch('/api/auth/token');
  if (!res.ok) throw new Error('Failed to obtain dashboard token');
  const data = await res.json();
  return data.token as string;
}

export async function getDashboardToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (!tokenPromise) {
    tokenPromise = fetchToken().then((t) => {
      cachedToken = t;
      tokenPromise = null;
      return t;
    }).catch((err) => {
      tokenPromise = null;
      throw err;
    });
  }
  return tokenPromise;
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getDashboardToken();
  const headers = new Headers(init?.headers);
  headers.set('X-Dashboard-Token', token);
  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    // Token may be stale after server restart — refresh and retry once
    cachedToken = null;
    const newToken = await getDashboardToken();
    headers.set('X-Dashboard-Token', newToken);
    return fetch(url, { ...init, headers });
  }

  return res;
}
