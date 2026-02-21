'use client';

import { useGatewayContext } from '@/providers/gateway-provider';
import { useConnectionStore } from '@/stores/connection-store';

export function useGateway() {
  const { client, connect, disconnect } = useGatewayContext();
  const status = useConnectionStore((s) => s.status);
  const config = useConnectionStore((s) => s.config);
  const error = useConnectionStore((s) => s.error);

  return {
    client,
    status,
    config,
    error,
    connect,
    disconnect,
    isConnected: status === 'connected',
  };
}
