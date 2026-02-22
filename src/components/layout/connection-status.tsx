'use client';

import { Wifi, WifiOff, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusDot } from '@/components/shared/status-dot';
import { useConnectionStore } from '@/stores/connection-store';
import { useGatewayContext } from '@/providers/gateway-provider';

export function ConnectionStatus() {
  const status = useConnectionStore((s) => s.status);
  const config = useConnectionStore((s) => s.config);
  const { connect, disconnect, retryConnection } = useGatewayContext();

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

  const handleClick = () => {
    if (status === 'connected') {
      disconnect();
    } else if (status === 'error') {
      retryConnection();
    } else {
      connect();
    }
  };

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-xs"
            onClick={handleClick}
            aria-label={`Gateway ${statusLabels[status] || status}. Click to ${status === 'connected' ? 'disconnect' : status === 'error' ? 'retry' : 'connect'}.`}
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
          {status === 'error' && (
            <p className="text-xs text-muted-foreground">Click to retry</p>
          )}
        </TooltipContent>
      </Tooltip>
      {status === 'error' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={retryConnection}
              aria-label="Retry gateway connection"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Retry</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Retry connection</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
