'use client';

import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusDot } from '@/components/shared/status-dot';
import { useConnectionStore } from '@/stores/connection-store';
import { useGatewayContext } from '@/providers/gateway-provider';

export function ConnectionStatus() {
  const status = useConnectionStore((s) => s.status);
  const config = useConnectionStore((s) => s.config);
  const { connect, disconnect } = useGatewayContext();

  const statusLabels: Record<string, string> = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    reconnecting: 'Reconnecting...',
    error: 'Connection Error',
  };

  const dotStatus = status === 'connected' ? 'connected'
    : status === 'connecting' || status === 'reconnecting' ? 'connecting'
    : status === 'error' ? 'error'
    : 'disconnected';

  return (
    <div role="status" aria-live="polite" className="inline-flex">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-xs"
            onClick={status === 'connected' ? disconnect : connect}
            aria-label={`Gateway ${statusLabels[status] || status}. Click to ${status === 'connected' ? 'disconnect' : 'connect'}.`}
          >
            <StatusDot status={dotStatus} size="sm" label={false} />
            <span className="hidden sm:inline">{statusLabels[status] || status}</span>
            {(status === 'connecting' || status === 'reconnecting') && (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            )}
            {status === 'connected' ? (
              <Wifi className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusLabels[status]}</p>
          <p className="text-xs text-muted-foreground">{config.url}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
