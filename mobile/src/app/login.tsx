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
        mode === 'register'
          ? registerWithEmail(mail, password, pendingAttempts, clearAfterSync)
          : signInWithEmail(mail, password, pendingAttempts, clearAfterSync),
      'email',
    );
  }

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
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText type="smallBold" themeColor="textSecondary">
                  ✕
                </ThemedText>
              </Pressable>
            </View>

            {/* Brand + copy */}
            <View style={styles.hero}>
              <ThemedText style={styles.logo}>🚭</ThemedText>
              <ThemedText type="subtitle" style={styles.title}>
                {t('auth.title')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                {t('auth.subtitle')}
              </ThemedText>
            </View>

            {error ? (
              <ThemedText type="small" themeColor="danger" style={styles.error}>
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
              <ThemedText type="eyebrow" themeColor="textSecondary">
                {t('auth.or')}
              </ThemedText>
              <View style={[styles.line, { backgroundColor: theme.border }]} />
            </View>

            {/* Email + password */}
            <View style={styles.form}>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder={t('auth.email')}
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!anyBusy}
              />
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder={t('auth.password')}
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                textContentType={mode === 'register' ? 'newPassword' : 'password'}
                editable={!anyBusy}
              />
              <Pressable
                onPress={handleEmailSubmit}
                disabled={anyBusy}
                style={({ pressed }) => [
                  styles.submit,
                  { backgroundColor: theme.primary, opacity: anyBusy && busy !== 'email' ? 0.5 : pressed ? 0.85 : 1 },
                ]}
              >
                {busy === 'email' ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <ThemedText type="smallBold" themeColor="onPrimary">
                    {mode === 'register' ? t('auth.emailRegister') : t('auth.emailSignIn')}
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setMode(mode === 'signIn' ? 'register' : 'signIn');
                  setError(null);
                }}
                disabled={anyBusy}
                hitSlop={8}
                style={styles.toggle}
              >
                <ThemedText type="small" themeColor="primary">
                  {mode === 'signIn' ? t('auth.toggleToRegister') : t('auth.toggleToSignIn')}
                </ThemedText>
              </Pressable>
            </View>

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

            <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
              {t('auth.legal')}
            </ThemedText>
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

/** A branded social sign-in button: white/bordered (Google) or black (Apple). */
function ProviderButton({ label, icon, busy, disabled, onPress, variant }: ProviderButtonProps) {
  const theme = useTheme();
  const isDark = variant === 'dark';
  const bg = isDark ? '#000000' : theme.background;
  const fg = isDark ? '#FFFFFF' : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.provider,
        {
          backgroundColor: bg,
          borderColor: isDark ? '#000000' : theme.border,
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
  scroll: { flexGrow: 1, paddingBottom: Spacing.four },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: Spacing.two,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.four,
  },
  logo: {
    fontSize: 48,
    lineHeight: 56,
    marginBottom: Spacing.one,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', maxWidth: 300 },
  error: { textAlign: 'center', marginBottom: Spacing.two },
  buttons: { gap: Spacing.three },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 52,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  providerIcon: {
    fontSize: 18,
    fontWeight: '700',
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
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  submit: {
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: { alignItems: 'center', paddingVertical: Spacing.two },
  guest: { alignItems: 'center', paddingVertical: Spacing.three },
  legal: {
    textAlign: 'center',
    paddingBottom: Spacing.two,
    fontSize: 11,
    lineHeight: 16,
  },
});
