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
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import {
  loginWithFirebase,
  logout as apiLogout,
  refreshTokens,
  syncQuitAttempts,
  type AuthUser,
  type SyncAttempt,
} from '@/lib/api';

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
      // Merge on-device history, then let the caller drop the local copy — but only on success, so
      // a failed sync keeps the data on-device for a later retry rather than losing it.
      try {
        await syncQuitAttempts(res.accessToken, pendingAttempts);
        onSynced?.();
      } catch {
        // Non-fatal: the session stands; local data is preserved.
      }
    }
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

/** True when the caller cancelled a native sign-in sheet — the UI should treat this as a no-op. */
export function isSignInCancellation(err: unknown): boolean {
  if (err instanceof SignInCancelledError) return true;
  return isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED;
}
