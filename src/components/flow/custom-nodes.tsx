'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/shared/status-dot';
import { Radio, Bot, Wrench, MessageSquare, Server } from 'lucide-react';

interface BaseNodeData {
  label: string;
  status?: string;
  subtitle?: string;
  [key: string]: unknown;
}

function NodeShell({ children, className, selected }: { children: React.ReactNode; className?: string; selected?: boolean }) {
  return (
    <div className={cn(
      'rounded-xl border bg-card px-4 py-3 shadow-sm transition-all min-w-[160px]',
      selected && 'ring-2 ring-primary shadow-md',
      className
    )}>
      {children}
    </div>
  );
}

export const GatewayNode = memo(function GatewayNode({ data, selected }: NodeProps) {
  const nodeData = data as BaseNodeData;
  return (
    <NodeShell selected={selected} className="border-blue-500/50 bg-blue-500/5">
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-blue-500" />
        <div>
          <p className="text-sm font-medium">{nodeData.label}</p>
          <p className="text-xs text-muted-foreground">{nodeData.subtitle || 'Gateway'}</p>
        </div>
        <StatusDot status={(nodeData.status as 'healthy') || 'healthy'} size="sm" />
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </NodeShell>
  );
});

export const ChannelNode = memo(function ChannelNode({ data, selected }: NodeProps) {
  const nodeData = data as BaseNodeData;
  return (
    <NodeShell selected={selected} className="border-emerald-500/50 bg-emerald-500/5">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-emerald-500" />
        <div>
          <p className="text-sm font-medium">{nodeData.label}</p>
          <p className="text-xs text-muted-foreground">{nodeData.subtitle || 'Channel'}</p>
        </div>
        <StatusDot status={(nodeData.status as 'connected') || 'connected'} size="sm" />
      </div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
    </NodeShell>
  );
});

export const AgentNode = memo(function AgentNode({ data, selected }: NodeProps) {
  const nodeData = data as BaseNodeData;
  const phase = nodeData.phase as string | undefined;
  return (
    <NodeShell selected={selected} className="border-violet-500/50 bg-violet-500/5">
      <Handle type="target" position={Position.Left} className="!bg-violet-500" />
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-violet-500" />
        <div>
          <p className="text-sm font-medium">{nodeData.label}</p>
          <p className="text-xs text-muted-foreground">{nodeData.subtitle || 'Agent'}</p>
        </div>
        <StatusDot status={(nodeData.status as 'idle') || 'idle'} size="sm" />
      </div>
      {phase && (
        <div className="mt-2 flex gap-1">
          {['intake', 'reasoning', 'planning', 'execution', 'reflection'].map((p) => (
            <div
              key={p}
              className={cn(
                'h-1.5 flex-1 rounded-full',
                p === phase ? 'bg-violet-500' : 'bg-muted'
              )}
            />
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-violet-500" />
    </NodeShell>
  );
});

export const ToolNode = memo(function ToolNode({ data, selected }: NodeProps) {
  const nodeData = data as BaseNodeData;
  return (
    <NodeShell selected={selected} className="border-amber-500/50 bg-amber-500/5">
      <Handle type="target" position={Position.Left} className="!bg-amber-500" />
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-amber-500" />
        <div>
          <p className="text-sm font-medium">{nodeData.label}</p>
          <p className="text-xs text-muted-foreground">{nodeData.subtitle || 'Tool'}</p>
        </div>
        <StatusDot status={(nodeData.status as 'idle') || 'idle'} size="sm" />
      </div>
      <Handle type="source" position={Position.Right} className="!bg-amber-500" />
    </NodeShell>
  );
});

export const ResponseNode = memo(function ResponseNode({ data, selected }: NodeProps) {
  const nodeData = data as BaseNodeData;
  return (
    <NodeShell selected={selected} className="border-pink-500/50 bg-pink-500/5">
      <Handle type="target" position={Position.Left} className="!bg-pink-500" />
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-pink-500" />
        <div>
          <p className="text-sm font-medium">{nodeData.label}</p>
          <p className="text-xs text-muted-foreground">{nodeData.subtitle || 'Response'}</p>
        </div>
      </div>
    </NodeShell>
  );
});

export const nodeTypes = {
  gateway: GatewayNode,
  channel: ChannelNode,
  agent: AgentNode,
  tool: ToolNode,
  response: ResponseNode,
};
