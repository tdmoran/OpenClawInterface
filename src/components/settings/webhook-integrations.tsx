'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useWebhookStore,
  WEBHOOK_EVENT_OPTIONS,
  type WebhookType,
  type WebhookEventFilter,
  type WebhookIntegration,
} from '@/stores/webhook-store';
import { sendTestWebhook } from '@/lib/dispatch-webhook';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Send,
  Loader2,
  Webhook,
  MessageSquare,
  Hash,
} from 'lucide-react';

function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const typeConfig: Record<WebhookType, { label: string; icon: typeof Webhook; urlPlaceholder: string }> = {
  slack: {
    label: 'Slack',
    icon: Hash,
    urlPlaceholder: 'https://hooks.slack.com/services/...',
  },
  discord: {
    label: 'Discord',
    icon: MessageSquare,
    urlPlaceholder: 'https://discord.com/api/webhooks/...',
  },
  generic: {
    label: 'Generic Webhook',
    icon: Webhook,
    urlPlaceholder: 'https://example.com/webhook',
  },
};

interface WebhookFormValues {
  name: string;
  type: WebhookType;
  url: string;
  events: WebhookEventFilter[];
}

const defaultFormValues: WebhookFormValues = {
  name: '',
  type: 'slack',
  url: '',
  events: ['alert.critical', 'alert.warning'],
};

function WebhookForm({
  values,
  onChange,
}: {
  values: WebhookFormValues;
  onChange: (values: WebhookFormValues) => void;
}) {
  const config = typeConfig[values.type];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          placeholder="Production Alerts"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <Select
          value={values.type}
          onValueChange={(v) =>
            onChange({ ...values, type: v as WebhookType, url: '' })
          }
        >
          <SelectTrigger className="h-8 text-sm w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(typeConfig) as WebhookType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {typeConfig[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Webhook URL</Label>
        <Input
          value={values.url}
          onChange={(e) => onChange({ ...values, url: e.target.value })}
          placeholder={config.urlPlaceholder}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Event Filters</Label>
        <p className="text-xs text-muted-foreground">
          Select which events should trigger this webhook
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {WEBHOOK_EVENT_OPTIONS.map((opt) => {
            const checked = values.events.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-xs hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    if (c) {
                      onChange({ ...values, events: [...values.events, opt.value] });
                    } else {
                      onChange({
                        ...values,
                        events: values.events.filter((e) => e !== opt.value),
                      });
                    }
                  }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WebhookCard({
  webhook,
  onEdit,
  onDelete,
  onToggle,
  onTest,
}: {
  webhook: WebhookIntegration;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onTest: () => void;
}) {
  const config = typeConfig[webhook.type];
  const Icon = config.icon;
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    onTest();
    // Small delay so the spinner is visible
    setTimeout(() => setTesting(false), 1500);
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{webhook.name}</span>
            <Badge variant="outline" className="text-xs px-2 py-0.5 shrink-0">
              {config.label}
            </Badge>
            {!webhook.enabled && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5 shrink-0">
                Disabled
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{webhook.url}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={webhook.enabled}
            onCheckedChange={onToggle}
            size="sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {webhook.events.map((e) => {
            const opt = WEBHOOK_EVENT_OPTIONS.find((o) => o.value === e);
            return (
              <Badge key={e} variant="secondary" className="text-xs px-2 py-0.5">
                {opt?.label ?? e}
              </Badge>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleTest}
            disabled={testing}
            title="Send test payload"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {webhook.lastError && (
        <p className="text-xs text-destructive">
          Last error: {webhook.lastError}
        </p>
      )}
    </div>
  );
}

export function WebhookIntegrations() {
  const integrations = useWebhookStore((s) => s.integrations);
  const addIntegration = useWebhookStore((s) => s.addIntegration);
  const updateIntegration = useWebhookStore((s) => s.updateIntegration);
  const removeIntegration = useWebhookStore((s) => s.removeIntegration);
  const toggleIntegration = useWebhookStore((s) => s.toggleIntegration);

  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<WebhookFormValues>({ ...defaultFormValues });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<WebhookFormValues>({ ...defaultFormValues });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newForm.name.trim() || !newForm.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }
    if (newForm.events.length === 0) {
      toast.error('Select at least one event filter');
      return;
    }
    const integration: WebhookIntegration = {
      id: generateId(),
      name: newForm.name.trim(),
      type: newForm.type,
      url: newForm.url.trim(),
      enabled: true,
      events: newForm.events,
      createdAt: new Date().toISOString(),
    };
    addIntegration(integration);
    setNewForm({ ...defaultFormValues });
    setAddingNew(false);
    toast.success('Webhook integration added');
  };

  const handleEditStart = (webhook: WebhookIntegration) => {
    setEditingId(webhook.id);
    setEditForm({
      name: webhook.name,
      type: webhook.type,
      url: webhook.url,
      events: webhook.events,
    });
  };

  const handleEditSave = () => {
    if (!editingId) return;
    if (!editForm.name.trim() || !editForm.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }
    if (editForm.events.length === 0) {
      toast.error('Select at least one event filter');
      return;
    }
    updateIntegration(editingId, {
      name: editForm.name.trim(),
      type: editForm.type,
      url: editForm.url.trim(),
      events: editForm.events,
    });
    setEditingId(null);
    toast.success('Webhook integration updated');
  };

  const handleDelete = () => {
    if (!deleteConfirmId) return;
    removeIntegration(deleteConfirmId);
    setDeleteConfirmId(null);
    toast.success('Webhook integration removed');
  };

  const handleTest = async (webhook: WebhookIntegration) => {
    const result = await sendTestWebhook(webhook);
    if (result.success) {
      toast.success('Test payload sent successfully');
    } else {
      toast.error('Test failed', { description: result.error });
    }
  };

  const deleteTarget = deleteConfirmId
    ? integrations.find((w) => w.id === deleteConfirmId)
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Webhook Integrations</CardTitle>
              <CardDescription>
                Send alert notifications to Slack, Discord, or custom endpoints
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.length === 0 && !addingNew && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Webhook className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No webhook integrations configured</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add a webhook to receive alert notifications in Slack, Discord, or other services
              </p>
            </div>
          )}

          {integrations.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              onEdit={() => handleEditStart(webhook)}
              onDelete={() => setDeleteConfirmId(webhook.id)}
              onToggle={() => toggleIntegration(webhook.id)}
              onTest={() => handleTest(webhook)}
            />
          ))}

          {addingNew ? (
            <div className="rounded-lg border border-dashed p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Webhook</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleAdd}
                    disabled={!newForm.name.trim() || !newForm.url.trim()}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      setAddingNew(false);
                      setNewForm({ ...defaultFormValues });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <WebhookForm values={newForm} onChange={setNewForm} />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setAddingNew(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Webhook
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>
              Update the webhook integration configuration
            </DialogDescription>
          </DialogHeader>
          <WebhookForm values={editForm} onChange={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editForm.name.trim() || !editForm.url.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
