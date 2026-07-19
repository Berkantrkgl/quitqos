import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountSheet } from '@/components/delete-account-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getEarnedMilestoneCount } from '@/constants/milestones';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { useQuitStreak } from '@/hooks/use-quit-streak';
import { useTheme } from '@/hooks/use-theme';
import { type AppLanguage, SUPPORTED_LANGUAGES } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import { getMyRank, updateMe } from '@/lib/api';
import {
  cancelGuestMilestones,
  getNotificationPermission,
  NOTIF_PREF_KEY,
  registerFcmToken,
  requestNotificationPermission,
  scheduleGuestMilestones,
} from '@/lib/notifications';
import { type ThemePreference, useAppTheme } from '@/theme/theme-provider';

type ThemeOption = {
  value: ThemePreference;
  labelKey: 'settings.themeSystem' | 'settings.themeLight' | 'settings.themeDark';
  icon: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', labelKey: 'settings.themeSystem', icon: '📱' },
  { value: 'light', labelKey: 'settings.themeLight', icon: '☀️' },
  { value: 'dark', labelKey: 'settings.themeDark', icon: '🌙' },
];

const LANGUAGE_META: Record<AppLanguage, { labelKey: 'language.tr' | 'language.en'; flag: string }> = {
  tr: { labelKey: 'language.tr', flag: '🇹🇷' },
  en: { labelKey: 'language.en', flag: '🇬🇧' },
};


/**
 * Settings & Profile — the "Sükût" design (see design/sukut/settings.html).
 * Registered users see a profile masthead + streak stats; guests see a plain
 * "Sign in" button. Both share Notifications · Appearance · Language.
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { preference, setPreference } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const { user, signOut, deleteAccount } = useAuth();
  const [deleteVisible, setDeleteVisible] = useState(false);

  /** Confirm before signing out — it's easy to hit by accident, and a tap shouldn't end the session. */
  function confirmSignOut() {
    Alert.alert(t('auth.signOutConfirmTitle'), t('auth.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Modal header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('settings.title')}
          </ThemedText>
          <CloseButton onPress={() => router.back()} />
        </View>

        {/* Top: profile masthead (registered) or a plain sign-in (guest). */}
        {user ? <ProfileMasthead username={user.username} /> : <GuestSignIn />}

        {/* Notifications */}
        <Section title={t('settings.notifications')}>
          <NotificationsRow initial={user?.notificationsEnabled ?? true} />
        </Section>

        {/* Appearance */}
        <Section title={t('settings.theme')}>
          <ThemeSegment preference={preference} setPreference={setPreference} />
        </Section>

        {/* Language */}
        <Section title={t('settings.language')}>
          <View style={styles.langRow}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <LanguageCard
                key={lang}
                lang={lang}
                selected={language === lang}
                onPress={() => setLanguage(lang)}
              />
            ))}
          </View>
        </Section>

        {/* Footer: sign out (registered) pinned to the bottom + delete link + version */}
        <View style={styles.footer}>
          {user ? <SignOutButton onPress={confirmSignOut} /> : null}
          {user ? <DeleteAccountLink onPress={() => setDeleteVisible(true)} /> : null}
          <ThemedText type="small" themeColor="textTertiary" style={styles.version}>
            {t('common.appName')} · {t('settings.version', { version: '1.0.0' })}
          </ThemedText>
        </View>
      </SafeAreaView>

      {/* Account deletion confirmation (registered-only). On success the session drops to guest and
          we close the settings modal. */}
      <DeleteAccountSheet
        visible={deleteVisible}
        onCancel={() => setDeleteVisible(false)}
        onConfirm={async () => {
          await deleteAccount();
          setDeleteVisible(false);
          router.back();
        }}
      />
    </ThemedView>
  );
}

/**
 * "Delete my account" — a quiet, underline-free tertiary link below sign-out. Deliberately low
 * emphasis (App Store requires the option to exist, not to be prominent). Registered-only.
 */
