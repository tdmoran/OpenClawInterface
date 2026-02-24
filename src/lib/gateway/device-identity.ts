/**
 * Device identity for OpenClaw Gateway Protocol v3.
 *
 * Generates an Ed25519 keypair on first use, persists it in localStorage,
 * and provides challenge-signing for the connect handshake.
 */

const STORAGE_KEY = 'openclaw-device-identity';

export interface DeviceIdentity {
  deviceId: string;    // hex SHA-256 of raw public key
  publicKey: string;   // base64url raw public key
  privateKey: CryptoKey;
}

interface StoredIdentity {
  deviceId: string;
  publicKey: string;
  privateKeyJwk: JsonWebKey;
}

// --- Encoding helpers ---

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- Key management ---

async function generateIdentity(): Promise<DeviceIdentity> {
  const keyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);

  const rawPublicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKey = toBase64Url(rawPublicKey);

  const hash = await crypto.subtle.digest('SHA-256', rawPublicKey);
  const deviceId = toHex(hash);

  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const stored: StoredIdentity = { deviceId, publicKey, privateKeyJwk };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  return { deviceId, publicKey, privateKey: keyPair.privateKey };
}

async function loadIdentity(): Promise<DeviceIdentity | null> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const stored: StoredIdentity = JSON.parse(raw);
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      stored.privateKeyJwk,
      'Ed25519',
      false,
      ['sign'],
    );
    return {
      deviceId: stored.deviceId,
      publicKey: stored.publicKey,
      privateKey,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// --- Public API ---

let cached: DeviceIdentity | null = null;

/** Load or generate the device identity (idempotent, cached after first call). */
export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (cached) return cached;
  cached = (await loadIdentity()) || (await generateIdentity());
  return cached;
}

/** Sign a base64url-encoded challenge and return a base64url signature. */
export async function signChallenge(
  privateKey: CryptoKey,
  challenge: string,
): Promise<string> {
  const data = fromBase64Url(challenge);
  const signature = await crypto.subtle.sign('Ed25519', privateKey, data.buffer as ArrayBuffer);
  return toBase64Url(signature);
}
