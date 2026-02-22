import { create } from 'zustand';
import type { ConnectionStatus, GatewayConfig } from '@/types/gateway';

interface ConnectionState {
  status: ConnectionStatus;
  config: GatewayConfig;
  lastConnectedAt: number | null;
  error: string | null;
  setStatus: (status: ConnectionStatus) => void;
  setConfig: (config: Partial<GatewayConfig>) => void;
  setError: (error: string | null) => void;
  setLastConnectedAt: (timestamp: number) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  config: {
    url: process.env.NEXT_PUBLIC_GATEWAY_URL || 'ws://localhost:18789',
    token: process.env.NEXT_PUBLIC_GATEWAY_TOKEN || '',
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  },
  lastConnectedAt: null,
  error: null,
  setStatus: (status) => set({ status, error: status === 'error' ? 'Connection failed' : null }),
  setConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),
  setError: (error) => set({ error }),
  setLastConnectedAt: (timestamp) => set({ lastConnectedAt: timestamp }),
}));
