import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import {
  getLeaderboard,
  getMyRank,
  type LeaderboardItem,
  type LeaderboardMeResponse,
} from '@/lib/api';

// Decorative sample rows behind the sign-in gate — not real data. They show a
// guest what the leaderboard looks like without inventing a rank for them.
const SAMPLE_ROWS = [
  { rank: 1, username: 'aysekaya', days: 312, medal: '🥇' },
  { rank: 2, username: 'mehmet_d', days: 287, medal: '🥈' },
  { rank: 3, username: 'zeynep06', days: 264, medal: '🥉' },
  { rank: 4, username: 'can_t', days: 198, medal: null },
  { rank: 5, username: 'elifs', days: 156, medal: null },
];

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** Whole days from a streak duration in seconds. */
function daysFromSeconds(seconds: number): number {
  return Math.floor(seconds / 86400);
}

export default function LeaderboardScreen() {
  const { user, accessToken } = useAuth();
  return user && accessToken ? <RankedList accessToken={accessToken} myId={user.id} /> : <GuestGate />;
}

// ---- Registered: live ranking ---------------------------------------------

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: LeaderboardItem[]; me: LeaderboardMeResponse };

function RankedList({ accessToken, myId }: { accessToken: string; myId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  // Reload every time the tab regains focus so a streak started on Home shows up here.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setState({ status: 'loading' });
      Promise.all([getLeaderboard(accessToken, 'current'), getMyRank(accessToken, 'current')])
        .then(([board, me]) => {
          if (!cancelled) setState({ status: 'ready', items: board.items, me });
        })
        .catch(() => {
          if (!cancelled) setState({ status: 'error' });
        });
      return () => {
        cancelled = true;
      };
    }, [accessToken]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{t('leaderboardScreen.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('leaderboardScreen.subtitle')}
          </ThemedText>
        </View>

        {state.status === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : state.status === 'error' ? (
          <View style={styles.centered}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
              {t('leaderboardScreen.error')}
            </ThemedText>
          </View>
        ) : state.items.length === 0 ? (
          <View style={styles.centered}>
            <ThemedText style={styles.emptyIcon}>🏁</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
              {t('leaderboardScreen.empty')}
            </ThemedText>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            >
              {state.items.map((row) => {
                const isMe = row.userId === myId;
                return (
                  <View
                    key={row.userId}
                    style={[
                      styles.row,
                      {
                        backgroundColor: isMe ? theme.primaryMuted : theme.backgroundElement,
                        borderColor: isMe ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.rank}>
                      {MEDALS[row.rank] ?? row.rank}
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
                      @{row.username}
                      {isMe ? ` · ${t('leaderboardScreen.you')}` : ''}
                    </ThemedText>
                    <ThemedText type="smallBold" themeColor="primary" style={styles.days}>
                      {daysFromSeconds(row.streakSeconds)}
                      <ThemedText type="small" themeColor="textSecondary">
                        {' '}
                        {t('leaderboardScreen.dayUnit')}
                      </ThemedText>
                    </ThemedText>
                  </View>
                );
              })}
            </ScrollView>

            {/* Pinned standing bar: always tells the user where they are. Skipped only when their
                own row is already visible in the list above (it's highlighted there). */}
            <MyStandingBar
              me={state.me}
              visibleInList={state.items.some((r) => r.userId === myId)}
            />
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Fixed bar under the list showing the caller's own standing, so they always know where they are
 * even when their rank is far below the visible top slice. Renders the "start a streak" hint when
 * they aren't ranked yet (rank 0), and nothing when their row is already visible in the list.
 */
function MyStandingBar({
  me,
  visibleInList,
}: {
  me: LeaderboardMeResponse;
  visibleInList: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (me.rank > 0 && visibleInList) return null;

  return (
    <View style={[styles.standingBar, { backgroundColor: theme.primaryMuted, borderColor: theme.primary }]}>
      {me.rank === 0 ? (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.standingText}>
          {t('leaderboardScreen.notRanked')}
        </ThemedText>
      ) : (
        <>
          <ThemedText type="smallBold" themeColor="primary" style={styles.rank}>
            {me.rank}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
            {t('leaderboardScreen.you')}
          </ThemedText>
          <ThemedText type="smallBold" themeColor="primary" style={styles.days}>
            {daysFromSeconds(me.streakSeconds)}
            <ThemedText type="small" themeColor="textSecondary">
              {' '}
              {t('leaderboardScreen.dayUnit')}
            </ThemedText>
          </ThemedText>
        </>
      )}
    </View>
  );
}

// ---- Guest: sign-in upsell (unchanged) ------------------------------------

function GuestGate() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{t('leaderboardScreen.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('leaderboardScreen.subtitle')}
          </ThemedText>
        </View>

        {/* Preview of the ranking, faded to signal it's a sample, not live. */}
        <View style={styles.previewArea} pointerEvents="none">
          {SAMPLE_ROWS.map((row, i) => (
            <View
              key={row.rank}
              style={[
                styles.row,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  opacity: 1 - i * 0.16,
                },
              ]}
            >
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.rank}>
                {row.medal ?? row.rank}
              </ThemedText>
              <ThemedText type="smallBold" style={styles.name}>
                @{row.username}
              </ThemedText>
              <ThemedText type="smallBold" themeColor="primary" style={styles.days}>
                {row.days}
                <ThemedText type="small" themeColor="textSecondary">
                  {' '}
                  {t('leaderboardScreen.dayUnit')}
                </ThemedText>
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Sign-in gate card, centered over the fading preview. */}
        <View style={styles.gate}>
          <View style={[styles.gateCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText style={styles.gateIcon}>🏆</ThemedText>
            <ThemedText type="smallBold" style={styles.gateTitle}>
              {t('leaderboardScreen.lockTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.gateBody}>
              {t('leaderboardScreen.lockBody')}
            </ThemedText>

            <View style={styles.benefits}>
              <Benefit icon="🏅" text={t('leaderboardScreen.benefitRank')} />
              <Benefit icon="☁️" text={t('leaderboardScreen.benefitSync')} />
              <Benefit icon="🔥" text={t('leaderboardScreen.benefitStreak')} />
            </View>

            <Pressable
              onPress={() => router.push('/login')}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <ThemedText type="smallBold" themeColor="onPrimary">
                {t('leaderboardScreen.signIn')}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <ThemedText type="small">{icon}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.benefitText}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  previewArea: {
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  centeredText: {
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 44,
    lineHeight: 52,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  rank: {
    width: 24,
    textAlign: 'center',
    fontSize: 16,
  },
  name: {
    flex: 1,
  },
  days: {
    fontVariant: ['tabular-nums'],
  },
  // Pinned "your standing" bar below the scrollable list.
  standingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  standingText: {
    flex: 1,
    textAlign: 'center',
  },
  // The gate card floats over the preview, filling the lower area.
  gate: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
    alignItems: 'center',
  },
  gateCard: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  gateIcon: {
    fontSize: 44,
    lineHeight: 52,
  },
  gateTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  gateBody: {
    textAlign: 'center',
  },
  benefits: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  benefitText: {
    flex: 1,
  },
  cta: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
