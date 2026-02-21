'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import { useConnectionStore } from '@/stores/connection-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useGatewayContext } from '@/providers/gateway-provider';
import { Save, RefreshCw } from 'lucide-react';

export function SettingsForm() {
  const status = useConnectionStore((s) => s.status);
  const config = useConnectionStore((s) => s.config);
  const setConfig = useConnectionStore((s) => s.setConfig);
  const { connect, disconnect } = useGatewayContext();

  const autoReconnect = useSettingsStore((s) => s.autoReconnect);
  const setAutoReconnect = useSettingsStore((s) => s.setAutoReconnect);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const logBufferSize = useSettingsStore((s) => s.logBufferSize);
  const setLogBufferSize = useSettingsStore((s) => s.setLogBufferSize);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Gateway Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gateway Connection</CardTitle>
          <CardDescription>Configure the WebSocket connection to the gateway</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <StatusDot status={status === 'connected' ? 'connected' : status === 'error' ? 'error' : 'disconnected'} />
            <span className="text-sm font-medium capitalize">{status}</span>
            <div className="flex-1" />
            <Button
              variant={status === 'connected' ? 'outline' : 'default'}
              size="sm"
              onClick={status === 'connected' ? disconnect : connect}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {status === 'connected' ? 'Disconnect' : 'Connect'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gateway-url">Gateway URL</Label>
            <Input
              id="gateway-url"
              value={config.url}
              onChange={(e) => setConfig({ url: e.target.value })}
              placeholder="ws://localhost:18789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gateway-token">Auth Token (optional)</Label>
            <Input
              id="gateway-token"
              type="password"
              value={config.token || ''}
              onChange={(e) => setConfig({ token: e.target.value })}
              placeholder="Enter gateway token..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reconnect-interval">Reconnect Interval (ms)</Label>
              <Input
                id="reconnect-interval"
                type="number"
                value={config.reconnectInterval}
                onChange={(e) => setConfig({ reconnectInterval: parseInt(e.target.value) || 3000 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-reconnect">Max Reconnect Attempts</Label>
              <Input
                id="max-reconnect"
                type="number"
                value={config.maxReconnectAttempts}
                onChange={(e) => setConfig({ maxReconnectAttempts: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
              <Label>Notifications</Label>
              <p className="text-xs text-muted-foreground">Show desktop notifications for errors and alerts</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>

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
