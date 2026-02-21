'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusDot } from '@/components/shared/status-dot';
import type { StatusVariant } from '@/components/shared/status-dot';
import { Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useCodeMonitorActions } from '@/hooks/use-code-monitor-actions';
import type { Machine, CodeCommand, CommandStatus } from '@/types/code-monitor';

interface CommandPanelProps {
  machines: Machine[];
  commands: CodeCommand[];
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const commandStatusMap: Record<CommandStatus, StatusVariant> = {
  pending: 'pending',
  dispatched: 'warning',
  running: 'processing',
  completed: 'completed',
  error: 'error',
};

export function CommandPanel({ machines, commands }: CommandPanelProps) {
  const [instruction, setInstruction] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [expandedCommandId, setExpandedCommandId] = useState<string | null>(null);
  const { sendCommand, isLoading, error } = useCodeMonitorActions();

  const availableMachines = machines.filter((m) => m.status !== 'offline');

  const handleSend = async () => {
    if (!instruction.trim() || !selectedMachineId) return;
    await sendCommand(selectedMachineId, instruction.trim());
    setInstruction('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Command Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input area */}
        <div className="space-y-2">
          <Select
            value={selectedMachineId}
            onValueChange={setSelectedMachineId}
            disabled={availableMachines.length === 0}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select machine..." />
            </SelectTrigger>
            <SelectContent>
              {availableMachines.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.name} ({m.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder={
              availableMachines.length === 0
                ? 'No machines available...'
                : 'Enter instruction for Claude Code...'
            }
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={availableMachines.length === 0}
          />

          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleSend}
            disabled={!instruction.trim() || !selectedMachineId || isLoading || availableMachines.length === 0}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {isLoading ? 'Sending...' : 'Send Command'}
          </Button>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        {/* Command history */}
        {commands.length > 0 && (
          <div className="space-y-1 border-t pt-3">
            <p className="text-xs text-muted-foreground font-medium mb-2">History</p>
            {commands.slice(0, 20).map((cmd) => (
              <div key={cmd.id} className="space-y-1">
                <button
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    setExpandedCommandId(
                      expandedCommandId === cmd.id ? null : cmd.id
                    )
                  }
                >
                  <StatusDot
                    status={commandStatusMap[cmd.status]}
                    size="sm"
                  />
                  <span className="flex-1 text-xs truncate">{cmd.instruction}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatRelativeTime(cmd.createdAt)}
                  </span>
                  {(cmd.result || cmd.error) && (
                    expandedCommandId === cmd.id ? (
                      <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    )
                  )}
                </button>

                {expandedCommandId === cmd.id && (cmd.result || cmd.error) && (
                  <div className="ml-4 mr-2">
                    <pre className="text-[10px] bg-muted p-2 rounded-md overflow-x-auto whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                      {cmd.error ? (
                        <span className="text-red-500">{cmd.error}</span>
                      ) : (
                        cmd.result
                      )}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
