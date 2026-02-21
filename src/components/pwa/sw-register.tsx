'use client';

import { useEffect } from 'react';

export function SwRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[SW] Service worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
