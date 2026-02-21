'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGateway } from '@/hooks/use-gateway';
import { useAgentActions } from '@/hooks/use-agent-actions';
import type { Agent, Skill } from '@/types/agent';

interface SkillToggleListProps {
  agent: Agent;
}

export function SkillToggleList({ agent }: SkillToggleListProps) {
  const { isConnected } = useGateway();
  const { updateAgent } = useAgentActions();

  const handleToggle = async (skillId: string, enabled: boolean) => {
    const updatedSkills = agent.skills.map((skill) =>
      skill.id === skillId ? { ...skill, enabled } : skill
    );
    await updateAgent(agent.id, { skills: updatedSkills });
  };

  if (agent.skills.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No skills configured</p>
        <p className="text-xs text-muted-foreground mt-1">
          Skills can be added through the gateway configuration
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {agent.skills.map((skill) => (
        <Card key={skill.id}>
          <CardContent className="flex items-center justify-between pt-4">
            <div className="flex-1 min-w-0 mr-3">
              <p className="font-medium text-sm">{skill.name}</p>
              <p className="text-xs text-muted-foreground">{skill.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs">v{skill.version}</Badge>
              <Badge
                variant={skill.source === 'clawhub' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {skill.source}
              </Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Switch
                      checked={skill.enabled}
                      onCheckedChange={(checked) => handleToggle(skill.id, checked)}
                      disabled={!isConnected}
                      size="sm"
                    />
                  </span>
                </TooltipTrigger>
                {!isConnected && (
                  <TooltipContent>
                    Connect to the gateway to toggle skills
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
