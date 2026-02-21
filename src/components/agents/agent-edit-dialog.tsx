'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Save, Loader2 } from 'lucide-react';
import type { Agent } from '@/types/agent';

interface AgentEditDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentEditDialog({ agent, open, onOpenChange }: AgentEditDialogProps) {
  const { models } = useModels();
  const { isConnected } = useGateway();
  const { updateAgent, isLoading } = useAgentActions();

  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [model, setModel] = useState(agent.model);
  const [maxTokens, setMaxTokens] = useState(agent.config.maxTokens);
  const [temperature, setTemperature] = useState(agent.config.temperature);

  // Reset form when agent changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(agent.name);
      setDescription(agent.description);
      setModel(agent.model);
      setMaxTokens(agent.config.maxTokens);
      setTemperature(agent.config.temperature);
    }
  }, [open, agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAgent(agent.id, {
      name,
      description,
      model,
      config: {
        ...agent.config,
        maxTokens,
        temperature,
      },
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Agent</SheetTitle>
          <SheetDescription>
            Update the configuration for {agent.name}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Agent name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agent description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.length > 0 ? (
                  models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.alias || m.id}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={model}>{model}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-max-tokens">Max Tokens</Label>
            <Input
              id="edit-max-tokens"
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
              min={1}
              max={200000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-temperature">Temperature</Label>
            <Input
              id="edit-temperature"
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
              min={0}
              max={2}
              step={0.1}
            />
          </div>
        </form>

        <SheetFooter>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-full">
                <Button
                  onClick={handleSubmit}
                  disabled={!isConnected || isLoading || !name.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </span>
            </TooltipTrigger>
            {!isConnected && (
              <TooltipContent>
                Connect to the gateway to edit agents
              </TooltipContent>
            )}
          </Tooltip>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
