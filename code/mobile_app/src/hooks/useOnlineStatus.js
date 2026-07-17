import { useState, useEffect, useCallback } from 'react';

const ONLINE_TIMEOUT_MS = 30_000;
const TICK_INTERVAL_MS = 5_000;

export default function useOnlineStatus(initialLastTime) {
  const [lastSeen, setLastSeen] = useState(() => {
    if (!initialLastTime) return null;
    const d = initialLastTime instanceof Date ? initialLastTime : new Date(initialLastTime);
    return Number.isNaN(d.getTime()) ? null : d;
  });

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

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
