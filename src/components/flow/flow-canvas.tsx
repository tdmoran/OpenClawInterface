'use client';

import { useCallback, useState, useMemo } from 'react';
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
import { X, Server, Radio, Bot, Wrench, MessageSquare, Users } from 'lucide-react';
import { useGatewayDataStore, type HealthData, type ServerInfo } from '@/stores/gateway-data-store';
import { useConnectionStore } from '@/stores/connection-store';
import { useModels, type ModelInfo } from '@/hooks/use-models';

interface BaseNodeData {
  label: string;
  subtitle?: string;
  status?: string;
  phase?: string;
  [key: string]: unknown;
}

function buildLiveNodes(health: HealthData, server: ServerInfo | null, models: ModelInfo[]): Node[] {
  const nodes: Node[] = [];

  // Channel nodes (left column)
  health.channelOrder.forEach((key, i) => {
    const ch = health.channels[key];
    nodes.push({
      id: `ch-${key}`,
      type: 'channel',
      position: { x: 0, y: 50 + i * 120 },
      data: {
        label: ch?.label || key,
        subtitle: ch?.probe?.bot?.username || key,
        status: ch?.running ? 'connected' : 'disconnected',
      },
    });
  });

  // Gateway node (center-left)
  const totalHeight = Math.max(models.length, health.channelOrder.length) * 100;
  const gwY = Math.max(50, totalHeight / 2 - 30);
  nodes.push({
    id: 'gateway',
    type: 'gateway',
    position: { x: 250, y: gwY },
    data: {
      label: 'Gateway',
      subtitle: server?.version || 'dev',
      status: health.ok ? 'healthy' : 'error',
    },
  });

  // Clawkins agent node (center)
  nodes.push({
    id: 'agent-main',
    type: 'agent',
    position: { x: 500, y: gwY },
    data: {
      label: 'Clawkins',
      subtitle: `${health.agents[0]?.sessions.count || 0} sessions`,
      status: 'idle',
      phase: null,
    },
  });

  // Model nodes (right column) — one per available model
  const modelSpacing = 90;
  const modelsStartY = Math.max(0, gwY - (models.length * modelSpacing) / 2 + modelSpacing / 2);
  models.forEach((model, i) => {
    const provider = model.id.split('/')[0];
    const name = model.alias || model.id.split('/').pop() || model.id;
    nodes.push({
      id: `model-${model.id}`,
      type: 'tool',
      position: { x: 800, y: modelsStartY + i * modelSpacing },
      data: {
        label: name,
        subtitle: provider,
        status: model.isPrimary ? 'processing' : 'idle',
      },
    });
  });

  // Response node (far right)
  nodes.push({
    id: 'response',
    type: 'response',
    position: { x: 1100, y: gwY },
    data: { label: 'Response', subtitle: 'User Output' },
  });

  return nodes;
}

function buildLiveEdges(health: HealthData, models: ModelInfo[]): Edge[] {
  const edges: Edge[] = [];
  const labelStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 };
  const labelBgStyle = { fill: 'hsl(var(--card))', fillOpacity: 0.9 };

  // Channel → Gateway
  health.channelOrder.forEach((key) => {
    const ch = health.channels[key];
    const connected = ch?.running;
    edges.push({
      id: `e-${key}-gw`,
      source: `ch-${key}`,
      target: 'gateway',
      animated: !!connected,
      style: { stroke: connected ? '#10b981' : '#94a3b8', strokeDasharray: connected ? undefined : '5,5' },
      ...(connected ? { label: ch?.label || key, labelStyle, labelBgStyle } : {}),
    });
  });

  // Gateway → Agents
  health.agents.forEach((agent) => {
    edges.push({
      id: `e-gw-${agent.agentId}`,
      source: 'gateway',
      target: `agent-${agent.agentId}`,
      animated: true,
      style: { stroke: '#8b5cf6' },
      label: `${agent.sessions.count} sessions`,
      labelStyle,
      labelBgStyle,
    });
  });

  // Agent → Models
  models.forEach((model) => {
    edges.push({
      id: `e-agent-model-${model.id}`,
      source: 'agent-main',
      target: `model-${model.id}`,
      animated: model.isPrimary,
      style: {
        stroke: model.isPrimary ? '#f59e0b' : '#94a3b8',
        strokeDasharray: model.isPrimary ? undefined : '5,5',
      },
      ...(model.isPrimary ? { label: 'primary', labelStyle, labelBgStyle } : {}),
      ...(model.isFallback ? { label: 'fallback', labelStyle, labelBgStyle } : {}),
    });
  });

  // Models → Response
  models.forEach((model) => {
    edges.push({
      id: `e-model-resp-${model.id}`,
      source: `model-${model.id}`,
      target: 'response',
      animated: false,
      style: { stroke: '#ec4899', strokeDasharray: '5,5' },
    });
  });

  return edges;
}

