import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import {
  loginWithFirebase,
  logout as apiLogout,
  refreshTokens,
  type AuthUser,
} from '@/lib/api';

const ACCESS_KEY = 'quitqos.auth.access';
const REFRESH_KEY = 'quitqos.auth.refresh';
const USER_KEY = 'quitqos.auth.user';

export type AuthProvider_ = 'google' | 'apple';

type AuthContextValue = {
  /** The signed-in user, or null when browsing as a guest. */
  user: AuthUser | null;
  /** True until the persisted session has been read from storage. */
  isLoading: boolean;
  /** Current access token (for authenticated API calls). */
  accessToken: string | null;
  /** Sign in via a social provider. Returns the user on success. */
  signIn: (provider: AuthProvider_) => Promise<AuthUser>;
  /** Sign in with an existing email/password account. */
  signInWithEmail: (email: string, password: string) => Promise<AuthUser>;
  /** Create a new email/password account. */
  registerWithEmail: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * MOCK Firebase ID token. The real Google/Apple SDKs return a signed Firebase ID token; here we
 * send a stable email-shaped string that the backend's dev StubFirebaseTokenVerifier accepts (it
 * treats an "@"-containing token as the email → drives username derivation). Swapping in the real
 * SDK later means replacing this one line with the provider's `getIdToken()`.
 */
function mockIdToken(provider: AuthProvider_): string {
  return provider === 'google' ? 'demo.google@gmail.com' : 'demo.apple@icloud.com';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore a persisted session on mount; refresh the access token if we have a refresh token.
  useEffect(() => {
    (async () => {
      try {
        const [refresh, storedUser] = await Promise.all([
          AsyncStorage.getItem(REFRESH_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (refresh && storedUser) {
          // Rotate to a fresh access token; if it fails (revoked/expired), fall back to guest.
          const tokens = await refreshTokens(refresh);
          await persistTokens(tokens.accessToken, tokens.refreshToken);
          setAccessToken(tokens.accessToken);
          setUser(JSON.parse(storedUser) as AuthUser);
        }
      } catch {
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function persistTokens(access: string, refresh: string) {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, access],
      [REFRESH_KEY, refresh],
    ]);
  }

  async function clearSession() {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, USER_KEY]);
    setAccessToken(null);
    setUser(null);
  }

  /** Exchange a Firebase ID token for our session and persist it. */
  async function establishSession(idToken: string): Promise<AuthUser> {
    const res = await loginWithFirebase(idToken);
    await persistTokens(res.accessToken, res.refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setAccessToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }

  function signIn(provider: AuthProvider_): Promise<AuthUser> {
    return establishSession(mockIdToken(provider));
  }

  // MOCK email auth: the real Firebase SDK would sign in / create the account and return a signed
  // ID token; here we pass the email straight through (the backend stub verifier derives the
  // username from it). Swap both calls for Firebase's email/password methods with the real SDK.
  function signInWithEmail(email: string, _password: string): Promise<AuthUser> {
    return establishSession(email.trim().toLowerCase());
  }

  function registerWithEmail(email: string, _password: string): Promise<AuthUser> {
    return establishSession(email.trim().toLowerCase());
  }

  async function signOut() {
    const refresh = await AsyncStorage.getItem(REFRESH_KEY);
    if (refresh) {
      // Best-effort server-side revocation; clear locally regardless.
      await apiLogout(refresh).catch(() => undefined);
    }
    await clearSession();
  }

  return (
    <AuthContext
      value={{ user, isLoading, accessToken, signIn, signInWithEmail, registerWithEmail, signOut }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
