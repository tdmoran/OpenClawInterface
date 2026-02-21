'use client';

import { useCallback, useMemo } from 'react';
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
import { X } from 'lucide-react';
import { useState } from 'react';

const initialNodes: Node[] = [
  { id: 'ch-cli', type: 'channel', position: { x: 0, y: 50 }, data: { label: 'CLI', subtitle: 'Terminal', status: 'connected' } },
  { id: 'ch-discord', type: 'channel', position: { x: 0, y: 170 }, data: { label: 'Discord', subtitle: 'Bot', status: 'connected' } },
  { id: 'ch-api', type: 'channel', position: { x: 0, y: 290 }, data: { label: 'API', subtitle: 'REST', status: 'connected' } },
  { id: 'ch-slack', type: 'channel', position: { x: 0, y: 410 }, data: { label: 'Slack', subtitle: 'Bot', status: 'disconnected' } },
  { id: 'gateway', type: 'gateway', position: { x: 280, y: 200 }, data: { label: 'Gateway', subtitle: 'v0.4.2', status: 'healthy' } },
  { id: 'agent-1', type: 'agent', position: { x: 560, y: 80 }, data: { label: 'CodeAssist', subtitle: 'claude-sonnet-4-6', status: 'idle', phase: null } },
  { id: 'agent-2', type: 'agent', position: { x: 560, y: 250 }, data: { label: 'ResearchBot', subtitle: 'claude-opus-4-6', status: 'thinking', phase: 'reasoning' } },
  { id: 'agent-3', type: 'agent', position: { x: 560, y: 420 }, data: { label: 'DevOps', subtitle: 'claude-haiku-4-5', status: 'idle', phase: null } },
  { id: 'tool-edit', type: 'tool', position: { x: 840, y: 40 }, data: { label: 'code-edit', subtitle: 'File Editor', status: 'idle' } },
  { id: 'tool-search', type: 'tool', position: { x: 840, y: 160 }, data: { label: 'web-search', subtitle: 'Search API', status: 'processing' } },
  { id: 'tool-git', type: 'tool', position: { x: 840, y: 280 }, data: { label: 'git-ops', subtitle: 'Git', status: 'idle' } },
  { id: 'tool-docker', type: 'tool', position: { x: 840, y: 400 }, data: { label: 'docker', subtitle: 'Container', status: 'idle' } },
  { id: 'response', type: 'response', position: { x: 1100, y: 200 }, data: { label: 'Response', subtitle: 'User Output' } },
];

const initialEdges: Edge[] = [
  { id: 'e-cli-gw', source: 'ch-cli', target: 'gateway', animated: true, style: { stroke: '#10b981' } },
  { id: 'e-disc-gw', source: 'ch-discord', target: 'gateway', animated: true, style: { stroke: '#10b981' } },
  { id: 'e-api-gw', source: 'ch-api', target: 'gateway', animated: true, style: { stroke: '#10b981' } },
  { id: 'e-slack-gw', source: 'ch-slack', target: 'gateway', animated: false, style: { stroke: '#94a3b8', strokeDasharray: '5,5' } },
  { id: 'e-gw-a1', source: 'gateway', target: 'agent-1', animated: false, style: { stroke: '#8b5cf6' } },
  { id: 'e-gw-a2', source: 'gateway', target: 'agent-2', animated: true, style: { stroke: '#8b5cf6' } },
  { id: 'e-gw-a3', source: 'gateway', target: 'agent-3', animated: false, style: { stroke: '#8b5cf6' } },
  { id: 'e-a1-edit', source: 'agent-1', target: 'tool-edit', animated: false, style: { stroke: '#f59e0b' } },
  { id: 'e-a2-search', source: 'agent-2', target: 'tool-search', animated: true, style: { stroke: '#f59e0b' } },
  { id: 'e-a1-git', source: 'agent-1', target: 'tool-git', animated: false, style: { stroke: '#f59e0b' } },
  { id: 'e-a3-docker', source: 'agent-3', target: 'tool-docker', animated: false, style: { stroke: '#f59e0b' } },
  { id: 'e-edit-resp', source: 'tool-edit', target: 'response', animated: false, style: { stroke: '#ec4899' } },
  { id: 'e-search-resp', source: 'tool-search', target: 'response', animated: true, style: { stroke: '#ec4899' } },
  { id: 'e-git-resp', source: 'tool-git', target: 'response', animated: false, style: { stroke: '#ec4899' } },
  { id: 'e-docker-resp', source: 'tool-docker', target: 'response', animated: false, style: { stroke: '#ec4899' } },
];

export function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="relative h-[calc(100vh-8rem)] w-full rounded-lg border bg-card">
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
      {selectedNode && (
        <div className="absolute right-0 top-0 h-full w-80 border-l bg-card p-4 shadow-lg overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Node Details</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedNode(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <Badge variant="outline" className="mt-1">{selectedNode.type}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{(selectedNode.data as BaseNodeData).label}</p>
            </div>
            {(selectedNode.data as BaseNodeData).subtitle && (
              <div>
                <p className="text-xs text-muted-foreground">Detail</p>
                <p className="text-sm">{(selectedNode.data as BaseNodeData).subtitle}</p>
              </div>
            )}
            {(selectedNode.data as BaseNodeData).status && (
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className="mt-1">{(selectedNode.data as BaseNodeData).status}</Badge>
              </div>
            )}
            {(selectedNode.data as BaseNodeData).phase && (
              <div>
                <p className="text-xs text-muted-foreground">Current Phase</p>
                <Badge className="mt-1">{(selectedNode.data as BaseNodeData).phase}</Badge>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Position</p>
              <p className="text-sm font-mono">
                x: {Math.round(selectedNode.position.x)}, y: {Math.round(selectedNode.position.y)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BaseNodeData {
  label: string;
  subtitle?: string;
  status?: string;
  phase?: string;
  [key: string]: unknown;
}
