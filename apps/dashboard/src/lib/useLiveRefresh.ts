import { useEffect, useRef } from 'react';

/**
 * Loads fresh data when a page opens, then polls while the tab is visible,
 * so feeds and logs never show what was loaded at login.
 */
export function useLiveRefresh(
  refresh: () => Promise<void> | void,
  { enabled = true, intervalMs = 15_000 }: { enabled?: boolean; intervalMs?: number } = {},
): void {
  // The latest callback, without re-running the effect when its identity changes.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return undefined;
    void refreshRef.current();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshRef.current();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
}
