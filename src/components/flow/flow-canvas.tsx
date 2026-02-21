'use client';

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './custom-nodes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusDot, type StatusVariant } from '@/components/shared/status-dot';
import { X, Server, Radio, Bot, Wrench, MessageSquare } from 'lucide-react';
import { mockAgents, mockHealth } from '@/lib/mock-data';

interface BaseNodeData {
  label: string;
  subtitle?: string;
  status?: string;
  phase?: string;
  [key: string]: unknown;
}

const initialNodes: Node[] = [
  { id: 'ch-cli', type: 'channel', position: { x: 0, y: 50 }, data: { label: 'CLI', subtitle: 'Terminal', status: 'connected' } },
  { id: 'ch-discord', type: 'channel', position: { x: 0, y: 170 }, data: { label: 'Discord', subtitle: 'Bot', status: 'connected' } },
  { id: 'ch-api', type: 'channel', position: { x: 0, y: 290 }, data: { label: 'API', subtitle: 'REST', status: 'connected' } },
  { id: 'ch-slack', type: 'channel', position: { x: 0, y: 410 }, data: { label: 'Slack', subtitle: 'Bot', status: 'disconnected' } },
  { id: 'gateway', type: 'gateway', position: { x: 280, y: 200 }, data: { label: 'Gateway', subtitle: 'v0.4.2', status: 'healthy' } },
  { id: 'agent-1', type: 'agent', position: { x: 560, y: 80 }, data: { label: 'CodeAssist', subtitle: 'claude-sonnet-4-6', status: 'idle', phase: null } },
  { id: 'agent-2', type: 'agent', position: { x: 560, y: 250 }, data: { label: 'ResearchBot', subtitle: 'claude-opus-4-6', status: 'thinking', phase: 'reasoning' } },
  { id: 'agent-3', type: 'agent', position: { x: 560, y: 420 }, data: { label: 'DevOps', subtitle: 'claude-haiku-4-5', status: 'offline', phase: null } },
  { id: 'tool-edit', type: 'tool', position: { x: 840, y: 40 }, data: { label: 'code-edit', subtitle: 'File Editor', status: 'idle' } },
  { id: 'tool-search', type: 'tool', position: { x: 840, y: 160 }, data: { label: 'web-search', subtitle: 'Search API', status: 'processing' } },
  { id: 'tool-git', type: 'tool', position: { x: 840, y: 280 }, data: { label: 'git-ops', subtitle: 'Git', status: 'idle' } },
  { id: 'tool-docker', type: 'tool', position: { x: 840, y: 400 }, data: { label: 'docker', subtitle: 'Container', status: 'idle' } },
  { id: 'response', type: 'response', position: { x: 1100, y: 200 }, data: { label: 'Response', subtitle: 'User Output' } },
];

const labelStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 };
const labelBgStyle = { fill: 'hsl(var(--card))', fillOpacity: 0.9 };

const initialEdges: Edge[] = [
  { id: 'e-cli-gw', source: 'ch-cli', target: 'gateway', animated: true, style: { stroke: '#10b981' }, label: '2.4 msg/s', labelStyle, labelBgStyle },
  { id: 'e-disc-gw', source: 'ch-discord', target: 'gateway', animated: true, style: { stroke: '#10b981' }, label: '0.8 msg/s', labelStyle, labelBgStyle },
  { id: 'e-api-gw', source: 'ch-api', target: 'gateway', animated: true, style: { stroke: '#10b981' }, label: '5.2 msg/s', labelStyle, labelBgStyle },
  { id: 'e-slack-gw', source: 'ch-slack', target: 'gateway', animated: false, style: { stroke: '#94a3b8', strokeDasharray: '5,5' } },
  { id: 'e-gw-a1', source: 'gateway', target: 'agent-1', animated: false, style: { stroke: '#8b5cf6' } },
  { id: 'e-gw-a2', source: 'gateway', target: 'agent-2', animated: true, style: { stroke: '#8b5cf6' }, label: '1.2k tokens', labelStyle, labelBgStyle },
  { id: 'e-gw-a3', source: 'gateway', target: 'agent-3', animated: false, style: { stroke: '#8b5cf6' } },
  { id: 'e-a1-edit', source: 'agent-1', target: 'tool-edit', animated: false, style: { stroke: '#f59e0b' } },
  { id: 'e-a2-search', source: 'agent-2', target: 'tool-search', animated: true, style: { stroke: '#f59e0b' }, label: 'querying', labelStyle, labelBgStyle },
  { id: 'e-a1-git', source: 'agent-1', target: 'tool-git', animated: false, style: { stroke: '#f59e0b' } },
  { id: 'e-a3-docker', source: 'agent-3', target: 'tool-docker', animated: false, style: { stroke: '#f59e0b' } },
  { id: 'e-edit-resp', source: 'tool-edit', target: 'response', animated: false, style: { stroke: '#ec4899' } },
  { id: 'e-search-resp', source: 'tool-search', target: 'response', animated: true, style: { stroke: '#ec4899' } },
  { id: 'e-git-resp', source: 'tool-git', target: 'response', animated: false, style: { stroke: '#ec4899' } },
  { id: 'e-docker-resp', source: 'tool-docker', target: 'response', animated: false, style: { stroke: '#ec4899' } },
];

