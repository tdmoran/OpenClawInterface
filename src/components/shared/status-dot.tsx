'use client';

import { cn } from '@/lib/utils';

type StatusVariant = 'healthy' | 'connected' | 'active' | 'idle' | 'thinking' | 'responding' | 'tool_calling' |
  'degraded' | 'warning' | 'reconnecting' | 'connecting' |
  'down' | 'disconnected' | 'error' | 'offline' |
  'completed' | 'pending' | 'processing' | 'failed' | 'timeout';

const colorMap: Record<StatusVariant, string> = {
  healthy: 'bg-emerald-500',
  connected: 'bg-emerald-500',
  active: 'bg-emerald-500',
  idle: 'bg-slate-400',
  thinking: 'bg-blue-500',
  responding: 'bg-blue-500',
  tool_calling: 'bg-violet-500',
  degraded: 'bg-amber-500',
  warning: 'bg-amber-500',
  reconnecting: 'bg-amber-500',
  connecting: 'bg-amber-500',
  down: 'bg-red-500',
  disconnected: 'bg-slate-400',
  error: 'bg-red-500',
  offline: 'bg-slate-400',
  completed: 'bg-emerald-500',
  pending: 'bg-slate-400',
  processing: 'bg-blue-500',
  failed: 'bg-red-500',
  timeout: 'bg-amber-500',
};

const pulseStatuses = new Set<StatusVariant>([
  'active', 'thinking', 'responding', 'tool_calling', 'connecting', 'reconnecting', 'processing',
]);

interface StatusDotProps {
  status: StatusVariant;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'h-2 w-2', md: 'h-2.5 w-2.5', lg: 'h-3 w-3' };

export function StatusDot({ status, className, size = 'md' }: StatusDotProps) {
  return (
    <span className={cn('relative inline-flex', sizeMap[size], className)}>
      {pulseStatuses.has(status) && (
        <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', colorMap[status])} />
      )}
      <span className={cn('relative inline-flex rounded-full', sizeMap[size], colorMap[status])} />
    </span>
  );
}
