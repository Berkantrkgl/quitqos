import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  getIdToken,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  AppleAuthProvider,
} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { requestStreakChoice } from '@/components/streak-conflict-modal';
import {
  createAttempt,
  getCurrentAttempt,
  loginWithFirebase,
  logout as apiLogout,
  refreshTokens,
  relapseAttempt,
  syncQuitAttempts,
  type AuthUser,
  type SyncAttempt,
} from '@/lib/api';
import { registerFcmToken } from '@/lib/notifications';

const ACCESS_KEY = 'quitqos.auth.access';
const REFRESH_KEY = 'quitqos.auth.refresh';
const USER_KEY = 'quitqos.auth.user';

export type AuthProvider_ = 'google' | 'apple';

/**
 * Configure Google Sign-In once at module load. `webClientId` is REQUIRED even on Android — it is
 * the OAuth client Firebase uses to mint an ID token we can exchange for a Firebase credential.
 * Comes from the Firebase project (Authentication → Google → Web SDK config), via EXPO_PUBLIC_*.
 */
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

/** Raised when the user cancels a native sign-in sheet — treated as a no-op, not an error. */
class SignInCancelledError extends Error {
  constructor() {
    super('sign-in cancelled');
    this.name = 'SignInCancelledError';
  }
}

type AuthContextValue = {
  /** The signed-in user, or null when browsing as a guest. */
  user: AuthUser | null;
  /** True until the persisted session has been read from storage. */
  isLoading: boolean;
  /** Current access token (for authenticated API calls). */
  accessToken: string | null;
  /**
   * Sign in via a social provider. `pendingAttempts` is the guest's on-device quit history to
   * merge into the account once the session is established (guest→registered upgrade); `onSynced`
   * fires only after a successful merge, so the caller can drop the local copy.
   */
  signIn: (provider: AuthProvider_, pendingAttempts?: SyncAttempt[], onSynced?: () => void) => Promise<AuthUser>;
  /** Sign in with an existing email/password account. */
  signInWithEmail: (email: string, password: string, pendingAttempts?: SyncAttempt[], onSynced?: () => void) => Promise<AuthUser>;
  /** Create a new email/password account. */
  registerWithEmail: (email: string, password: string, pendingAttempts?: SyncAttempt[], onSynced?: () => void) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  /** Increments once each sign-in (and any streak merge) fully settles. */
  sessionVersion: number;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Run the native Google Sign-In flow and return a Firebase ID token. Google gives us its own
 * idToken → we wrap it in a Firebase credential → sign into Firebase → read Firebase's ID token
 * (that's what our backend's RealFirebaseTokenVerifier expects).
 */
async function googleFirebaseIdToken(): Promise<string> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type === 'cancelled' || !result.data) throw new SignInCancelledError();

  const idToken = result.data.idToken;
  if (!idToken) throw new Error('Google Sign-In returned no idToken');

  // RNFirebase's native Google credential builder rejects an empty accessToken, and signIn() no
  // longer returns one — fetch it explicitly. getTokens() returns both idToken and accessToken.
  const { accessToken } = await GoogleSignin.getTokens();

  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const userCredential = await signInWithCredential(getAuth(), credential);
  return getIdToken(userCredential.user);
}

/**
 * Apple sign-in via Firebase. iOS-only (the login screen only shows the Apple button on iOS), so
 * this path never runs on Android. Kept real so it works once we build for iOS on a Mac.
 */
async function appleFirebaseIdToken(): Promise<string> {
  // Lazy import: expo-apple-authentication is iOS-only and must not load on Android.
  const AppleAuthentication = await import('expo-apple-authentication');
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const { identityToken } = appleCredential;
  if (!identityToken) throw new Error('Apple Sign-In returned no identityToken');

  const credential = AppleAuthProvider.credential(identityToken);
  const userCredential = await signInWithCredential(getAuth(), credential);
  return getIdToken(userCredential.user);
}

/**
 * Merge the guest's on-device attempts into the freshly-signed-in account.
 *
 * The tricky case is a conflict: the account already has an ACTIVE streak AND
 * the device has one too (the user quit, logged out, started fresh, logged back
 * in). We can't guess which is "real" — only the user knows whether they
 * relapsed — so we ask. Their choice decides which streak survives; the other is
 * relapsed. When there's no conflict, we just sync (the backend's "earliest
 * wins" merge is harmless when only one side is active).
 *
 * Any failure is non-fatal: the session still stands and the local copy is kept
 * for a later retry rather than lost.
 */
