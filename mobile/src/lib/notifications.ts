/**
 * Guest milestone notifications — LOCAL only (no server, no Firebase).
 *
 * A guest never contacts the backend, so when they start a streak we pre-schedule one local
 * notification per milestone at `startedAt + offsetMinutes`. Registered users get milestone pushes
 * from the backend via FCM instead, so this is wired only into the guest branch of use-quit-streak.
 *
 * Everything here is a no-op-safe wrapper around expo-notifications: scheduling is idempotent
 * (cancel-all then reschedule), past offsets are skipped, and permission is requested lazily.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  requestPermission as requestMessagingPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { MILESTONES, milestoneDescription, milestoneTitle } from '@/constants/milestones';
import i18n from '@/i18n';
import { updateFcmToken } from '@/lib/api';

/** Android channel id for milestone notifications. */
const CHANNEL_ID = 'milestones';

/**
 * Shared key for the notifications on/off preference (also read by the settings toggle). Kept here
 * so the service is the single owner: guest scheduling honours it without callers touching storage.
 * Absent = enabled (opt-out).
 */
export const NOTIF_PREF_KEY = 'quitqos.notificationsEnabled';

/** Whether milestone notifications are enabled (defaults to true when the preference is unset). */
export async function isNotificationsEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(NOTIF_PREF_KEY);
    return v == null ? true : v === 'true';
  } catch {
    return true;
  }
}

/**
 * Dev-only time compression: when > 0 (and in __DEV__), fire milestones a few seconds apart instead
 * of at the real offsets (20 min … 1 year) so the flow is testable on an emulator without waiting.
 * The Nth scheduled milestone fires at (N+1) * DEV_STEP_SECONDS. **0 = use real offsets** (the
 * default now that the guest flow is verified). Flip to e.g. 15 to demo the schedule quickly.
 */
const DEV_STEP_SECONDS = 0;

/** Foreground presentation: show the banner even when the app is open (helps while testing). */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Create the Android channel once (no-op on iOS). Safe to call repeatedly. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Kilometre taşları',
    // HIGH so the notification pops as a heads-up banner (DEFAULT only makes a sound + tray entry).
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#0E9E77',
  });
}

/**
 * The OS notification-permission state, from the app's point of view:
 * - `granted`     — the OS allows notifications.
 * - `blocked`     — the user denied it and we can no longer show the system prompt (iOS: denied once;
 *                   Android 13+: denied twice). The only way back is the device Settings app.
 * - `undetermined`— never asked; requesting will show the system prompt.
 */
export type NotificationPermission = 'granted' | 'blocked' | 'undetermined';

/** Read the current OS notification permission without prompting. Never throws. */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    return current.canAskAgain ? 'undetermined' : 'blocked';
  } catch {
    return 'undetermined';
  }
}

/**
 * Ask for notification permission if not already granted. Returns true when notifications are
 * allowed. Never throws — a denied/failed permission just returns false and scheduling is skipped.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Cancel every scheduled local notification. Guest-only schedules these, so cancel-all is safe. */
export async function cancelGuestMilestones(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Non-fatal — nothing scheduled, or the module isn't available (e.g. web).
  }
}

/**
 * (Re)schedule the 13 milestone notifications for a guest streak that started at `startedAt`.
 * Idempotent: cancels any existing schedule first. Offsets already in the past (backdated streaks,
 * or the streak has been running a while) are skipped. Requests permission first; if denied, does
 * nothing. Title = milestone title, body = its health fact.
 */
export async function scheduleGuestMilestones(startedAt: Date): Promise<void> {
  if (!(await isNotificationsEnabled())) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await ensureAndroidChannel();
  await cancelGuestMilestones();

  const startMs = startedAt.getTime();
  const now = Date.now();

  for (let i = 0; i < MILESTONES.length; i++) {
    const m = MILESTONES[i];

    // Seconds from *now* until this milestone fires.
    let secondsUntil: number;
    if (__DEV__ && DEV_STEP_SECONDS > 0) {
      secondsUntil = (i + 1) * DEV_STEP_SECONDS;
    } else {
      const fireAtMs = startMs + m.offsetMinutes * 60_000;
      secondsUntil = Math.round((fireAtMs - now) / 1000);
    }

    // Skip offsets already crossed (backdated / long-running streak).
    if (secondsUntil <= 0) continue;

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `milestone-${m.key}`,
        content: {
          // Resolve against the i18n instance's current language, so a guest's
          // pre-scheduled notifications match the app language at schedule time.
          title: milestoneTitle(i18n.t, m),
          body: milestoneDescription(i18n.t, m),
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntil,
        },
      });
    } catch {
      // Skip a single failed schedule rather than aborting the whole set.
    }
  }
}

// ---- Registered: FCM push registration ------------------------------------
//
// Registered users don't use local scheduling — the backend sends milestone pushes via FCM. For
// that the backend needs this device's FCM token, so on sign-in / launch we fetch it and PUT it to
// `/users/me/fcm-token`. Firebase (not local) is the transport here.

/** Ask the OS + Firebase Messaging for push permission. Returns true when granted. Never throws. */
async function requestPushPermission(): Promise<boolean> {
  try {
    const status = await requestMessagingPermission(getMessaging(getApp()));
    return (
      status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

/**
 * Register this device's FCM token with the backend so it can push milestone notifications, keep it
 * current on token refresh, AND show pushes that arrive while the app is foregrounded. Call after a
 * session is established and on launch while signed in. `getAccessToken` is read lazily so a rotated
 * token is always used. Returns a single unsubscribe that tears down both listeners (no-op on
 * failure).
 *
 * Why the foreground display: Android auto-shows a `notification`-payload push only when the app is
 * backgrounded. In the foreground RNFirebase delivers it to `onMessage` with no UI, so we re-present
 * it locally via expo-notifications (same channel) — otherwise a milestone crossed while the user is
 * in the app would be silent.
 */
export async function registerFcmToken(
  getAccessToken: () => string | null,
): Promise<() => void> {
  const noop = () => {};
  try {
    if (!(await requestPushPermission())) return noop;

    await ensureAndroidChannel();
    const messaging = getMessaging(getApp());

    const push = async (fcmToken: string) => {
      const token = getAccessToken();
      if (!token || !fcmToken) return;
      try {
        await updateFcmToken(token, fcmToken);
      } catch {
        // Non-fatal: a failed registration just means no pushes until the next attempt.
      }
    };

    const current = await getToken(messaging);
    await push(current);

    // Firebase may rotate the token; keep the backend in sync.
    const offTokenRefresh = onTokenRefresh(messaging, (next: string) => void push(next));

    // Foreground pushes: re-present the notification locally (Android won't show it otherwise).
    const offMessage = onMessage(messaging, async (remote) => {
      const n = remote.notification;
      if (!n?.title && !n?.body) return;
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: n.title ?? '',
            body: n.body ?? '',
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
          trigger: null, // present immediately
        });
      } catch {
        // Non-fatal — a single dropped foreground banner isn't worth surfacing.
      }
    });

    return () => {
      offTokenRefresh();
      offMessage();
    };
  } catch {
    return noop;
  }
}
