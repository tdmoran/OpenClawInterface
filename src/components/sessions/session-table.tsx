'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatusDot } from '@/components/shared/status-dot';
import { mockSessions } from '@/lib/mock-data';
import { Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  error: 'destructive',
  timeout: 'outline',
};

export function SessionTable() {
  const [search, setSearch] = useState('');

  const filtered = mockSessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.agentName.toLowerCase().includes(q) ||
      s.channel.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search sessions..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((session) => (
              <TableRow key={session.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/sessions/${session.id}`} className="font-mono text-xs text-primary hover:underline">
                    {session.id}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{session.agentName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{session.channel}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={session.status} size="sm" />
                    <Badge variant={statusVariant[session.status]} className="text-xs">{session.status}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{session.model}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {(session.tokenUsage.total / 1000).toFixed(1)}k
                </TableCell>
                <TableCell className="text-right font-mono text-xs">${session.cost.toFixed(3)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(session.startedAt, { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No sessions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
