import { Platform } from 'react-native';

/**
 * Backend base URL. The Android emulator can't see the host's `localhost` — it maps the host to
 * 10.0.2.2. iOS simulator and web can use localhost directly. Override with EXPO_PUBLIC_API_URL
 * for a real device / staging.
 */
const DEFAULT_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE;

/** Shape of the backend standard error body. */
type ApiErrorBody = {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
};

/** Thrown for any non-2xx response; carries the HTTP status and the server's message. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Access token for the Authorization header. */
  accessToken?: string | null;
};

/**
 * Thin JSON fetch wrapper: sets headers, serializes the body, and turns non-2xx responses into
 * {@link ApiError}. Returns the parsed JSON, or `null` for 204/empty bodies.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = parsed as ApiErrorBody | null;
    throw new ApiError(res.status, err?.message ?? `Request failed (${res.status})`);
  }
  return parsed as T;
}

// ---- Endpoint shapes (mirror the backend DTOs) ----------------------------

export type AuthUser = {
  id: string;
  isGuest: boolean;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  notificationsEnabled: boolean;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

/** POST /auth/firebase — exchange a Firebase ID token for our token pair + profile. */
export function loginWithFirebase(firebaseIdToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/firebase', {
    method: 'POST',
    body: { firebaseIdToken },
  });
}

/** POST /auth/refresh — rotate the refresh token, get a fresh access token. */
export function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
}

/** POST /auth/logout — revoke the refresh token server-side. */
export function logout(refreshToken: string): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST', body: { refreshToken } });
}

// ---- Quit attempts (registered) -------------------------------------------

export type QuitStatus = 'ACTIVE' | 'RELAPSED';

/** Full attempt view (mirrors backend QuitAttemptResponse). */
export type QuitAttemptResponse = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: QuitStatus;
  isBackdated: boolean;
  elapsed: { days: number; hours: number; minutes: number; seconds: number };
};

/**
 * GET /quit-attempts/current — the active streak, or null when there is none (backend 404).
 * Any other error still throws.
 */
export async function getCurrentAttempt(accessToken: string): Promise<QuitAttemptResponse | null> {
  try {
    return await apiFetch<QuitAttemptResponse>('/quit-attempts/current', { accessToken });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** POST /quit-attempts — start a streak. Omit startedAt for "now"; a past ISO date backdates. */
export function createAttempt(
  accessToken: string,
  startedAt?: string,
): Promise<QuitAttemptResponse> {
  return apiFetch<QuitAttemptResponse>('/quit-attempts', {
    method: 'POST',
    body: startedAt ? { startedAt } : {},
    accessToken,
  });
}

/** POST /quit-attempts/{id}/relapse — end the active streak. */
export function relapseAttempt(accessToken: string, id: string): Promise<unknown> {
  return apiFetch<unknown>(`/quit-attempts/${id}/relapse`, { method: 'POST', body: {}, accessToken });
}

// ---- Sync (guest → registered upgrade) ------------------------------------

/** One device-local attempt to merge (mirrors backend SyncAttempt). */
export type SyncAttempt = {
  startedAt: string;
  endedAt?: string | null;
  status: 'ACTIVE' | 'RELAPSED';
  isBackdated: boolean;
  localId: string;
};

export type SyncResponse = {
  merged: number;
  skipped: number;
  currentAttemptId: string | null;
};

/** POST /users/me/sync — merge device quit-attempt history into the account (idempotent by localId). */
export function syncQuitAttempts(
  accessToken: string,
  quitAttempts: SyncAttempt[],
): Promise<SyncResponse> {
  return apiFetch<SyncResponse>('/users/me/sync', {
    method: 'POST',
    body: { quitAttempts },
    accessToken,
  });
}

// ---- Leaderboard ----------------------------------------------------------

/** Which streak the leaderboard ranks by: live active streak, or longest ever. */
export type LeaderboardMetric = 'current' | 'longest';

/** One ranked row (mirrors backend LeaderboardItem). rank is 1-based. */
export type LeaderboardItem = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  streakSeconds: number;
};

export type LeaderboardResponse = {
  metric: LeaderboardMetric;
  items: LeaderboardItem[];
};

/** The caller's own rank, or rank 0 when they aren't ranked (no active streak). */
export type LeaderboardMeResponse = {
  rank: number;
  streakSeconds: number;
  metric: LeaderboardMetric;
};

/** GET /leaderboard — ranked list for the metric (registered-only; guest → 403). */
export function getLeaderboard(
  accessToken: string,
  metric: LeaderboardMetric = 'current',
  limit = 50,
): Promise<LeaderboardResponse> {
  return apiFetch<LeaderboardResponse>(`/leaderboard?metric=${metric}&limit=${limit}`, {
    accessToken,
  });
}

/** GET /leaderboard/me — the caller's own rank for the metric. */
export function getMyRank(
  accessToken: string,
  metric: LeaderboardMetric = 'current',
): Promise<LeaderboardMeResponse> {
  return apiFetch<LeaderboardMeResponse>(`/leaderboard/me?metric=${metric}`, { accessToken });
}
