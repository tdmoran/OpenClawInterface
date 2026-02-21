'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import { CodeBlock } from '@/components/shared/code-block';
import type { Agent } from '@/types/agent';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AgentDetailProps {
  agent: Agent;
}

export function AgentDetail({ agent }: AgentDetailProps) {
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
        <Badge variant="outline">{agent.model}</Badge>
        <Badge variant={agent.status === 'idle' ? 'secondary' : 'default'}>
          {agent.status}
        </Badge>
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
          <div className="grid gap-3 md:grid-cols-2">
            {agent.skills.map((skill) => (
              <Card key={skill.id}>
                <CardContent className="flex items-center justify-between pt-4">
                  <div>
                    <p className="font-medium text-sm">{skill.name}</p>
                    <p className="text-xs text-muted-foreground">{skill.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">v{skill.version}</Badge>
                    <Badge variant={skill.source === 'clawhub' ? 'default' : 'secondary'} className="text-xs">
                      {skill.source}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
