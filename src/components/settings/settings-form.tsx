'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { StatusDot } from '@/components/shared/status-dot';
import { useConnectionStore } from '@/stores/connection-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useGatewayContext } from '@/providers/gateway-provider';
import { WebhookIntegrations } from './webhook-integrations';
import { Plus, Trash2, Pencil, Check, X, RefreshCw, Server, Bell, Zap, Globe, Copy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { GatewayClient } from '@/lib/gateway';
import type { TestConnectionResult } from '@/lib/gateway';
import { validateGatewayUrl } from '@/lib/gateway';
import type { UrlValidation } from '@/lib/gateway';
import { RemoteSetupWizard } from './remote-setup-wizard';
import type { GatewayProfile } from '@/types/gateway';

function generateId(): string {
  return `gw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface GatewayFormValues {
  name: string;
  url: string;
  token: string;
}

function GatewayProfileCard({
  gateway,
  isActive,
  isOnlyGateway,
  connectionStatus,
  onActivate,
  onUpdate,
  onRemove,
}: {
  gateway: GatewayProfile;
  isActive: boolean;
  isOnlyGateway: boolean;
  connectionStatus: string;
  onActivate: () => void;
  onUpdate: (updates: Partial<Omit<GatewayProfile, 'id'>>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<GatewayFormValues>({
    name: gateway.name,
    url: gateway.url,
    token: gateway.token,
  });
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [urlValidation, setUrlValidation] = useState<UrlValidation | null>(null);

  useEffect(() => {
    if (editing) {
      setUrlValidation(validateGatewayUrl(form.url));
    }
  }, [editing, form.url]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await GatewayClient.testConnection(gateway.url, gateway.token || undefined);
    setTestResult(result);
    setTesting(false);
    if (result.ok) {
      toast.success(`Connected in ${result.latencyMs}ms`, {
        description: result.serverVersion ? `Server v${result.serverVersion}` : undefined,
      });
    } else {
      toast.error('Connection failed', { description: result.error });
    }
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.url.trim()) return;
    onUpdate({ name: form.name.trim(), url: form.url.trim(), token: form.token });
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({ name: gateway.name, url: gateway.url, token: gateway.token });
    setEditing(false);
  };

  const dotStatus = isActive
    ? connectionStatus === 'connected'
      ? 'connected'
      : connectionStatus === 'error'
        ? 'error'
        : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
          ? 'connecting'
          : 'disconnected'
    : 'disconnected';

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <StatusDot status={dotStatus} />
        {editing ? (
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="h-7 text-sm font-medium max-w-[200px]"
            autoFocus
          />
        ) : (
          <span className="text-sm font-medium">{gateway.name}</span>
        )}
        {isActive && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Active
          </Badge>
        )}
        <div className="flex-1" />
        {editing ? (
          <>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSave}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            {!isActive && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onActivate}>
                Set Active
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleTest}
              disabled={testing}
              title="Test connection"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className={`h-3.5 w-3.5 ${testResult?.ok ? 'text-green-500' : testResult ? 'text-red-500' : ''}`} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {!isOnlyGateway && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Gateway</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove &ldquo;{gateway.name}&rdquo;? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={onRemove}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 pl-5">
          <div className="space-y-1.5">
            <Label className="text-xs">URL</Label>
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="ws://localhost:18789"
              className="h-8 text-sm"
            />
            {urlValidation && !urlValidation.valid && urlValidation.error && (
              <p className="text-xs text-destructive">{urlValidation.error}</p>
            )}
            {urlValidation?.warning && (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-amber-500">{urlValidation.warning}</p>
                {urlValidation.suggestion && (
                  <Badge
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-accent"
                    onClick={() => setForm((f) => ({ ...f, url: urlValidation.suggestion! }))}
                  >
                    Use {urlValidation.suggestion}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Auth Token</Label>
            <Input
              type="password"
              value={form.token}
              onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
              placeholder="Enter gateway token..."
              className="h-8 text-sm"
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground pl-5 truncate">{gateway.url}</p>
      )}
    </div>
  );
}

export function SettingsForm() {
  const status = useConnectionStore((s) => s.status);
  const gateways = useConnectionStore((s) => s.gateways);
  const activeGatewayId = useConnectionStore((s) => s.activeGatewayId);
  const addGateway = useConnectionStore((s) => s.addGateway);
  const removeGateway = useConnectionStore((s) => s.removeGateway);
  const updateGateway = useConnectionStore((s) => s.updateGateway);
  const setActiveGateway = useConnectionStore((s) => s.setActiveGateway);
  const { connect, disconnect } = useGatewayContext();

  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<GatewayFormValues>({
    name: '',
    url: 'ws://',
    token: '',
  });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [networkUrls, setNetworkUrls] = useState<string[]>([]);
  const [showNetworkUrls, setShowNetworkUrls] = useState(false);
  const [loadingNetwork, setLoadingNetwork] = useState(false);

  const fetchNetworkUrls = async () => {
    setLoadingNetwork(true);
    try {
      const res = await fetch('/api/network-info');
      const data = await res.json();
      setNetworkUrls(data.suggestedUrls || []);
    } catch {
      setNetworkUrls([]);
    }
    setLoadingNetwork(false);
  };

  const handleWizardSave = (profile: GatewayProfile) => {
    addGateway(profile);
    toast.success('Remote gateway added', { description: profile.name });
  };

  const autoReconnect = useSettingsStore((s) => s.autoReconnect);
  const setAutoReconnect = useSettingsStore((s) => s.setAutoReconnect);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const logBufferSize = useSettingsStore((s) => s.logBufferSize);
  const setLogBufferSize = useSettingsStore((s) => s.setLogBufferSize);
  const logStreamAutoScroll = useSettingsStore((s) => s.logStreamAutoScroll);
  const setLogStreamAutoScroll = useSettingsStore((s) => s.setLogStreamAutoScroll);
  const logStreamDefaultSeverity = useSettingsStore((s) => s.logStreamDefaultSeverity);
  const setLogStreamDefaultSeverity = useSettingsStore((s) => s.setLogStreamDefaultSeverity);
  const enableNotificationSounds = useSettingsStore((s) => s.enableNotificationSounds);
  const setEnableNotificationSounds = useSettingsStore((s) => s.setEnableNotificationSounds);
  const requestNotificationPermission = useSettingsStore((s) => s.requestNotificationPermission);
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const handleAddGateway = () => {
    if (!newForm.name.trim() || !newForm.url.trim()) return;
    const profile: GatewayProfile = {
      id: generateId(),
      name: newForm.name.trim(),
      url: newForm.url.trim(),
      token: newForm.token,
    };
    addGateway(profile);
    setNewForm({ name: '', url: 'ws://', token: '' });
    setAddingNew(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Gateways */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Gateways</CardTitle>
              <CardDescription>Manage gateway connections</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                Setup Remote
              </Button>
              <Button
                variant={status === 'connected' ? 'outline' : 'default'}
                size="sm"
                onClick={status === 'connected' ? disconnect : connect}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {status === 'connected' ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {gateways.map((gateway) => (
            <GatewayProfileCard
              key={gateway.id}
              gateway={gateway}
              isActive={gateway.id === activeGatewayId}
              isOnlyGateway={gateways.length === 1}
              connectionStatus={gateway.id === activeGatewayId ? status : 'disconnected'}
              onActivate={() => setActiveGateway(gateway.id)}
              onUpdate={(updates) => updateGateway(gateway.id, updates)}
              onRemove={() => removeGateway(gateway.id)}
            />
          ))}

          {addingNew ? (
            <div className="rounded-lg border border-dashed p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Gateway</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleAddGateway}
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
                      setNewForm({ name: '', url: 'ws://', token: '' });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={newForm.name}
                    onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Production Gateway"
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={newForm.url}
                    onChange={(e) => setNewForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="ws://gateway.example.com:18789"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Auth Token</Label>
                  <Input
                    type="password"
                    value={newForm.token}
                    onChange={(e) => setNewForm((f) => ({ ...f, token: e.target.value }))}
                    placeholder="Enter gateway token..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setAddingNew(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Gateway
            </Button>
          )}

          <div className="pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs text-muted-foreground"
              onClick={() => {
                const next = !showNetworkUrls;
                setShowNetworkUrls(next);
                if (next && networkUrls.length === 0) fetchNetworkUrls();
              }}
            >
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                Local Network URLs
              </span>
              {showNetworkUrls ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            {showNetworkUrls && (
              <div className="mt-2 space-y-1.5">
                {loadingNetwork ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Detecting network interfaces...
                  </div>
                ) : networkUrls.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No external network interfaces found.</p>
                ) : (
                  networkUrls.map((url) => (
                    <div key={url} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                      <code className="text-xs">{url}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          toast.success('Copied to clipboard');
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <RemoteSetupWizard open={wizardOpen} onOpenChange={setWizardOpen} onSave={handleWizardSave} />
        </CardContent>
      </Card>

      <Separator />

      {/* Webhook Integrations */}
      <WebhookIntegrations />

      <Separator />

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>Configure dashboard behavior and notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Reconnect</Label>
              <p className="text-xs text-muted-foreground">Automatically reconnect when connection drops</p>
            </div>
            <Switch checked={autoReconnect} onCheckedChange={setAutoReconnect} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Log Stream Auto-Scroll</Label>
              <p className="text-xs text-muted-foreground">Automatically scroll to new log entries</p>
            </div>
            <Switch checked={logStreamAutoScroll} onCheckedChange={setLogStreamAutoScroll} />
          </div>

          <div className="space-y-2">
            <Label>Default Log Severity Filter</Label>
            <Select
              value={logStreamDefaultSeverity ?? 'all'}
              onValueChange={(value) =>
                setLogStreamDefaultSeverity(value === 'all' ? null : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Show all severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Default severity filter when opening the log stream</p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Notifications</Label>
              <p className="text-xs text-muted-foreground">Show desktop notifications for errors and alerts</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>

          {notificationsEnabled && notifPermission !== 'granted' && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                <p className="text-xs text-muted-foreground">
                  {notifPermission === 'denied'
                    ? 'Notification permission was denied. Please enable it in your browser settings.'
                    : 'Browser notification permission is required for desktop alerts.'}
                </p>
              </div>
              {notifPermission !== 'denied' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 ml-3"
                  onClick={async () => {
                    await requestNotificationPermission();
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                      setNotifPermission(Notification.permission);
                    }
                  }}
                >
                  Request Permission
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Notification Sounds</Label>
              <p className="text-xs text-muted-foreground">Play a sound when notifications are triggered</p>
            </div>
            <Switch
              checked={enableNotificationSounds}
              onCheckedChange={setEnableNotificationSounds}
              disabled={!notificationsEnabled}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="buffer-size">Log Buffer Size</Label>
            <Input
              id="buffer-size"
              type="number"
              value={logBufferSize}
              onChange={(e) => setLogBufferSize(parseInt(e.target.value) || 10000)}
            />
            <p className="text-xs text-muted-foreground">Maximum number of log entries to keep in memory</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
