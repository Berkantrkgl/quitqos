import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth, isSignInCancellation, type AuthProvider_ } from '@/hooks/use-auth';
import { useQuitStreak } from '@/hooks/use-quit-streak';
import { useTheme } from '@/hooks/use-theme';
import type { SyncAttempt } from '@/lib/api';

type Busy = AuthProvider_ | 'email' | null;
type Mode = 'signIn' | 'register';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Firebase Auth error `code` → i18n key. Anything unrecognised falls back to the generic message. */
const FIREBASE_ERROR_KEYS = {
  'auth/invalid-email': 'auth.errInvalidEmail',
  'auth/user-disabled': 'auth.errUserDisabled',
  'auth/user-not-found': 'auth.errUserNotFound',
  'auth/wrong-password': 'auth.errWrongPassword',
  'auth/invalid-credential': 'auth.errWrongPassword',
  'auth/email-already-in-use': 'auth.errEmailInUse',
  'auth/weak-password': 'auth.errWeakPassword',
  'auth/network-request-failed': 'auth.errNetwork',
  'auth/too-many-requests': 'auth.errTooManyRequests',
} as const;

type AuthErrorKey = (typeof FIREBASE_ERROR_KEYS)[keyof typeof FIREBASE_ERROR_KEYS] | 'auth.error';

/** Map a caught sign-in error to an i18n key, preferring a specific Firebase code over the generic. */
function authErrorKey(err: unknown): AuthErrorKey {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
  return FIREBASE_ERROR_KEYS[code as keyof typeof FIREBASE_ERROR_KEYS] ?? 'auth.error';
}

/**
 * Login & register — the "Sükût" design (see design/sukut/login.html). One
 * screen; a toggle switches sign-in ↔ register. Google/Apple + email/password +
 * continue-as-guest. Auth logic is unchanged from before the restyle.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { signIn, signInWithEmail, registerWithEmail } = useAuth();
  const { attempt, clearAfterSync } = useQuitStreak();

  // The guest's on-device streak to merge into the account on sign-in (empty when there's none).
  const pendingAttempts: SyncAttempt[] = attempt
    ? [
        {
          startedAt: attempt.startedAt,
          status: attempt.status,
          isBackdated: attempt.isBackdated,
          localId: attempt.localId,
        },
      ]
    : [];

  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const anyBusy = busy !== null;
  const isRegister = mode === 'register';

  async function run(action: () => Promise<unknown>, which: Busy) {
    setBusy(which);
    setError(null);
    try {
      await action();
      // Sign-in (and any streak merge) is done. The quit-streak provider re-reads
      // backend data off the auth sessionVersion bump, so we just land on Home.
      router.replace('/');
    } catch (err) {
      // Cancelling a native sheet (Google/Apple) is a no-op, not an error — leave the screen alone.
      if (isSignInCancellation(err)) return;
      setError(t(authErrorKey(err)));
    } finally {
      setBusy(null);
    }
  }

  function handleEmailSubmit() {
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.shortPassword'));
      return;
    }
    run(
      () =>
        isRegister
          ? registerWithEmail(mail, password, pendingAttempts, clearAfterSync)
          : signInWithEmail(mail, password, pendingAttempts, clearAfterSync),
      'email',
    );
  }

  // Error highlight for the email/password fields (any error while typing credentials).
  const fieldError = error !== null && busy === null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Close */}
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                disabled={anyBusy}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">
                  ✕
                </ThemedText>
              </Pressable>
            </View>

            {/* Brand wordmark + copy */}
            <View style={styles.hero}>
              <ThemedText style={styles.wordmark}>
                Quit
                <ThemedText style={[styles.wordmark, { color: theme.primaryText }]}>QOS</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
                {isRegister ? t('auth.registerSubtitle') : t('auth.subtitle')}
              </ThemedText>
            </View>

            {error ? (
              <ThemedText type="smallBold" themeColor="danger" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}

            {/* Social providers */}
            <View style={styles.buttons}>
              <ProviderButton
                label={t('auth.google')}
                icon="G"
                busy={busy === 'google'}
                disabled={anyBusy}
                onPress={() => run(() => signIn('google', pendingAttempts, clearAfterSync), 'google')}
                variant="light"
              />
              {Platform.OS === 'ios' ? (
                <ProviderButton
                  label={t('auth.apple')}
                  icon=""
                  busy={busy === 'apple'}
                  disabled={anyBusy}
                  onPress={() => run(() => signIn('apple', pendingAttempts, clearAfterSync), 'apple')}
                  variant="dark"
                />
              ) : null}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
              <ThemedText type="eyebrow" themeColor="textTertiary">
                {t('auth.or')}
              </ThemedText>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
            </View>

            {/* Email + password */}
            <View style={styles.form}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: fieldError ? theme.danger : theme.border,
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                  },
                ]}
                placeholder={t('auth.email')}
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!anyBusy}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: fieldError ? theme.danger : theme.border,
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                  },
                ]}
                placeholder={isRegister ? t('auth.passwordHint') : t('auth.password')}
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                textContentType={isRegister ? 'newPassword' : 'password'}
                editable={!anyBusy}
              />
              <Pressable
                onPress={handleEmailSubmit}
                disabled={anyBusy}
                style={({ pressed }) => [
                  styles.submit,
                  { backgroundColor: theme.primary, opacity: anyBusy && busy !== 'email' ? 0.5 : pressed ? 0.9 : 1 },
                ]}
              >
                {busy === 'email' ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <ThemedText type="smallBold" themeColor="onPrimary" style={styles.submitText}>
                    {isRegister ? t('auth.emailRegister') : t('auth.emailSignIn')}
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setMode(isRegister ? 'signIn' : 'register');
                  setError(null);
                }}
                disabled={anyBusy}
                hitSlop={8}
                style={styles.switch}
              >
                <ThemedText type="smallBold" themeColor="primaryText">
                  {isRegister ? t('auth.toggleToSignIn') : t('auth.toggleToRegister')}
                </ThemedText>
              </Pressable>
            </View>

            {/* Guest + legal pinned to the bottom */}
            <View style={styles.footer}>
              <Pressable
                onPress={() => router.back()}
                disabled={anyBusy}
                hitSlop={8}
                style={styles.guest}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('auth.continueAsGuest')}
                </ThemedText>
              </Pressable>

              <ThemedText type="small" themeColor="textTertiary" style={styles.legal}>
                {t('auth.legal')}
              </ThemedText>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

