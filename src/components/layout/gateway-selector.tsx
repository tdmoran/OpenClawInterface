'use client';

import { ChevronDown, Server, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusDot } from '@/components/shared/status-dot';
import { useConnectionStore } from '@/stores/connection-store';

export function GatewaySelector() {
  const gateways = useConnectionStore((s) => s.gateways);
  const activeGatewayId = useConnectionStore((s) => s.activeGatewayId);
  const status = useConnectionStore((s) => s.status);
  const setActiveGateway = useConnectionStore((s) => s.setActiveGateway);

  const activeGateway = gateways.find((g) => g.id === activeGatewayId);

  // Only show the selector when there are multiple gateways
  if (gateways.length <= 1) {
    return null;
  }

  const dotStatus =
    status === 'connected'
      ? 'connected'
      : status === 'connecting' || status === 'reconnecting'
        ? 'connecting'
        : status === 'error'
          ? 'error'
          : 'disconnected';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs max-w-[160px]">
          <Server className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline truncate">
            {activeGateway?.name || 'Gateway'}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Gateways</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {gateways.map((gateway) => {
          const isActive = gateway.id === activeGatewayId;
          return (
            <DropdownMenuItem
              key={gateway.id}
              onClick={() => {
                if (!isActive) {
                  setActiveGateway(gateway.id);
                }
              }}
              className="gap-2"
            >
              <StatusDot
                status={isActive ? dotStatus : 'disconnected'}
                size="sm"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm truncate">{gateway.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {gateway.url}
                </span>
              </div>
              {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
