export interface UrlValidation {
  valid: boolean;
  protocol: 'ws' | 'wss' | null;
  error?: string;
  warning?: string;
  suggestion?: string;
}

export function validateGatewayUrl(url: string): UrlValidation {
  if (!url || !url.trim()) {
    return { valid: false, protocol: null, error: 'URL is required' };
  }

  // Map ws/wss to http/https so the URL parser can handle it
  let parseable = url;
  if (parseable.startsWith('ws://')) {
    parseable = 'http://' + parseable.slice(5);
  } else if (parseable.startsWith('wss://')) {
    parseable = 'https://' + parseable.slice(6);
  }

  let parsed: URL;
  try {
    parsed = new URL(parseable);
  } catch {
    return { valid: false, protocol: null, error: 'Invalid URL format' };
  }

  // Determine the original protocol from the input
  const originalProto = url.startsWith('wss://') ? 'wss:' : url.startsWith('ws://') ? 'ws:' : parsed.protocol;

  if (originalProto !== 'ws:' && originalProto !== 'wss:') {
    return { valid: false, protocol: null, error: 'URL must start with ws:// or wss://' };
  }

  const protocol: 'ws' | 'wss' = originalProto === 'ws:' ? 'ws' : 'wss';

  let warning: string | undefined;
  let suggestion: string | undefined;

  // Check for HTTPS page using plain ws://
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    protocol === 'ws'
  ) {
    warning = 'Using ws:// from an HTTPS page may be blocked by the browser';
    suggestion = url.replace('ws://', 'wss://');
  }

  // Check for non-localhost using plain ws://
  const host = parsed.hostname;
  if (
    !warning &&
    protocol === 'ws' &&
    host !== 'localhost' &&
    host !== '127.0.0.1' &&
    host !== '[::1]' &&
    host !== '::1'
  ) {
    warning = 'ws:// sends data unencrypted — use wss:// for remote connections';
    suggestion = url.replace('ws://', 'wss://');
  }

  return { valid: true, protocol, warning, suggestion };
}