type ProviderButtonProps = {
  label: string;
  icon: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
  variant: 'light' | 'dark';
};

/** A branded social sign-in button: filled neutral (Google) or solid ink (Apple). */
function ProviderButton({ label, icon, busy, disabled, onPress, variant }: ProviderButtonProps) {
  const theme = useTheme();
  const isDark = variant === 'dark';
  // Light variant: a filled surface with a stronger border so it reads clearly
  // against the near-white page (a hairline alone all but disappeared).
  const bg = isDark ? theme.text : theme.backgroundElement;
  const fg = isDark ? theme.background : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.provider,
        {
          backgroundColor: bg,
          borderColor: isDark ? theme.text : theme.borderStrong,
          borderWidth: isDark ? StyleSheet.hairlineWidth : 1,
          opacity: disabled && !busy ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <ThemedText style={[styles.providerIcon, { color: fg }]}>{icon}</ThemedText>
          <ThemedText type="smallBold" style={{ color: fg }}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  scroll: { flexGrow: 1, paddingBottom: Spacing.three },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: Spacing.two,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  wordmark: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 280,
    marginTop: Spacing.two + 2,
    lineHeight: 20,
  },
  error: { textAlign: 'center', marginBottom: Spacing.three },
  buttons: { gap: Spacing.three },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  providerIcon: {
    fontSize: 17,
    fontWeight: '800',
    width: 20,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  form: { gap: Spacing.three },
  input: {
    height: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  submit: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.half,
  },
  submitText: {
    fontSize: 15,
    lineHeight: 20,
  },
  switch: { alignItems: 'center', paddingVertical: Spacing.three, paddingBottom: Spacing.one },
  footer: {
    marginTop: 'auto',
    paddingTop: Spacing.four,
  },
  guest: { alignItems: 'center', paddingVertical: Spacing.three },
  legal: {
    textAlign: 'center',
    marginTop: Spacing.two,
    lineHeight: 16,
  },
});