// Fallback mock nodes/edges when disconnected
const mockNodes: Node[] = [
  { id: 'ch-telegram', type: 'channel', position: { x: 0, y: 100 }, data: { label: 'Telegram', subtitle: 'Clawkins_bot', status: 'disconnected' } },
  { id: 'gateway', type: 'gateway', position: { x: 280, y: 100 }, data: { label: 'Gateway', subtitle: 'dev', status: 'disconnected' } },
  { id: 'agent-main', type: 'agent', position: { x: 560, y: 100 }, data: { label: 'Clawkins', subtitle: 'moonshot/kimi-k2.5', status: 'offline', phase: null } },
  { id: 'response', type: 'response', position: { x: 840, y: 100 }, data: { label: 'Response', subtitle: 'User Output' } },
];

const mockEdges: Edge[] = [
  { id: 'e-tg-gw', source: 'ch-telegram', target: 'gateway', animated: false, style: { stroke: '#94a3b8', strokeDasharray: '5,5' } },
  { id: 'e-gw-main', source: 'gateway', target: 'agent-main', animated: false, style: { stroke: '#8b5cf6' } },
  { id: 'e-main-resp', source: 'agent-main', target: 'response', animated: false, style: { stroke: '#ec4899' } },
];

const legendNodes = [
  { icon: Server, color: 'bg-blue-500', label: 'Gateway' },
  { icon: Radio, color: 'bg-emerald-500', label: 'Channel' },
  { icon: Bot, color: 'bg-violet-500', label: 'Agent' },
  { icon: Wrench, color: 'bg-amber-500', label: 'Model' },
  { icon: MessageSquare, color: 'bg-pink-500', label: 'Response' },
];

const legendEdges = [
  { color: '#10b981', label: 'Channel flow' },
  { color: '#8b5cf6', label: 'Agent routing' },
  { color: '#f59e0b', label: 'Model routing' },
  { color: '#ec4899', label: 'Response' },
];

const typeBadgeColors: Record<string, string> = {
  gateway: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  channel: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  agent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  tool: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  response: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
};