function DeleteAccountLink({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('settings.deleteAccount')}
      style={({ pressed }) => [styles.deleteLink, { opacity: pressed ? 0.6 : 1 }]}
    >
      <ThemedText type="small" themeColor="textTertiary">
        {t('settings.deleteAccount')}
      </ThemedText>
    </Pressable>
  );
}

/** Rounded close button (root Stack has no header). */
function CloseButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const th = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
      style={({ pressed }) => [
        styles.closeButton,
        { backgroundColor: th.backgroundElement, borderColor: th.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <ThemedText type="smallBold" themeColor="textSecondary">
        ✕
      </ThemedText>
    </Pressable>
  );
}

/**
 * Sign out — Sükût "quiet filled" button (design/sukut/settings-signout.html, Yön A):
 * neutral surface + hairline + Lucide log-out glyph, danger-colored label. Visible and
 * tappable without stealing attention from the teal CTA. Registered-only.
 */
function SignOutButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const th = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('auth.signOut')}
      style={({ pressed }) => [
        styles.signOut,
        {
          backgroundColor: th.backgroundElement,
          borderColor: th.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <LogOut size={17} color={th.danger} strokeWidth={2} />
      <ThemedText type="smallBold" themeColor="danger" style={styles.signOutText}>
        {t('auth.signOut')}
      </ThemedText>
    </Pressable>
  );
}

/** Registered: avatar + @username + streak subtitle, then a stats strip. */
function ProfileMasthead({ username }: { username: string }) {
  const { t } = useTranslation();
  const th = useTheme();
  const { accessToken } = useAuth();
  const { attempt } = useQuitStreak();
  const elapsed = useElapsedTime(attempt?.startedAt ?? null);

  const currentDays = elapsed?.days ?? 0;
  const badges = getEarnedMilestoneCount(elapsed?.totalMinutes ?? 0);
  const longestDays = useLongestStreakDays(accessToken, currentDays);

  return (
    <>
      <View style={[styles.prof, { borderBottomColor: th.border }]}>
        <View style={[styles.avatar, { backgroundColor: th.primary }]}>
          <ThemedText type="subtitle" themeColor="onPrimary" style={styles.avatarLetter}>
            {username.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.profText}>
          <ThemedText type="smallBold" style={styles.profName}>
            @{username}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {attempt
              ? t('home.dashboard.headerSubtitle', { count: currentDays })
              : t('settings.noStreak')}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.stats, { borderBottomColor: th.border }]}>
        <Stat value={currentDays} label={t('settings.statCurrent')} />
        <Divider />
        <Stat value={longestDays} label={t('settings.statLongest')} />
        <Divider />
        <Stat value={badges} label={t('settings.statBadges')} />
      </View>
    </>
  );
}

/**
 * The caller's longest-ever streak (in whole days) from the leaderboard's `longest` metric.
 * Falls back to `currentDays` until it loads (and on error), so the stat is never shown as less
 * than the current streak or as a 0-flash. Registered-only — the masthead only renders with a user.
 */
