'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusDot } from '@/components/shared/status-dot';
import type { StatusVariant } from '@/components/shared/status-dot';
import { FileText, Wrench, Clock } from 'lucide-react';
import type { CodeSession } from '@/types/code-monitor';

interface SessionOverviewProps {
  sessions: CodeSession[];
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatElapsedTime(startedAt: number): string {
  const diff = Math.floor((Date.now() - startedAt) / 1000);
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const sessionStatusMap: Record<string, StatusVariant> = {
  active: 'active',
  idle: 'idle',
  completed: 'completed',
  error: 'error',
};

export function SessionOverview({ sessions }: SessionOverviewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="bg-muted/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={sessionStatusMap[session.status] || 'idle'} />
                    <span className="text-sm font-medium">{session.machineName}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {session.status}
                  </span>
                </div>

                <p className="font-mono text-xs text-muted-foreground truncate" title={session.projectPath}>
                  {session.projectPath}
                </p>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatElapsedTime(session.startedAt)}</span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span>{session.filesModified} files</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wrench className="h-3 w-3 text-muted-foreground" />
                    <span>{session.toolCalls} tools</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Last activity {formatRelativeTime(session.lastActivityAt)}</span>
                  <span>{session.tokenCount.toLocaleString()} tokens</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
