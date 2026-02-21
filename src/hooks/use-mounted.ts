import { useState, useEffect } from 'react';

/** Returns false during SSR/hydration, true after first client render. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