function useLongestStreakDays(accessToken: string | null, currentDays: number): number {
  const [longestDays, setLongestDays] = useState<number | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getMyRank(accessToken, 'longest')
      .then((me) => {
        if (!cancelled) setLongestDays(daysFromSeconds(me.streakSeconds));
      })
      .catch(() => {
        // Non-fatal: keep the fallback (current) rather than surfacing an error in a stat tile.
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // Guard: the fetched longest can lag the live current streak by a day, so never show less.
  return Math.max(longestDays ?? 0, currentDays);
}

/** Whole days from a streak duration in seconds. */
function daysFromSeconds(seconds: number): number {
  return Math.floor(seconds / 86400);
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="title" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="eyebrow" themeColor="textTertiary">
        {label}
      </ThemedText>
    </View>
  );
}

function Divider() {
  const th = useTheme();
  return <View style={[styles.statDivider, { backgroundColor: th.border }]} />;
}

/** Guest: a plain primary sign-in button + one-line hint. */
function GuestSignIn() {
  const { t } = useTranslation();
  const th = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.guestWrap, { borderBottomColor: th.border }]}>
      <Pressable
        onPress={() => router.push('/login')}
        style={({ pressed }) => [
          styles.signInButton,
          { backgroundColor: th.primary, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <ThemedText type="smallBold" themeColor="onPrimary" style={styles.signInText}>
          {t('auth.title')}
        </ThemedText>
      </Pressable>
      <ThemedText type="small" themeColor="textSecondary" style={styles.guestHint}>
        {t('auth.subtitle')}
      </ThemedText>
    </View>
  );
}

/** A titled settings group. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="eyebrow" themeColor="textTertiary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

/**
 * Notifications on/off — reflects the real OS permission, not just a stored flag.
 *
 * The switch shows ON only when the user's preference is on AND the OS hasn't blocked notifications;
 * a blocked OS permission forces it visibly OFF (so it never claims "on" while nothing arrives). It
 * re-reads the OS permission on every focus, so flipping it in the device Settings is picked up.
 *
 * Turning ON requests the OS permission (guest and registered alike). If the OS has blocked it and
 * can no longer prompt, we route the user to the device Settings instead of silently doing nothing.
 * For **guests** ON (re)schedules local milestone notifications; for **registered** users ON also
 * registers the FCM token and PATCHes `/users/me { notificationsEnabled }`.
 */
function NotificationsRow({ initial }: { initial: boolean }) {
  const { t } = useTranslation();
  const th = useTheme();
  const { user, accessToken } = useAuth();
  const { attempt } = useQuitStreak();
  const [pref, setPref] = useState(initial);
  const [permission, setPermission] = useState<'granted' | 'blocked' | 'undetermined'>('undetermined');
  // Set when we send the user to the device Settings from a blocked state: if they come back with
  // permission granted, we honour their original "turn on" intent and enable automatically.
  const pendingEnableRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_PREF_KEY).then((v) => {
      if (v != null) setPref(v === 'true');
    });
  }, []);

  // Re-read the OS permission and, if the user came back from device Settings to grant a previously
  // blocked permission, finish enabling for them.
  const syncPermission = useCallback(async () => {
    const p = await getNotificationPermission();
    setPermission(p);
    if (pendingEnableRef.current && p === 'granted') {
      pendingEnableRef.current = false;
      await enableNotifications();
    }
    // enableNotifications reads the latest user/accessToken/attempt via closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken, attempt]);

  // Two triggers, because returning from the device Settings app is NOT a screen navigation:
  //   1. useFocusEffect — catches navigating back to this screen within the app.
  //   2. AppState 'active' — catches the app coming back to the foreground (e.g. from Settings).
  // The second is the one that fixes "granted the permission in Settings but the toggle stayed off".
  useFocusEffect(
    useCallback(() => {
      void syncPermission();
    }, [syncPermission]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncPermission();
    });
    return () => sub.remove();
  }, [syncPermission]);

  // The switch is ON only when the user wants it AND the OS hasn't blocked it.
  const on = pref && permission !== 'blocked';

  async function persistPref(next: boolean) {
    setPref(next);
    await AsyncStorage.setItem(NOTIF_PREF_KEY, String(next));
  }

  /** Persist the ON preference and fire the side effects (guest schedule / registered token+PATCH). */
  async function enableNotifications() {
    await persistPref(true);
    if (user && accessToken) {
      // Registered: make sure the device token is registered now, and let the backend resume pushes.
      void registerFcmToken(() => accessToken);
      updateMe(accessToken, { notificationsEnabled: true }).catch(() => undefined);
    } else if (attempt) {
      // Guest: schedule the local milestone notifications for the running streak.
      void scheduleGuestMilestones(new Date(attempt.startedAt));
    }
  }

  async function turnOn() {
    // Blocked at the OS level and we can't prompt: send them to Settings, don't fake an ON state.
    // Remember the intent so we auto-enable when they return with permission granted.
    if (permission === 'blocked') {
      Alert.alert(t('settings.notifBlockedTitle'), t('settings.notifBlockedBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.notifOpenSettings'),
          onPress: () => {
            pendingEnableRef.current = true;
            void Linking.openSettings();
          },
        },
      ]);
      return;
    }

    const granted = await requestNotificationPermission();
    const p = await getNotificationPermission();
    setPermission(p);
    if (!granted) {
      // User dismissed/denied the prompt — leave the switch OFF, don't persist an ON preference.
      return;
    }

    await enableNotifications();
  }

  async function turnOff() {
    await persistPref(false);
    if (user && accessToken) {
      updateMe(accessToken, { notificationsEnabled: false }).catch(() => undefined);
    } else {
      void cancelGuestMilestones();
    }
  }

  return (
    <View style={styles.notifRow}>
      <View style={styles.notifText}>
        <ThemedText type="smallBold" style={styles.notifTitle}>
          {t('settings.notificationsTitle')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('settings.notificationsHint')}
        </ThemedText>
      </View>
      <Pressable
        onPress={() => void (on ? turnOff() : turnOn())}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        style={[styles.switch, { backgroundColor: on ? th.primary : th.borderStrong }]}
      >
        <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
      </Pressable>
    </View>
  );
}

