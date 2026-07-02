import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

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
  /** True until the persisted value has been read from storage. */
  isLoading: boolean;
  /** Begin a new streak. `startedAt` defaults to now; a past date backdates. */
  startStreak: (startedAt?: Date) => void;
  /** End the current streak (relapse). Clears the on-device attempt. */
  relapse: () => void;
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

export function QuitStreakProvider({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState<QuitAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load the persisted attempt once on mount.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as QuitAttempt;
          // Only an ACTIVE attempt represents a live streak.
          if (parsed.status === 'ACTIVE') setAttempt(parsed);
        }
      })
      .catch(() => {
        // Corrupt/unreadable value → treat as no streak.
      })
      .finally(() => setIsLoading(false));
  }, []);

  function persist(next: QuitAttempt | null) {
    setAttempt(next);
    if (next) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else AsyncStorage.removeItem(STORAGE_KEY);
  }

  function startStreak(startedAt: Date = new Date()) {
    const now = Date.now();
    persist({
      localId: generateLocalId(),
      startedAt: startedAt.toISOString(),
      status: 'ACTIVE',
      isBackdated: startedAt.getTime() < now,
    });
  }

  function relapse() {
    persist(null);
  }

  return (
    <QuitStreakContext value={{ attempt, isLoading, startStreak, relapse }}>
      {children}
    </QuitStreakContext>
  );
}

export function useQuitStreak() {
  const ctx = use(QuitStreakContext);
  if (!ctx) throw new Error('useQuitStreak must be used within QuitStreakProvider');
  return ctx;
}
