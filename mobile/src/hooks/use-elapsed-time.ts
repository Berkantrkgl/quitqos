import { useEffect, useState } from 'react';

import { elapsedFrom, type Elapsed } from '@/utils/elapsed-time';

/**
 * Ticking elapsed-time hook. Recomputes the breakdown once per second so a
 * live streak timer counts up smoothly.
 *
 * @param startedAt streak start (ms epoch, ISO string, or Date), or `null`
 *                  when there is no active streak (the hook then stays idle).
 */
export function useElapsedTime(startedAt: number | string | Date | null): Elapsed | null {
  const [elapsed, setElapsed] = useState<Elapsed | null>(() =>
    startedAt == null ? null : elapsedFrom(startedAt),
  );

  useEffect(() => {
    if (startedAt == null) {
      setElapsed(null);
      return;
    }

    // Sync immediately so we don't wait a full second on mount / prop change.
    setElapsed(elapsedFrom(startedAt));

    const id = setInterval(() => setElapsed(elapsedFrom(startedAt)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}
