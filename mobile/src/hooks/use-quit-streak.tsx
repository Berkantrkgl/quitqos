import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  createAttempt,
  getCurrentAttempt,
  relapseAttempt,
  type QuitAttemptResponse,
} from '@/lib/api';
import { cancelGuestMilestones, scheduleGuestMilestones } from '@/lib/notifications';

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
  /** Re-read the current attempt from the source of truth (backend or storage). */
  refresh: () => Promise<void>;
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
  const { user, accessToken, sessionVersion, isLoading: authLoading } = useAuth();
  const [attempt, setAttempt] = useState<QuitAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Backend id of the active attempt, needed to relapse it. Null for guests.
  const [backendId, setBackendId] = useState<string | null>(null);

  const isRegistered = !!(user && accessToken);

  /**
   * Load the current attempt from the source of truth for the current auth
   * state (backend when registered, on-device storage for guests). Exposed as
   * `refresh` so callers can re-sync after a login/merge changes server data
   * without an accessToken change (e.g. the streak-conflict resolution).
   */
  const loadAttempt = useCallback(async () => {
    // Wait until auth is resolved. On a cold start the persisted session hasn't been restored yet,
    // so we don't yet know if this is a guest or a registered user — reading now would wrongly take
    // the guest branch (empty storage) and flash the start prompt before the backend streak loads.
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    try {
      if (isRegistered && accessToken) {
        const a = await getCurrentAttempt(accessToken);
        setAttempt(a ? fromBackend(a) : null);
        setBackendId(a?.id ?? null);
      } else {
        setBackendId(null);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = stored ? (JSON.parse(stored) as QuitAttempt) : null;
        // Only an ACTIVE attempt represents a live streak.
        const active = parsed && parsed.status === 'ACTIVE' ? parsed : null;
        setAttempt(active);
        // Re-arm local milestone notifications for an existing guest streak (idempotent). Covers
        // permission granted after starting, a reinstall, or the OS clearing scheduled items.
        if (active) void scheduleGuestMilestones(new Date(active.startedAt));
      }
    } catch {
      // Network/parse failure → treat as no streak.
      setAttempt(null);
      setBackendId(null);
    } finally {
      setIsLoading(false);
    }
    // sessionVersion is intentionally a dep: a sign-in + streak merge changes
    // backend data without changing the token, so we re-read when it settles.
    // authLoading is a dep so we re-run once the persisted session is restored.
  }, [isRegistered, accessToken, sessionVersion, authLoading]);

  // Reload whenever auth state changes (guest ↔ registered, token rotation) or a
  // sign-in/merge settles (sessionVersion bump).
  useEffect(() => {
    void loadAttempt();
  }, [loadAttempt]);

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
      // Guests get their milestone notifications as local, pre-scheduled ones (no backend/FCM).
      void scheduleGuestMilestones(startedAt);
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
    // Guest streak ended — drop its scheduled local notifications.
    void cancelGuestMilestones();
  }, [isRegistered, accessToken, backendId]);

  const clearAfterSync = useCallback(() => {
    persistLocal(null);
    // Data moved to the account; the backend (FCM) owns notifications from here.
    void cancelGuestMilestones();
  }, []);

  return (
    <QuitStreakContext value={{ attempt, isLoading, startStreak, relapse, clearAfterSync, refresh: loadAttempt }}>
      {children}
    </QuitStreakContext>
  );
}

export function useQuitStreak() {
  const ctx = use(QuitStreakContext);
  if (!ctx) throw new Error('useQuitStreak must be used within QuitStreakProvider');
  return ctx;
}
