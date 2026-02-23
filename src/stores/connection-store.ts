import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionStatus, GatewayConfig, GatewayProfile } from '@/types/gateway';

const DEFAULT_GATEWAY: GatewayProfile = {
  id: 'default',
  name: 'Local Gateway',
  url: process.env.NEXT_PUBLIC_GATEWAY_URL || 'ws://localhost:18789',
  token: process.env.NEXT_PUBLIC_GATEWAY_TOKEN || '',
};

function profileToConfig(profile: GatewayProfile): GatewayConfig {
  return {
    url: profile.url,
    token: profile.token || undefined,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  };
}

function deriveConfig(gateways: GatewayProfile[], activeGatewayId: string): GatewayConfig {
  const active = gateways.find((g) => g.id === activeGatewayId);
  return profileToConfig(active || gateways[0] || DEFAULT_GATEWAY);
}

interface ConnectionState {
  // Multi-gateway state (persisted)
  gateways: GatewayProfile[];
  activeGatewayId: string;

  // Derived config from active profile (recomputed on changes)
  config: GatewayConfig;

  // Runtime connection state (not persisted)
  status: ConnectionStatus;
  lastConnectedAt: number | null;
  error: string | null;

  // Gateway CRUD
  addGateway: (gateway: GatewayProfile) => void;
  removeGateway: (id: string) => void;
  updateGateway: (id: string, updates: Partial<Omit<GatewayProfile, 'id'>>) => void;
  setActiveGateway: (id: string) => void;

  // Legacy setters (backward-compatible)
  setStatus: (status: ConnectionStatus) => void;
  setConfig: (config: Partial<GatewayConfig>) => void;
  setError: (error: string | null) => void;
  setLastConnectedAt: (timestamp: number) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      // Multi-gateway state
      gateways: [DEFAULT_GATEWAY],
      activeGatewayId: 'default',

      // Derived config
      config: profileToConfig(DEFAULT_GATEWAY),

      // Runtime state
      status: 'disconnected',
      lastConnectedAt: null,
      error: null,

      // Gateway CRUD
      addGateway: (gateway) =>
        set((state) => {
          const gateways = [...state.gateways, gateway];
          return { gateways };
        }),

      removeGateway: (id) =>
        set((state) => {
          if (state.gateways.length <= 1) return state;
          const gateways = state.gateways.filter((g) => g.id !== id);
          const activeGatewayId =
            state.activeGatewayId === id ? gateways[0].id : state.activeGatewayId;
          return {
            gateways,
            activeGatewayId,
            config: deriveConfig(gateways, activeGatewayId),
            status: state.activeGatewayId === id ? 'disconnected' as ConnectionStatus : state.status,
            error: state.activeGatewayId === id ? null : state.error,
          };
        }),

      updateGateway: (id, updates) =>
        set((state) => {
          const gateways = state.gateways.map((g) => (g.id === id ? { ...g, ...updates } : g));
          return {
            gateways,
            config: deriveConfig(gateways, state.activeGatewayId),
          };
        }),

      setActiveGateway: (id) =>
        set((state) => {
          if (!state.gateways.find((g) => g.id === id)) return state;
          return {
            activeGatewayId: id,
            config: deriveConfig(state.gateways, id),
            status: 'disconnected' as ConnectionStatus,
            error: null,
          };
        }),

      // Legacy setters
      setStatus: (status) => set({ status, error: status === 'error' ? 'Connection failed' : null }),

      setConfig: (configUpdate) =>
        set((state) => {
          const gateways = state.gateways.map((g) => {
            if (g.id !== state.activeGatewayId) return g;
            return {
              ...g,
              ...(configUpdate.url !== undefined ? { url: configUpdate.url } : {}),
              ...(configUpdate.token !== undefined ? { token: configUpdate.token } : {}),
            };
          });
          return {
            gateways,
            config: deriveConfig(gateways, state.activeGatewayId),
          };
        }),

      setError: (error) => set({ error }),
      setLastConnectedAt: (timestamp) => set({ lastConnectedAt: timestamp }),
    }),
    {
      name: 'openclaw-connections',
      // NOTE: Gateway tokens are intentionally persisted to localStorage so users
      // can auto-reconnect across page reloads without re-entering credentials.
      // This is a deliberate UX trade-off. Tokens stored here are gateway-scoped
      // (not user auth tokens) and only accessible to same-origin scripts.
      partialize: (state) => ({
        gateways: state.gateways,
        activeGatewayId: state.activeGatewayId,
      }),
      // When rehydrating from localStorage, ensure the default gateway URL
      // matches the env var. This handles deploy changes (e.g. local → Vercel)
      // without requiring users to clear their browser storage.
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<ConnectionState>) };
        const envUrl = process.env.NEXT_PUBLIC_GATEWAY_URL;
        const envToken = process.env.NEXT_PUBLIC_GATEWAY_TOKEN;
        if (envUrl || envToken) {
          state.gateways = state.gateways.map((g) =>
            g.id === 'default'
              ? { ...g, ...(envUrl ? { url: envUrl } : {}), ...(envToken ? { token: envToken } : {}) }
              : g,
          );
        }
        state.config = deriveConfig(state.gateways, state.activeGatewayId);
        return state;
      },
    }
  )
);
