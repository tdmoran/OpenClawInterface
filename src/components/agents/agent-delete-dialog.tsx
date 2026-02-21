'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGateway } from '@/hooks/use-gateway';
import { useAgentActions } from '@/hooks/use-agent-actions';
import { Trash2, Loader2 } from 'lucide-react';
import type { Agent } from '@/types/agent';

interface AgentDeleteDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function AgentDeleteDialog({ agent, open, onOpenChange, onDeleted }: AgentDeleteDialogProps) {
  const { isConnected } = useGateway();
  const { deleteAgent, isLoading } = useAgentActions();

  const handleDelete = async () => {
    await deleteAgent(agent.id);
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Agent</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{agent.name}</strong>? This action
            cannot be undone. All associated configuration and skill assignments will
            be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!isConnected || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {isLoading ? 'Deleting...' : 'Delete Agent'}
                </Button>
              </span>
            </TooltipTrigger>
            {!isConnected && (
              <TooltipContent>
                Connect to the gateway to delete agents
              </TooltipContent>
            )}
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
