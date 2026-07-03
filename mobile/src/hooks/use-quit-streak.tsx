import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  createAttempt,
  getCurrentAttempt,
  relapseAttempt,
  type QuitAttemptResponse,
} from '@/lib/api';

const STORAGE_KEY = 'quitqos.streak';

/**
 * Guest quit-attempt record. Shape mirrors the backend `QuitAttempt` so it
 * stays forward-compatible with `POST /users/me/sync` on guest→registered
 * upgrade (see CLAUDE.md). Guests keep only the current attempt on-device;
 * a relapse simply clears it (history is a backend concern).
 */
export type QuitAttempt = {
  /** Client-generated id, sent as `localId` on sync for idempotency. */
  localId: string;
  /** Streak start as an ISO-8601 UTC string. */
  startedAt: string;
  status: 'ACTIVE' | 'RELAPSED';
  /** True when the user picked a past start date rather than "now". */
  isBackdated: boolean;
};

type QuitStreakContextValue = {
  /** The active attempt, or `null` when there is no streak yet. */
  attempt: QuitAttempt | null;
  /** True until the current value has been read (from storage or the backend). */
  isLoading: boolean;
  /** Begin a new streak. `startedAt` defaults to now; a past date backdates. */
  startStreak: (startedAt?: Date) => void;
  /** End the current streak (relapse). Clears the on-device attempt. */
  relapse: () => void;
  /**
   * Drop the on-device attempt after it has been synced to the account, without the "relapse"
   * meaning. Used on guest→registered upgrade: the backend becomes the source of truth.
   */
  clearAfterSync: () => void;
};

const QuitStreakContext = createContext<QuitStreakContextValue | undefined>(undefined);

/** RFC4122-ish v4 id without pulling in a uuid dependency. */
function generateLocalId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Map a backend attempt to the local shape (backend has no localId → reuse the server id). */
function fromBackend(a: QuitAttemptResponse): QuitAttempt {
  return {
    localId: a.id,
    startedAt: a.startedAt,
    status: a.status,
    isBackdated: a.isBackdated,
  };
}

export function QuitStreakProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const [attempt, setAttempt] = useState<QuitAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Backend id of the active attempt, needed to relapse it. Null for guests.
  const [backendId, setBackendId] = useState<string | null>(null);

  const isRegistered = !!(user && accessToken);

  // Source of truth switches with auth: backend when registered, on-device storage for guests.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    if (isRegistered && accessToken) {
      getCurrentAttempt(accessToken)
        .then((a) => {
          if (cancelled) return;
          setAttempt(a ? fromBackend(a) : null);
          setBackendId(a?.id ?? null);
        })
        .catch(() => {
          if (!cancelled) {
            setAttempt(null);
            setBackendId(null);
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    } else {
      setBackendId(null);
      AsyncStorage.getItem(STORAGE_KEY)
        .then((stored) => {
          if (cancelled) return;
          if (stored) {
            const parsed = JSON.parse(stored) as QuitAttempt;
            // Only an ACTIVE attempt represents a live streak.
            setAttempt(parsed.status === 'ACTIVE' ? parsed : null);
          } else {
            setAttempt(null);
          }
        })
        .catch(() => {
          // Corrupt/unreadable value → treat as no streak.
          if (!cancelled) setAttempt(null);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [isRegistered, accessToken]);

  /** Persist a guest attempt to storage and state. */
  function persistLocal(next: QuitAttempt | null) {
    setAttempt(next);
    if (next) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else AsyncStorage.removeItem(STORAGE_KEY);
  }

  const startStreak = useCallback(
    (startedAt: Date = new Date()) => {
      const now = Date.now();
      const isBackdated = startedAt.getTime() < now;

      if (isRegistered && accessToken) {
        // Optimistic: show it immediately, reconcile with the server's canonical record.
        setAttempt({
          localId: 'pending',
          startedAt: startedAt.toISOString(),
          status: 'ACTIVE',
          isBackdated,
        });
        createAttempt(accessToken, isBackdated ? startedAt.toISOString() : undefined)
          .then((a) => {
            setAttempt(fromBackend(a));
            setBackendId(a.id);
          })
          .catch(() => {
            // Roll back the optimistic streak on failure.
            setAttempt(null);
            setBackendId(null);
          });
        return;
      }

      persistLocal({
        localId: generateLocalId(),
        startedAt: startedAt.toISOString(),
        status: 'ACTIVE',
        isBackdated,
      });
    },
    [isRegistered, accessToken],
  );

  const relapse = useCallback(() => {
    if (isRegistered && accessToken && backendId) {
      const id = backendId;
      setAttempt(null);
      setBackendId(null);
      relapseAttempt(accessToken, id).catch(() => undefined);
      return;
    }
    persistLocal(null);
  }, [isRegistered, accessToken, backendId]);

  const clearAfterSync = useCallback(() => {
    persistLocal(null);
  }, []);

  return (
    <QuitStreakContext value={{ attempt, isLoading, startStreak, relapse, clearAfterSync }}>
      {children}
    </QuitStreakContext>
  );
}

export function useQuitStreak() {
  const ctx = use(QuitStreakContext);
  if (!ctx) throw new Error('useQuitStreak must be used within QuitStreakProvider');
  return ctx;
}
