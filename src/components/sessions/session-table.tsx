'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/shared/status-dot';
import { mockSessions } from '@/lib/mock-data';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  error: 'destructive',
  timeout: 'outline',
};

type SortField = 'agent' | 'channel' | 'status' | 'tokens' | 'cost' | 'date';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'completed' | 'error' | 'timeout';
type DateRange = 'all' | 'today' | '7d' | '30d';

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Error', value: 'error' },
  { label: 'Timeout', value: 'timeout' },
];

const dateRanges: { label: string; value: DateRange }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

function getDateCutoff(range: DateRange): number {
  const now = Date.now();
  switch (range) {
    case 'today': return now - 86400000;
    case '7d': return now - 86400000 * 7;
    case '30d': return now - 86400000 * 30;
    default: return 0;
  }
}

function SortableHead({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = field === currentField;
  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:text-foreground transition-colors', className)}
      onClick={() => onSort(field)}
    >
      <div className={cn('flex items-center gap-1', className?.includes('text-right') && 'justify-end')}>
        {label}
        {isActive ? (
          currentDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

export function SessionTable() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const processed = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);

    let result = mockSessions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (s.startedAt < cutoff) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.agentName.toLowerCase().includes(q) ||
          s.channel.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.model.toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'agent': cmp = a.agentName.localeCompare(b.agentName); break;
        case 'channel': cmp = a.channel.localeCompare(b.channel); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'tokens': cmp = a.tokenUsage.total - b.tokenUsage.total; break;
        case 'cost': cmp = a.cost - b.cost; break;
        case 'date': cmp = a.startedAt - b.startedAt; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [search, sortField, sortDir, statusFilter, dateRange]);

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter tabs */}
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Date range pills */}
        <div className="flex gap-1">
          {dateRanges.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                r.value === dateRange
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Search (right-aligned) */}
        <div className="relative ml-auto max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sessions..." className="pl-8 h-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <SortableHead label="Agent" field="agent" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Channel" field="channel" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortableHead label="Status" field="status" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <TableHead>Model</TableHead>
              <SortableHead label="Tokens" field="tokens" currentField={sortField} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="Cost" field="cost" currentField={sortField} currentDir={sortDir} onSort={handleSort} className="text-right" />
              <SortableHead label="Started" field="date" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {processed.map((session) => (
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
            {processed.length === 0 && (
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
