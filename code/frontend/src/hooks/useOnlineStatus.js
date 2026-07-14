import { useState, useEffect, useCallback } from 'react';

const ONLINE_TIMEOUT_MS = 30_000;
const TICK_INTERVAL_MS = 5_000;

/**
 * Tracks whether a device is "online" based on a 30-second heartbeat timeout.
 *
 * @param {string|Date|null} initialLastTime – the last-reading timestamp from the API.
 * @returns {{ isOnline: boolean, lastSeen: Date|null, markSeen: () => void }}
 */
export default function useOnlineStatus(initialLastTime) {
  const [lastSeen, setLastSeen] = useState(() => {
    if (!initialLastTime) return null;
    const d = initialLastTime instanceof Date ? initialLastTime : new Date(initialLastTime);
    return Number.isNaN(d.getTime()) ? null : d;
  });

  const [now, setNow] = useState(() => new Date());

  // Keep `now` ticking so the component re-evaluates the timeout.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Sync with a new initialLastTime when the prop changes (e.g. after a poll).
  useEffect(() => {
    if (!initialLastTime) {
      setLastSeen(null);
      return;
    }
    const d = initialLastTime instanceof Date ? initialLastTime : new Date(initialLastTime);
    if (!Number.isNaN(d.getTime())) {
      setLastSeen(d);
    }
  }, [initialLastTime]);

  const markSeen = useCallback(() => setLastSeen(new Date()), []);

  const isOnline = !!(lastSeen && now - lastSeen < ONLINE_TIMEOUT_MS);

  return { isOnline, lastSeen, markSeen };
}