/** Segmented control for the theme preference. */
function ThemeSegment({
  preference,
  setPreference,
}: {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}) {
  const { t } = useTranslation();
  const th = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: th.backgroundElement }]}>
      {THEME_OPTIONS.map((opt) => {
        const selected = preference === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => setPreference(opt.value)}
            style={[styles.segmentItem, selected && { backgroundColor: th.background }, selected && styles.segmentItemSelected]}
          >
            <ThemedText style={styles.segmentIcon}>{opt.icon}</ThemedText>
            <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
              {t(opt.labelKey)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A language choice card. */
function LanguageCard({
  lang,
  selected,
  onPress,
}: {
  lang: AppLanguage;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const th = useTheme();
  const meta = LANGUAGE_META[lang];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.langCard,
        {
          backgroundColor: th.background,
          borderColor: selected ? th.primary : th.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <ThemedText style={styles.flag}>{meta.flag}</ThemedText>
      <ThemedText type="small" themeColor={selected ? 'primaryText' : 'text'}>
        {t(meta.labelKey)}
      </ThemedText>
      {selected ? (
        <ThemedText type="smallBold" themeColor="primaryText" style={styles.langCheck}>
          ✓
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // profile
  prof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
  },
  profText: {
    gap: 2,
  },
  profName: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: Spacing.three + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
    gap: 3,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginRight: Spacing.three,
    marginLeft: -Spacing.half,
  },

  // guest
  guestWrap: {
    paddingBottom: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
  },
  signInButton: {
    paddingVertical: Spacing.three,
    borderRadius: 14,
    alignItems: 'center',
  },
  signInText: {
    fontSize: 15,
    lineHeight: 20,
  },
  guestHint: {
    textAlign: 'center',
    lineHeight: 19,
  },

  // sections
  section: {
    marginTop: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.three,
  },

  // notifications
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  notifText: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  switch: {
    width: 46,
    height: 28,
    borderRadius: 999,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
  knobOff: {
    alignSelf: 'flex-start',
  },

  // appearance
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two + 3,
    borderRadius: 9,
  },
  segmentItemSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentIcon: {
    fontSize: 13,
    lineHeight: 18,
  },

  // language
  langRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  langCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flag: {
    fontSize: 19,
    lineHeight: 23,
  },
  langCheck: {
    marginLeft: 'auto',
  },

  // footer
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  signOut: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  signOutText: {
    fontSize: 14,
    lineHeight: 18,
  },
  deleteLink: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
    marginTop: -Spacing.one,
  },
  version: {
    textAlign: 'center',
  },
});