async function mergeGuestAttempts(
  accessToken: string,
  pendingAttempts: SyncAttempt[],
  onSynced?: () => void,
) {
  try {
    const localActive = pendingAttempts.find((a) => a.status === 'ACTIVE');
    const accountActive = localActive ? await getCurrentAttempt(accessToken) : null;

    // Conflict: both sides have a live streak. Let the user decide.
    if (localActive && accountActive) {
      const choice = await requestStreakChoice({
        localStartedAt: localActive.startedAt,
        accountStartedAt: accountActive.startedAt,
      });

      if (choice === 'account') {
        // Keep the server streak; discard the device one without syncing it.
        onSynced?.();
        return;
      }
      // Keep the device streak: relapse the account's, then start the local one fresh.
      await relapseAttempt(accessToken, accountActive.id);
      await createAttempt(
        accessToken,
        localActive.isBackdated ? localActive.startedAt : undefined,
      );
      onSynced?.();
      return;
    }

    // No conflict → normal merge.
    await syncQuitAttempts(accessToken, pendingAttempts);
    onSynced?.();
  } catch {
    // Non-fatal: the session stands; local data is preserved for a retry.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /**
   * Bumped after a sign-in + any streak merge fully completes. Consumers (the
   * quit-streak provider) depend on it to re-read backend data once — this avoids
   * the race where a manual refresh runs before the new token has propagated.
   */
  const [sessionVersion, setSessionVersion] = useState(0);

  // Latest access token, read lazily by the FCM token-refresh listener so it never PUTs a stale one.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = accessToken;

  // While signed in, register this device's FCM token with the backend (and re-register on token
  // refresh) so it can push milestone notifications. Guests skip this — they use local scheduling.
  useEffect(() => {
    if (!user || !accessToken) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    registerFcmToken(() => tokenRef.current).then((off) => {
      if (cancelled) off();
      else unsubscribe = off;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // Re-run when the signed-in user changes (fresh device/token per account).
  }, [user?.id, accessToken]);

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

  /**
   * Exchange a Firebase ID token for our session and persist it. If the guest had on-device quit
   * attempts, merge them into the account here — the token is in hand, so no state-timing races.
   * A sync failure is non-fatal: the session still stands and the local data is kept for retry.
   */
  async function establishSession(
    idToken: string,
    pendingAttempts?: SyncAttempt[],
    onSynced?: () => void,
  ): Promise<AuthUser> {
    const res = await loginWithFirebase(idToken);
    await persistTokens(res.accessToken, res.refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setAccessToken(res.accessToken);
    setUser(res.user);

    if (pendingAttempts && pendingAttempts.length > 0) {
      await mergeGuestAttempts(res.accessToken, pendingAttempts, onSynced);
    }
    // Signal consumers that the session (and any merge) is settled, so they can
    // re-read backend data now that the token has propagated.
    setSessionVersion((v) => v + 1);
    return res.user;
  }

  async function signIn(
    provider: AuthProvider_,
    pendingAttempts?: SyncAttempt[],
    onSynced?: () => void,
  ): Promise<AuthUser> {
    const idToken =
      provider === 'google' ? await googleFirebaseIdToken() : await appleFirebaseIdToken();
    return establishSession(idToken, pendingAttempts, onSynced);
  }

  async function signInWithEmail(
    email: string,
    password: string,
    pendingAttempts?: SyncAttempt[],
    onSynced?: () => void,
  ): Promise<AuthUser> {
    const cred = await signInWithEmailAndPassword(getAuth(), email.trim().toLowerCase(), password);
    return establishSession(await getIdToken(cred.user), pendingAttempts, onSynced);
  }

  async function registerWithEmail(
    email: string,
    password: string,
    pendingAttempts?: SyncAttempt[],
    onSynced?: () => void,
  ): Promise<AuthUser> {
    const cred = await createUserWithEmailAndPassword(getAuth(), email.trim().toLowerCase(), password);
    return establishSession(await getIdToken(cred.user), pendingAttempts, onSynced);
  }

  async function signOut() {
    const refresh = await AsyncStorage.getItem(REFRESH_KEY);
    if (refresh) {
      // Best-effort server-side revocation; clear locally regardless.
      await apiLogout(refresh).catch(() => undefined);
    }
    // Also sign out of Firebase + Google so the next sign-in re-prompts rather than silently reusing.
    await firebaseSignOut(getAuth()).catch(() => undefined);
    if (Platform.OS !== 'web') await GoogleSignin.signOut().catch(() => undefined);
    await clearSession();
  }

  return (
    <AuthContext
      value={{ user, isLoading, accessToken, signIn, signInWithEmail, registerWithEmail, signOut, sessionVersion }}
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

/** True when the caller cancelled a native sign-in sheet — the UI should treat this as a no-op. */
export function isSignInCancellation(err: unknown): boolean {
  if (err instanceof SignInCancelledError) return true;
  return isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED;
}
