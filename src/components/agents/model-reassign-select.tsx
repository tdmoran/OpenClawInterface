'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useModels } from '@/hooks/use-models';
import { useGateway } from '@/hooks/use-gateway';
import { useAgentActions } from '@/hooks/use-agent-actions';
import type { Agent } from '@/types/agent';

interface ModelReassignSelectProps {
  agent: Agent;
}

export function ModelReassignSelect({ agent }: ModelReassignSelectProps) {
  const { models } = useModels();
  const { isConnected } = useGateway();
  const { updateAgent } = useAgentActions();

  const handleModelChange = async (newModel: string) => {
    if (newModel !== agent.model) {
      await updateAgent(agent.id, { model: newModel });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Select
            value={agent.model}
            onValueChange={handleModelChange}
            disabled={!isConnected}
          >
            <SelectTrigger size="sm" className="h-7 text-xs">
              <SelectValue placeholder={agent.model} />
            </SelectTrigger>
            <SelectContent>
              {models.length > 0 ? (
                models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.alias || m.id}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value={agent.model}>{agent.model}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </span>
      </TooltipTrigger>
      {!isConnected && (
        <TooltipContent>
          Connect to the gateway to change models
        </TooltipContent>
      )}
    </Tooltip>
  );
}
