import { create } from 'zustand';

// --- Typed shapes for parsed gateway data ---

export interface ChannelHealth {
  configured: boolean;
  running: boolean;
  label: string;
  probe?: { ok: boolean; bot?: { username: string } };
}

export interface AgentHealth {
  agentId: string;
  isDefault: boolean;
  sessions: { count: number };
  heartbeat?: { enabled: boolean; every: string };
}

interface RecentSession {
  key: string;
  updatedAt: number;
  age: number;
}

export interface HealthData {
  ok: boolean;
  ts: number;
  durationMs: number;
  channels: Record<string, ChannelHealth>;
  channelOrder: string[];
  agents: AgentHealth[];
  sessions: { count: number; recent: RecentSession[] };
  uptimeMs: number;
}

export interface ServerInfo {
  version: string;
  host: string;
  connId: string;
}

export interface PresenceEntry {
  host: string;
  version?: string;
  platform?: string;
  mode?: string;
  reason: string;
  ts: number;
}

interface GatewayDataState {
  // Raw snapshot data
  snapshot: Record<string, unknown> | null;
  server: ServerInfo | null;

  // Parsed live data
  health: HealthData | null;
  presence: PresenceEntry[];

  // Actions
  setSnapshot: (payload: Record<string, unknown>) => void;
  updateHealth: (health: Record<string, unknown>) => void;
  updatePresence: (presence: unknown[]) => void;
}

// --- Helpers to safely parse nested data ---

function parseHealth(
  raw: Record<string, unknown> | undefined | null,
  channelLabels: Record<string, string>,
  uptimeMs: number,
): HealthData | null {
  if (!raw) return null;

  const channels: Record<string, ChannelHealth> = {};
  const rawChannels = (raw.channels ?? {}) as Record<string, Record<string, unknown>>;
  const channelOrder = (raw.channelOrder ?? []) as string[];

  for (const key of Object.keys(rawChannels)) {
    const ch = rawChannels[key];
    channels[key] = {
      configured: Boolean(ch.configured),
      running: Boolean(ch.running),
      label: channelLabels[key] ?? key,
      probe: ch.probe
        ? {
            ok: Boolean((ch.probe as Record<string, unknown>).ok),
            bot: (ch.probe as Record<string, unknown>).bot
              ? { username: String(((ch.probe as Record<string, unknown>).bot as Record<string, unknown>).username ?? '') }
              : undefined,
          }
        : undefined,
    };
  }

  const rawAgents = (raw.agents ?? []) as Record<string, unknown>[];
  const agents: AgentHealth[] = rawAgents.map((a) => ({
    agentId: String(a.agentId ?? ''),
    isDefault: Boolean(a.isDefault),
    sessions: { count: Number((a.sessions as Record<string, unknown>)?.count ?? 0) },
    heartbeat: a.heartbeat
      ? {
          enabled: Boolean((a.heartbeat as Record<string, unknown>).enabled),
          every: String((a.heartbeat as Record<string, unknown>).every ?? ''),
        }
      : undefined,
  }));

  const rawSessions = (raw.sessions ?? { count: 0, recent: [] }) as Record<string, unknown>;
  const recentRaw = (rawSessions.recent ?? []) as Record<string, unknown>[];
  const sessions = {
    count: Number(rawSessions.count ?? 0),
    recent: recentRaw.map((s) => ({
      key: String(s.key ?? ''),
      updatedAt: Number(s.updatedAt ?? 0),
      age: Number(s.age ?? 0),
    })),
  };

  return {
    ok: Boolean(raw.ok),
    ts: Number(raw.ts ?? 0),
    durationMs: Number(raw.durationMs ?? 0),
    channels,
    channelOrder,
    agents,
    sessions,
    uptimeMs,
  };
}

function parsePresence(raw: unknown[] | undefined | null): PresenceEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = entry as Record<string, unknown>;
    return {
      host: String(e.host ?? ''),
      version: e.version != null ? String(e.version) : undefined,
      platform: e.platform != null ? String(e.platform) : undefined,
      mode: e.mode != null ? String(e.mode) : undefined,
      reason: String(e.reason ?? ''),
      ts: Number(e.ts ?? 0),
    };
  });
}

function parseServer(raw: Record<string, unknown> | undefined | null): ServerInfo | null {
  if (!raw) return null;
  return {
    version: String(raw.version ?? ''),
    host: String(raw.host ?? ''),
    connId: String(raw.connId ?? ''),
  };
}

export const useGatewayDataStore = create<GatewayDataState>((set) => ({
  snapshot: null,
  server: null,
  health: null,
  presence: [],

  setSnapshot: (payload) => {
    const snap = (payload.snapshot ?? {}) as Record<string, unknown>;
    const rawHealth = snap.health as Record<string, unknown> | undefined;
    const channelLabels = (rawHealth?.channelLabels ?? {}) as Record<string, string>;
    const uptimeMs = Number(snap.uptimeMs ?? 0);

    set({
      snapshot: payload,
      server: parseServer(payload.server as Record<string, unknown> | undefined),
      health: parseHealth(rawHealth, channelLabels, uptimeMs),
      presence: parsePresence(snap.presence as unknown[] | undefined),
    });
  },

  updateHealth: (raw) => {
    set((state) => {
      const channelLabels = (raw.channelLabels ?? {}) as Record<string, string>;
      // Preserve existing uptimeMs if not provided in the health event
      const uptimeMs = raw.uptimeMs != null ? Number(raw.uptimeMs) : (state.health?.uptimeMs ?? 0);
      return {
        health: parseHealth(raw, channelLabels, uptimeMs),
      };
    });
  },

  updatePresence: (raw) => {
    set({
      presence: parsePresence(raw),
    });
  },
}));
