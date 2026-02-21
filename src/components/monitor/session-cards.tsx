'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import { mockSessions } from '@/lib/mock-data';
import { Clock, Coins, MessageSquare, Wrench } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SessionCards() {
  const activeSessions = mockSessions.filter((s) => s.status === 'active');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Active Sessions ({activeSessions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeSessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No active sessions</p>
          )}
          {activeSessions.map((session) => (
            <div key={session.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status="active" />
                  <span className="font-medium text-sm">{session.agentName}</span>
                </div>
                <Badge variant="outline" className="text-xs">{session.channel}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(session.startedAt)}
                </div>
                <div className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {(session.tokenUsage.total / 1000).toFixed(1)}k
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {session.messageCount}
                </div>
                <div className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  {session.toolCallCount}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{session.model}</span>
                <span className="text-xs font-medium">${session.cost.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
