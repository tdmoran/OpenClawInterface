'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { CronScheduleDisplay } from '@/components/cron/cron-schedule-display';
import { useCronActions } from '@/hooks/use-cron-actions';
import { useConnectionStore } from '@/stores/connection-store';
import { useAgentsStore } from '@/stores/agents-store';
import { intervalToMinutes, intervalToCron } from '@/lib/cron-utils';
import type { CronJob, CronScheduleType } from '@/types/cron';

interface CronJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingJob?: CronJob | null;
}

type IntervalUnit = 'minutes' | 'hours' | 'days';

export function CronJobDialog({ open, onOpenChange, editingJob }: CronJobDialogProps) {
  const { createJob, updateJob, isLoading } = useCronActions();
  const connectionStatus = useConnectionStore((s) => s.status);
  const isConnected = connectionStatus === 'connected';
  const agentsMap = useAgentsStore((s) => s.agents);
  const agents = useMemo(() => Array.from(agentsMap.values()), [agentsMap]);

  const [name, setName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [scheduleType, setScheduleType] = useState<CronScheduleType>('interval');
  const [intervalValue, setIntervalValue] = useState('5');
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('minutes');
  const [cronExpr, setCronExpr] = useState('*/5 * * * *');

  const isEditing = !!editingJob;

  // Populate form when editing
  useEffect(() => {
    if (editingJob) {
      setName(editingJob.name);
      setAgentId(editingJob.agentId);
      setScheduleType(editingJob.scheduleType);
      if (editingJob.scheduleType === 'interval' && editingJob.intervalMinutes) {
        const mins = editingJob.intervalMinutes;
        if (mins % 1440 === 0 && mins >= 1440) {
          setIntervalValue(String(mins / 1440));
          setIntervalUnit('days');
        } else if (mins % 60 === 0 && mins >= 60) {
          setIntervalValue(String(mins / 60));
          setIntervalUnit('hours');
        } else {
          setIntervalValue(String(mins));
          setIntervalUnit('minutes');
        }
      }
      setCronExpr(editingJob.schedule);
    } else {
      resetForm();
    }
  }, [editingJob, open]);

  function resetForm() {
    setName('');
    setAgentId('');
    setScheduleType('interval');
    setIntervalValue('5');
    setIntervalUnit('minutes');
    setCronExpr('*/5 * * * *');
  }

  const currentSchedule = useMemo(() => {
    if (scheduleType === 'interval') {
      const val = parseInt(intervalValue, 10);
      if (isNaN(val) || val <= 0) return '';
      const mins = intervalToMinutes(val, intervalUnit);
      return intervalToCron(mins);
    }
    return cronExpr;
  }, [scheduleType, intervalValue, intervalUnit, cronExpr]);

  const currentIntervalMinutes = useMemo(() => {
    if (scheduleType === 'interval') {
      const val = parseInt(intervalValue, 10);
      if (isNaN(val) || val <= 0) return undefined;
      return intervalToMinutes(val, intervalUnit);
    }
    return undefined;
  }, [scheduleType, intervalValue, intervalUnit]);

  const isValid = name.trim().length > 0 && agentId.length > 0 && currentSchedule.length > 0;

  async function handleSubmit() {
    if (!isValid) return;

    if (isEditing && editingJob) {
      await updateJob(editingJob.id, {
        name: name.trim(),
        agentId,
        schedule: currentSchedule,
        scheduleType,
        intervalMinutes: currentIntervalMinutes,
      });
    } else {
      await createJob({
        name: name.trim(),
        agentId,
        schedule: currentSchedule,
        scheduleType,
        intervalMinutes: currentIntervalMinutes,
        status: 'active',
      });
    }

    onOpenChange(false);
    resetForm();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Cron Job' : 'Create Cron Job'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the schedule and configuration for this job.'
              : 'Schedule an agent to run automatically on a recurring basis.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 py-6">
          {/* Job Name */}
          <div className="space-y-2">
            <Label htmlFor="cron-name">Name</Label>
            <Input
              id="cron-name"
              placeholder="e.g. Health Check Sweep"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Agent Select */}
          <div className="space-y-2">
            <Label htmlFor="cron-agent">Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Type */}
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Select
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as CronScheduleType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interval">Interval</SelectItem>
                <SelectItem value="cron">Cron Expression</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interval Fields */}
          {scheduleType === 'interval' && (
            <div className="space-y-2">
              <Label>Run every</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(e.target.value)}
                  className="w-24"
                />
                <Select
                  value={intervalUnit}
                  onValueChange={(v) => setIntervalUnit(v as IntervalUnit)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Cron Expression */}
          {scheduleType === 'cron' && (
            <div className="space-y-2">
              <Label htmlFor="cron-expr">Cron Expression</Label>
              <Input
                id="cron-expr"
                placeholder="*/5 * * * *"
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Format: minute hour day-of-month month day-of-week
              </p>
            </div>
          )}

          {/* Preview */}
          {currentSchedule && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Schedule Preview</p>
              <CronScheduleDisplay
                schedule={currentSchedule}
                scheduleType={scheduleType}
                intervalMinutes={currentIntervalMinutes}
                showNextRuns
                nextRunCount={3}
              />
              <p className="text-xs text-muted-foreground font-mono">{currentSchedule}</p>
            </div>
          )}
        </div>

        <SheetFooter className="px-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading || (!isConnected && isEditing)}
          >
            {isLoading
              ? isEditing
                ? 'Saving...'
                : 'Creating...'
              : isEditing
                ? 'Save Changes'
                : 'Create Job'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
