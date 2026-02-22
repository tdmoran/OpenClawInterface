'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusDot } from '@/components/shared/status-dot';
import { validateGatewayUrl } from '@/lib/gateway/url-helpers';
import type { UrlValidation } from '@/lib/gateway/url-helpers';
import { GatewayClient } from '@/lib/gateway/websocket-client';
import type { TestConnectionResult } from '@/lib/gateway/websocket-client';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { GatewayProfile } from '@/types/gateway';

interface RemoteSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: GatewayProfile) => void;
}

const STEP_LABELS = ['URL', 'Auth', 'Test', 'Save'] as const;

export function RemoteSetupWizard({ open, onOpenChange, onSave }: RemoteSetupWizardProps) {
  const [step, setStep] = useState(0);
  const [protocol, setProtocol] = useState<'ws' | 'wss'>('ws');
  const [host, setHost] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [validation, setValidation] = useState<UrlValidation | null>(null);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);

  const fullUrl = `${protocol}://${host}`;

  // Validate URL whenever protocol or host changes
  useEffect(() => {
    if (host) {
      const result = validateGatewayUrl(fullUrl);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [protocol, host, fullUrl]);

  // Auto-populate profile name from host when entering step 3
  useEffect(() => {
    if (step === 3 && !profileName) {
      const hostPart = host.split(':')[0] || host;
      setProfileName(hostPart);
    }
  }, [step, host, profileName]);

  const runTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    const result = await GatewayClient.testConnection(fullUrl, token || undefined);
    setTestResult(result);
    setTesting(false);
  }, [fullUrl, token]);

  // Auto-run test when entering step 2
  useEffect(() => {
    if (step === 2) {
      runTest();
    }
  }, [step, runTest]);

  const handleSave = () => {
    const id = `gw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const profile: GatewayProfile = {
      id,
      name: profileName,
      url: fullUrl,
      token,
    };
    onSave(profile);
    onOpenChange(false);
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(0);
      setProtocol('ws');
      setHost('');
      setToken('');
      setShowToken(false);
      setProfileName('');
      setValidation(null);
      setTestResult(null);
      setTesting(false);
    }
  }, [open]);

  const canProceedFromStep0 = validation?.valid === true;
  const canProceedFromStep2 = testResult !== null;

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Remote Gateway Setup</DialogTitle>
          <DialogDescription>
            Configure a connection to a remote OpenClaw gateway instance.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  i === step ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {i < 3 && (
                <div className={`w-6 h-px ${i < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-4 min-h-[180px]">
          {/* Step 0: URL */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol</Label>
                <Select value={protocol} onValueChange={(v) => setProtocol(v as 'ws' | 'wss')}>
                  <SelectTrigger id="protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ws">ws://</SelectItem>
                    <SelectItem value="wss">wss:// (secure)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">Host and Port</Label>
                <Input
                  id="host"
                  placeholder="192.168.1.100:18789"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              {validation && !validation.valid && validation.error && (
                <Badge variant="destructive" className="text-xs">
                  {validation.error}
                </Badge>
              )}
              {validation && validation.valid && validation.warning && (
                <Badge variant="secondary" className="text-xs text-amber-600 dark:text-amber-400">
                  {validation.warning}
                </Badge>
              )}
              {validation && validation.suggestion && (
                <button
                  type="button"
                  className="block"
                  onClick={() => {
                    // Extract host part from suggestion URL (strip protocol)
                    const suggested = validation.suggestion!;
                    const match = suggested.match(/^wss?:\/\/(.+)$/);
                    if (match) {
                      setHost(match[1]);
                      if (suggested.startsWith('wss://')) setProtocol('wss');
                      else setProtocol('ws');
                    }
                  }}
                >
                  <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                    Suggestion: {validation.suggestion}
                  </Badge>
                </button>
              )}
            </div>
          )}

          {/* Step 1: Auth */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Gateway Token</Label>
                <div className="relative">
                  <Input
                    id="token"
                    type={showToken ? 'text' : 'password'}
                    placeholder="Enter gateway authentication token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Find this in your OpenClaw gateway configuration file.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Test */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center gap-4 py-4">
                {testing && (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Testing connection to {fullUrl}...
                    </p>
                  </>
                )}
                {!testing && testResult?.ok && (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        Connection successful
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Latency: {testResult.latencyMs}ms
                        {testResult.serverVersion && ` | Version: ${testResult.serverVersion}`}
                      </p>
                    </div>
                    <StatusDot status="connected" size="lg" />
                  </>
                )}
                {!testing && testResult && !testResult.ok && (
                  <>
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        Connection failed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {testResult.error || 'Unknown error'}
                      </p>
                    </div>
                    <StatusDot status="error" size="lg" />
                    <Button variant="outline" size="sm" onClick={runTest}>
                      Retry
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Save */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileName">Profile Name</Label>
                <Input
                  id="profileName"
                  placeholder="e.g. Production Gateway"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="rounded-md border p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">URL</span>
                  <span className="font-mono text-xs">{fullUrl}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Auth</span>
                  <span>{token ? 'Token configured' : 'No token'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Test</span>
                  <span className="flex items-center gap-1.5">
                    {testResult?.ok ? (
                      <>
                        <StatusDot status="connected" size="sm" />
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Passed ({testResult.latencyMs}ms)
                        </span>
                      </>
                    ) : testResult ? (
                      <>
                        <StatusDot status="error" size="sm" />
                        <span className="text-red-600 dark:text-red-400">Failed</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Skipped</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            {step < 2 && (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={step === 0 && !canProceedFromStep0}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!canProceedFromStep2}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!profileName.trim()}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Profile
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
