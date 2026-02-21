'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, Loader2 } from 'lucide-react';

interface AgentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentCreateDialog({ open, onOpenChange }: AgentCreateDialogProps) {
  const { models } = useModels();
  const { isConnected } = useGateway();
  const { createAgent, isLoading } = useAgentActions();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);

  const resetForm = () => {
    setName('');
    setDescription('');
    setModel('');
    setMaxTokens(4096);
    setTemperature(0.7);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAgent({
      name,
      description,
      model: model || (models[0]?.id ?? 'claude-sonnet-4-6'),
      status: 'idle',
      skills: [],
      config: {
        maxTokens,
        temperature,
      },
    });
    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Agent</DialogTitle>
          <DialogDescription>
            Configure a new agent for the OpenClaw framework
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Name</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CodeAssist"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-description">Description</Label>
            <Input
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-model">Model</Label>
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
                  <>
                    <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6</SelectItem>
                    <SelectItem value="claude-opus-4-6">claude-opus-4-6</SelectItem>
                    <SelectItem value="claude-haiku-4-5">claude-haiku-4-5</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-max-tokens">Max Tokens</Label>
              <Input
                id="create-max-tokens"
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
                min={1}
                max={200000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-temperature">Temperature</Label>
              <Input
                id="create-temperature"
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                min={0}
                max={2}
                step={0.1}
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={handleSubmit}
                  disabled={!isConnected || isLoading || !name.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isLoading ? 'Creating...' : 'Create Agent'}
                </Button>
              </span>
            </TooltipTrigger>
            {!isConnected && (
              <TooltipContent>
                Connect to the gateway to create agents
              </TooltipContent>
            )}
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
