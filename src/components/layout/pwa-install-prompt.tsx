'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The `beforeinstallprompt` event interface.
 * Not all browsers expose this, so we declare it ourselves.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

/**
 * A subtle banner at the bottom of the screen prompting the user
 * to install the PWA. Only shown on browsers that support the
 * `beforeinstallprompt` event and when the user has not previously
 * dismissed the prompt.
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if previously dismissed
    try {
      if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    } catch {
      // localStorage may be unavailable
    }

    const handler = (e: Event) => {
      // Prevent the mini-infobar on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
    } catch (err) {
      console.error('[PWA] Error showing install prompt:', err);
    }

    setDeferredPrompt(null);
    setVisible(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDeferredPrompt(null);

    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <Download className="h-5 w-5 shrink-0 text-primary" />
      <p className="text-sm text-muted-foreground">
        Install <span className="font-medium text-foreground">OpenClaw Dashboard</span> for
        a better experience.
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleInstall}>
          Install App
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
