'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the remaining time (in whole seconds, floored at 0) until `expiresAt`,
 * re-computed every second so callers get a live, ticking countdown instead of
 * a static timestamp that only updates on refetch.
 */
export function useCountdown(expiresAt: string | Date | null | undefined) {
  const target = expiresAt ? new Date(expiresAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!target) return { secondsLeft: 0, label: '—', expired: false };

  const secondsLeft = Math.max(0, Math.floor((target - now) / 1000));
  const expired = secondsLeft <= 0;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const label = expired ? 'Expired' : `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return { secondsLeft, label, expired };
}
