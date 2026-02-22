/**
 * Service Worker Registration
 *
 * Registers the service worker and handles its lifecycle events
 * (installing, waiting, active). Exports a single function that
 * should be called once on app mount (e.g., inside a useEffect).
 */

export type SwStatus = 'unsupported' | 'registering' | 'installed' | 'waiting' | 'active' | 'error';

export interface SwRegistrationResult {
  status: SwStatus;
  registration?: ServiceWorkerRegistration;
  error?: unknown;
}

/**
 * Register the service worker at `/sw.js`.
 *
 * - Checks for browser support
 * - Handles installing / waiting / active lifecycle
 * - Logs status to console
 * - Returns a result object with the final status
 */
export async function registerServiceWorker(): Promise<SwRegistrationResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service workers are not supported in this environment');
    return { status: 'unsupported' };
  }

  try {
    console.log('[SW] Registering service worker...');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Registration successful, scope:', registration.scope);

    // --- Handle lifecycle states ---

    if (registration.installing) {
      console.log('[SW] Service worker is installing');
      trackInstallingWorker(registration.installing);
      return { status: 'installed', registration };
    }

    if (registration.waiting) {
      console.log('[SW] New service worker is waiting to activate');
      return { status: 'waiting', registration };
    }

    if (registration.active) {
      console.log('[SW] Service worker is active');
      return { status: 'active', registration };
    }

    // Listen for future updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('[SW] Update found — new worker installing');
        trackInstallingWorker(newWorker);
      }
    });

    return { status: 'active', registration };
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return { status: 'error', error };
  }
}

/**
 * Track a service worker through its state changes.
 */
function trackInstallingWorker(worker: ServiceWorker): void {
  worker.addEventListener('statechange', () => {
    switch (worker.state) {
      case 'installed':
        if (navigator.serviceWorker.controller) {
          // New content is available; old service worker still controls page
          console.log('[SW] New content available — close all tabs to update');
        } else {
          // First-time install — content is cached for offline use
          console.log('[SW] Content cached for offline use');
        }
        break;
      case 'activated':
        console.log('[SW] Service worker activated');
        break;
      case 'redundant':
        console.log('[SW] Service worker became redundant');
        break;
    }
  });
}

/**
 * Ask a waiting service worker to skip waiting and take control immediately.
 * Useful for "update available" prompts.
 */
export function skipWaiting(registration: ServiceWorkerRegistration): void {
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