const legendNodes = [
  { icon: Server, color: 'bg-blue-500', label: 'Gateway' },
  { icon: Radio, color: 'bg-emerald-500', label: 'Channel' },
  { icon: Bot, color: 'bg-violet-500', label: 'Agent' },
  { icon: Wrench, color: 'bg-amber-500', label: 'Tool' },
  { icon: MessageSquare, color: 'bg-pink-500', label: 'Response' },
];

const legendEdges = [
  { color: '#10b981', label: 'Channel flow' },
  { color: '#8b5cf6', label: 'Agent routing' },
  { color: '#f59e0b', label: 'Tool call' },
  { color: '#ec4899', label: 'Response' },
];

function AgentDetailPanel({ nodeId }: { nodeId: string }) {
  const agent = mockAgents.find((a) => a.id === nodeId);
  if (!agent) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Sessions</p>
          <p className="text-sm font-bold">{agent.stats.totalSessions}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Tokens</p>
          <p className="text-sm font-bold">{(agent.stats.totalTokens / 1000000).toFixed(1)}M</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Cost</p>
          <p className="text-sm font-bold">${agent.stats.totalCost.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Avg Response</p>
          <p className="text-sm font-bold">{agent.stats.avgResponseTime}s</p>
        </div>
      </div>
      {agent.skills.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Skills</p>
          <div className="flex flex-wrap gap-1">
            {agent.skills.map((s) => (
              <Badge key={s.id} variant="secondary" className="text-[10px]">{s.name}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelDetailPanel({ nodeName }: { nodeName: string }) {
  const channel = mockHealth.channels.find((c) => c.name === nodeName);
  if (!channel) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Status</p>
          <div className="flex items-center gap-1 mt-0.5">
            <StatusDot status={channel.status} size="sm" />
            <p className="text-sm font-medium">{channel.status}</p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Message Rate</p>
          <p className="text-sm font-bold">{channel.messageRate} msg/s</p>
        </div>
      </div>
      <div className="rounded-lg bg-muted/50 p-2">
        <p className="text-[10px] text-muted-foreground">Type</p>
        <p className="text-sm font-medium">{channel.type}</p>
      </div>
    </div>
  );
}

function GatewayDetailPanel() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Status</p>
          <div className="flex items-center gap-1 mt-0.5">
            <StatusDot status={mockHealth.gateway.status} size="sm" />
            <p className="text-sm font-medium">{mockHealth.gateway.status}</p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Latency</p>
          <p className="text-sm font-bold">{mockHealth.gateway.latency}ms</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Version</p>
          <p className="text-sm font-medium">{mockHealth.gateway.version}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Queue</p>
          <p className="text-sm font-bold">{mockHealth.queue.pending + mockHealth.queue.processing} active</p>
        </div>
      </div>
    </div>
  );
}

function ToolDetailPanel({ nodeName }: { nodeName: string }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/50 p-2">
        <p className="text-[10px] text-muted-foreground">Tool Name</p>
        <p className="text-sm font-medium font-mono">{nodeName}</p>
      </div>
      <div className="rounded-lg bg-muted/50 p-2">
        <p className="text-[10px] text-muted-foreground">Source</p>
        <p className="text-sm font-medium">local</p>
      </div>
    </div>
  );
}

const typeBadgeColors: Record<string, string> = {
  gateway: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  channel: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  agent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  tool: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  response: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
};

export function FlowCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const nodeData = selectedNode?.data as BaseNodeData | undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[calc(100vh-10rem)] w-full rounded-lg border bg-card">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={1.5}
          className="bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
          <Controls className="!bg-card !border-border !shadow-sm" />
          <MiniMap className="!bg-card !border-border" nodeStrokeColor="#666" nodeColor="#333" />
        </ReactFlow>

        {/* Detail Panel */}
        {selectedNode && nodeData && (
          <div className="absolute right-0 top-0 h-full w-80 border-l bg-card p-4 shadow-lg overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Node Details</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedNode(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {/* Common header */}
              <div className="flex items-center gap-2">
                <Badge className={typeBadgeColors[selectedNode.type || ''] || ''} variant="outline">
                  {selectedNode.type}
                </Badge>
                <span className="text-sm font-medium">{nodeData.label}</span>
                {nodeData.status && <StatusDot status={nodeData.status as StatusVariant} size="sm" />}
              </div>

              {nodeData.subtitle && (
                <p className="text-xs text-muted-foreground">{nodeData.subtitle}</p>
              )}

              {/* Type-specific panels */}
              {selectedNode.type === 'agent' && <AgentDetailPanel nodeId={selectedNode.id} />}
              {selectedNode.type === 'channel' && <ChannelDetailPanel nodeName={nodeData.label} />}
              {selectedNode.type === 'gateway' && <GatewayDetailPanel />}
              {selectedNode.type === 'tool' && <ToolDetailPanel nodeName={nodeData.label} />}

              {nodeData.phase && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Phase</p>
                  <Badge>{nodeData.phase}</Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend bar */}
      <div className="flex items-center gap-6 rounded-lg border bg-card px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">Nodes:</span>
        {legendNodes.map((n) => {
          const Icon = n.icon;
          return (
            <div key={n.label} className="flex items-center gap-1.5">
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className={`h-2 w-2 rounded-full ${n.color}`} />
              <span className="text-xs text-muted-foreground">{n.label}</span>
            </div>
          );
        })}
        <span className="ml-4 text-xs font-medium text-muted-foreground">Edges:</span>
        {legendEdges.map((e) => (
          <div key={e.label} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: e.color }} />
            <span className="text-xs text-muted-foreground">{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
