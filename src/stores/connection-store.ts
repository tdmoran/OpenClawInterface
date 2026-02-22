import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionStatus, GatewayConfig, GatewayProfile } from '@/types/gateway';

const DEFAULT_GATEWAY: GatewayProfile = {
  id: 'default',
  name: 'Local Gateway',
  url: 'ws://localhost:18789',
  token: '781bbfd298ccd819f0eda7950edb6c4fb7798480b2108c8a',
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
      partialize: (state) => ({
        gateways: state.gateways,
        activeGatewayId: state.activeGatewayId,
      }),
      // Rehydrate: derive config from persisted gateway profiles
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.config = deriveConfig(state.gateways, state.activeGatewayId);
        }
      },
    }
  )
);