function AgentDetailPanel({ agentId, health }: { agentId: string; health: HealthData }) {
  const agent = health.agents.find((a) => a.agentId === (agentId.replace('agent-', '')));
  if (!agent) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Sessions</p>
          <p className="text-sm font-bold">{agent.sessions.count}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Default</p>
          <p className="text-sm font-bold">{agent.isDefault ? 'Yes' : 'No'}</p>
        </div>
        {agent.heartbeat && (
          <>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground">Heartbeat</p>
              <p className="text-sm font-bold">{agent.heartbeat.enabled ? 'On' : 'Off'}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-[10px] text-muted-foreground">Interval</p>
              <p className="text-sm font-bold">{agent.heartbeat.every}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChannelDetailPanel({ channelKey, health }: { channelKey: string; health: HealthData }) {
  const ch = health.channels[channelKey];
  if (!ch) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Status</p>
          <div className="flex items-center gap-1 mt-0.5">
            <StatusDot status={ch.running ? 'connected' : 'disconnected'} size="sm" />
            <p className="text-sm font-medium">{ch.running ? 'Running' : 'Stopped'}</p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Configured</p>
          <p className="text-sm font-bold">{ch.configured ? 'Yes' : 'No'}</p>
        </div>
      </div>
      {ch.probe?.bot?.username && (
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Bot</p>
          <p className="text-sm font-medium">@{ch.probe.bot.username}</p>
        </div>
      )}
    </div>
  );
}

function GatewayDetailPanel({ health, server, presenceCount }: {
  health: HealthData;
  server: ServerInfo | null;
  presenceCount: number;
}) {
  const uptimeHours = Math.floor(health.uptimeMs / 3600000);
  const uptimeMin = Math.floor((health.uptimeMs % 3600000) / 60000);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Status</p>
          <div className="flex items-center gap-1 mt-0.5">
            <StatusDot status={health.ok ? 'connected' : 'error'} size="sm" />
            <p className="text-sm font-medium">{health.ok ? 'Healthy' : 'Error'}</p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Latency</p>
          <p className="text-sm font-bold">{health.durationMs}ms</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Version</p>
          <p className="text-sm font-medium">{server?.version || 'unknown'}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Uptime</p>
          <p className="text-sm font-bold">{uptimeHours}h {uptimeMin}m</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Host</p>
          <p className="text-sm font-medium truncate">{server?.host || '—'}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Connected</p>
          <p className="text-sm font-bold">{presenceCount} clients</p>
        </div>
      </div>
    </div>
  );
}

function ModelDetailPanel({ nodeId, models }: { nodeId: string; models: ModelInfo[] }) {
  const modelId = nodeId.replace('model-', '');
  const model = models.find((m) => m.id === modelId);
  if (!model) return null;
  const provider = model.id.split('/')[0];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Provider</p>
          <p className="text-sm font-bold capitalize">{provider}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Role</p>
          <p className="text-sm font-bold">
            {model.isPrimary ? 'Primary' : model.isFallback ? 'Fallback' : 'Available'}
          </p>
        </div>
      </div>
      <div className="rounded-lg bg-muted/50 p-2">
        <p className="text-[10px] text-muted-foreground">Model ID</p>
        <p className="text-xs font-mono break-all">{model.id}</p>
      </div>
      {model.alias && (
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Alias</p>
          <p className="text-sm font-medium">{model.alias}</p>
        </div>
      )}
    </div>
  );
}

export function FlowCanvas() {
  const connectionStatus = useConnectionStore((s) => s.status);
  const { health, server, presence } = useGatewayDataStore();
  const { models: modelsConfig } = useModels();
  const isConnected = connectionStatus === 'connected' && health !== null;

  const liveNodes = useMemo(() => {
    if (!isConnected) return mockNodes;
    return buildLiveNodes(health, server, modelsConfig);
  }, [isConnected, health, server, modelsConfig]);

  const liveEdges = useMemo(() => {
    if (!isConnected) return mockEdges;
    return buildLiveEdges(health, modelsConfig);
  }, [isConnected, health, modelsConfig]);

  const [nodes, , onNodesChange] = useNodesState(liveNodes);
  const [edges, , onEdgesChange] = useEdgesState(liveEdges);
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
              {selectedNode.type === 'agent' && isConnected && (
                <AgentDetailPanel agentId={selectedNode.id} health={health} />
              )}
              {selectedNode.type === 'channel' && isConnected && (
                <ChannelDetailPanel channelKey={selectedNode.id.replace('ch-', '')} health={health} />
              )}
              {selectedNode.type === 'gateway' && isConnected && (
                <GatewayDetailPanel health={health} server={server} presenceCount={presence.filter(p => p.reason === 'connect').length} />
              )}
              {selectedNode.type === 'tool' && selectedNode.id.startsWith('model-') && (
                <ModelDetailPanel nodeId={selectedNode.id} models={modelsConfig} />
              )}

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
        {isConnected && (
          <>
            <span className="ml-auto" />
            <Badge variant="outline" className="text-[10px] gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </Badge>
          </>
        )}
      </div>
    </div>
  );
}
