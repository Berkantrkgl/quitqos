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
