'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import { CodeBlock } from '@/components/shared/code-block';
import { SkillToggleList } from '@/components/agents/skill-toggle-list';
import { ModelReassignSelect } from '@/components/agents/model-reassign-select';
import { AgentEditDialog } from '@/components/agents/agent-edit-dialog';
import { AgentDeleteDialog } from '@/components/agents/agent-delete-dialog';
import type { Agent } from '@/types/agent';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AgentDetailProps {
  agent: Agent;
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agents">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <StatusDot status={agent.status} size="lg" />
          <div>
            <h2 className="text-xl font-bold">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <ModelReassignSelect agent={agent} />
        <Badge variant={agent.status === 'idle' ? 'secondary' : 'default'}>
          {agent.status}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Sessions', value: agent.stats.totalSessions },
          { label: 'Total Tokens', value: `${(agent.stats.totalTokens / 1000000).toFixed(1)}M` },
          { label: 'Total Cost', value: `$${agent.stats.totalCost.toFixed(2)}` },
          { label: 'Avg Response', value: `${agent.stats.avgResponseTime.toFixed(1)}s` },
          { label: 'Success Rate', value: `${(agent.stats.successRate * 100).toFixed(0)}%` },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span>{agent.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Tokens</span>
                <span>{agent.config.maxTokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Temperature</span>
                <span>{agent.config.temperature}</span>
              </div>
              {agent.currentPhase && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Phase</span>
                  <Badge variant="outline">{agent.currentPhase}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="config" className="space-y-4 mt-4">
          {agent.config.soulMd && (
            <Card>
              <CardHeader><CardTitle className="text-sm">SOUL.md</CardTitle></CardHeader>
              <CardContent>
                <CodeBlock code={agent.config.soulMd} language="markdown" showLineNumbers />
              </CardContent>
            </Card>
          )}
          {agent.config.agentsMd && (
            <Card>
              <CardHeader><CardTitle className="text-sm">AGENTS.md</CardTitle></CardHeader>
              <CardContent>
                <CodeBlock code={agent.config.agentsMd} language="markdown" showLineNumbers />
              </CardContent>
            </Card>
          )}
          {agent.config.toolsMd && (
            <Card>
              <CardHeader><CardTitle className="text-sm">TOOLS.md</CardTitle></CardHeader>
              <CardContent>
                <CodeBlock code={agent.config.toolsMd} language="markdown" showLineNumbers />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="skills" className="mt-4">
          <SkillToggleList agent={agent} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AgentEditDialog agent={agent} open={editOpen} onOpenChange={setEditOpen} />
      <AgentDeleteDialog
        agent={agent}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push('/agents')}
      />
    </div>
  );
}
