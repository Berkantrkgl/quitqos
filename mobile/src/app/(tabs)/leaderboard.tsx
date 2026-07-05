import { useFocusEffect, useRouter } from 'expo-router';
import { LogIn, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
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
  getLeaderboardSummary,
  getMyRank,
  type LeaderboardItem,
  type LeaderboardMeResponse,
  type LeaderboardMetric,
  type LeaderboardSummaryResponse,
} from '@/lib/api';

/** Whole days from a streak duration in seconds. */
function daysFromSeconds(seconds: number): number {
  return Math.floor(seconds / 86400);
}

/** Avatar face = the first letter of the username, uppercased. */
function initial(username: string): string {
  return (username.trim()[0] ?? '?').toUpperCase();
}

/**
 * Leaderboard — the "Sükût" ranking screen (design/sukut/leaderboard.html direction 2 +
 * leaderboard-guest.html variant A). Registered users see their own standing first (a calm hero
 * stat, like Home), then the ranking. Guests can't be ranked (the board is registered-only), so
 * instead of a hollow "#—" they see the live community numbers they'd be joining.
 */
export default function LeaderboardScreen() {
  const { user, accessToken } = useAuth();
  return user && accessToken ? (
    <RankedList accessToken={accessToken} myId={user.id} />
  ) : (
    <GuestSummary />
  );
}

// ---- Shared header (eyebrow + title + metric segment) ----------------------

function Header({
  metric,
  onMetric,
}: {
  metric?: LeaderboardMetric;
  onMetric?: (m: LeaderboardMetric) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <ThemedText type="eyebrow" themeColor="textTertiary">
        {t('leaderboardScreen.eyebrow')}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.title}>
        {t('leaderboardScreen.title')}
      </ThemedText>
      {metric && onMetric ? (
        <View style={[styles.seg, { backgroundColor: theme.backgroundElement }]}>
          {(['current', 'longest'] as const).map((m) => {
            const active = metric === m;
            return (
              <Pressable
                key={m}
                onPress={() => onMetric(m)}
                style={[styles.segButton, active && { backgroundColor: theme.background }]}
              >
                <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
                  {t(m === 'current' ? 'leaderboardScreen.metricCurrent' : 'leaderboardScreen.metricLongest')}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// ---- Registered: my standing first, then the ranking -----------------------

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: LeaderboardItem[]; me: LeaderboardMeResponse };

function RankedList({ accessToken, myId }: { accessToken: string; myId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [metric, setMetric] = useState<LeaderboardMetric>('current');
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  // Reload on focus and whenever the metric changes, so a streak started on Home shows up here.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setState({ status: 'loading' });
      Promise.all([getLeaderboard(accessToken, metric), getMyRank(accessToken, metric)])
        .then(([board, me]) => {
          if (!cancelled) setState({ status: 'ready', items: board.items, me });
        })
        .catch(() => {
          if (!cancelled) setState({ status: 'error' });
        });
      return () => {
        cancelled = true;
      };
    }, [accessToken, metric]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header metric={metric} onMetric={setMetric} />

        {state.status === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : state.status === 'error' ? (
          <Centered text={t('leaderboardScreen.error')} />
        ) : state.items.length === 0 ? (
          <Centered text={t('leaderboardScreen.empty')} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <MyStanding me={state.me} total={state.items.length} items={state.items} />
            <Ranking items={state.items} me={state.me} myId={myId} />
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Hero: the caller's own rank, shown big and calm (like Home's figure). When ranked, also shows how
 * far the rank above is (derived from the neighboring row when it's in the fetched slice). Rank 0 =
 * has no active streak, so we invite them to start one instead of showing "#—".
 */
function MyStanding({
  me,
  total,
  items,
}: {
  me: LeaderboardMeResponse;
  total: number;
  items: LeaderboardItem[];
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (me.rank === 0) {
    return (
      <View style={[styles.mine, { borderBottomColor: theme.border }]}>
        <ThemedText type="eyebrow" themeColor="textTertiary">
          {t('leaderboardScreen.myRankCap')}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.notRankedTitle}>
          {t('leaderboardScreen.notRankedTitle')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.notRankedBody}>
          {t('leaderboardScreen.notRankedBody')}
        </ThemedText>
      </View>
    );
  }

  // The rank directly above me, if it's in the fetched list, gives an honest "days to next" gap.
  const above = items.find((r) => r.rank === me.rank - 1);
  const gapDays =
    above != null ? daysFromSeconds(above.streakSeconds) - daysFromSeconds(me.streakSeconds) : null;

  const meta =
    me.rank === 1
      ? t('leaderboardScreen.atTop')
      : gapDays != null && gapDays > 0
        ? t('leaderboardScreen.toNext', { count: gapDays })
        : null;

  return (
    <View style={[styles.mine, { borderBottomColor: theme.border }]}>
      <ThemedText type="eyebrow" themeColor="textTertiary">
        {t('leaderboardScreen.myRankCap')}
      </ThemedText>
      <View style={styles.figure}>
        <ThemedText type="display" themeColor="textTertiary" style={styles.hash}>
          #
        </ThemedText>
        <ThemedText type="display" themeColor="primaryText" style={styles.rankNum}>
          {me.rank}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.rankTotal}>
          {t('leaderboardScreen.myRankOf', { total })}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.mineMeta}>
        <ThemedText type="smallBold">
          {daysFromSeconds(me.streakSeconds)} {t('leaderboardScreen.dayUnit')}
        </ThemedText>
        {meta ? ` · ${meta}` : ''}
      </ThemedText>
    </View>
  );
}

/**
 * The ranking. When the caller is ranked below the top 3, split into "Top" (first 3) and "Around
 * you" (a window centered on the caller) so both the leaders and their neighbors are visible without
 * scrolling a long list. Otherwise (in the top 3, or a short board) render the flat list.
 */
function Ranking({
  items,
  me,
  myId,
}: {
  items: LeaderboardItem[];
  me: LeaderboardMeResponse;
  myId: string;
}) {
  const { t } = useTranslation();

  const useWindow = me.rank > 4 && items.length > 6;

  if (!useWindow) {
    return (
      <View style={styles.list}>
        {items.map((row) => (
          <Row key={row.userId} row={row} isMe={row.userId === myId} />
        ))}
      </View>
    );
  }

  const top = items.slice(0, 3);
  // Window around me: one above through one below (clamped to what's fetched).
  const around = items.filter((r) => r.rank >= me.rank - 1 && r.rank <= me.rank + 1);

  return (
    <View style={styles.list}>
      <ThemedText type="eyebrow" themeColor="textTertiary" style={styles.sectionLabel}>
        {t('leaderboardScreen.sectionTop')}
      </ThemedText>
      {top.map((row) => (
        <Row key={row.userId} row={row} isMe={row.userId === myId} />
      ))}
      <ThemedText type="eyebrow" themeColor="textTertiary" style={styles.sectionLabel}>
        {t('leaderboardScreen.sectionAround')}
      </ThemedText>
      {around.map((row) => (
        <Row key={row.userId} row={row} isMe={row.userId === myId} />
      ))}
    </View>
  );
}

/** One ranking row: rank · initial avatar · @username (+ "· You") · days. */
function Row({ row, isMe }: { row: LeaderboardItem; isMe: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.row, isMe && { backgroundColor: theme.primaryMuted }]}>
      <ThemedText type="smallBold" themeColor="textTertiary" style={styles.rank}>
        {row.rank}
      </ThemedText>
      <View
        style={[
          styles.avatar,
          { backgroundColor: isMe ? theme.primary : theme.backgroundElement },
        ]}
      >
        <ThemedText type="smallBold" themeColor={isMe ? 'onPrimary' : 'textSecondary'}>
          {initial(row.username)}
        </ThemedText>
      </View>
      <ThemedText
        type="smallBold"
        themeColor={isMe ? 'primaryText' : 'text'}
        style={styles.name}
        numberOfLines={1}
      >
        @{row.username}
        {isMe ? ` · ${t('leaderboardScreen.you')}` : ''}
      </ThemedText>
      <ThemedText type="smallBold" themeColor="primaryText" style={styles.days}>
        {daysFromSeconds(row.streakSeconds)}
        <ThemedText type="small" themeColor="textTertiary">
          {' '}
          {t('leaderboardScreen.dayUnit')}
        </ThemedText>
      </ThemedText>
    </View>
  );
}

// ---- Guest: community summary (variant A) ----------------------------------

type GuestState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: LeaderboardSummaryResponse };

function GuestSummary() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [state, setState] = useState<GuestState>({ status: 'loading' });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setState({ status: 'loading' });
      getLeaderboardSummary()
        .then((data) => {
          if (!cancelled) setState({ status: 'ready', data });
        })
        .catch(() => {
          if (!cancelled) setState({ status: 'error' });
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header />
        {state.status === 'loading' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <GuestHero
              // On error, fall back to a still-honest zero state rather than fake numbers.
              data={state.status === 'ready' ? state.data : EMPTY_SUMMARY}
              onSignIn={() => router.push('/login')}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const EMPTY_SUMMARY: LeaderboardSummaryResponse = {
  totalRacers: 0,
  longestSeconds: 0,
  joinedToday: 0,
  top: [],
};

function GuestHero({
  data,
  onSignIn,
}: {
  data: LeaderboardSummaryResponse;
  onSignIn: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View>
      <View style={styles.gHero}>
        <View style={[styles.gGlyph, { backgroundColor: theme.primaryMuted }]}>
          <Users color={theme.primaryText} size={30} strokeWidth={1.7} />
        </View>
        <ThemedText type="subtitle" style={styles.gTitle}>
          {t('leaderboardScreen.guestTitle', { count: data.totalRacers })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.gBody}>
          {t('leaderboardScreen.guestBody')}
        </ThemedText>
      </View>

      <View style={styles.gStats}>
        <Stat value={data.totalRacers} label={t('leaderboardScreen.statRacers')} />
        <Stat value={daysFromSeconds(data.longestSeconds)} label={t('leaderboardScreen.statLongest')} />
        <Stat value={data.joinedToday} label={t('leaderboardScreen.statToday')} />
      </View>

      <Pressable
        onPress={onSignIn}
        style={({ pressed }) => [
          styles.gCta,
          { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <LogIn color={theme.onPrimary} size={18} strokeWidth={2} />
        <ThemedText type="smallBold" themeColor="onPrimary">
          {t('leaderboardScreen.guestCta')}
        </ThemedText>
      </Pressable>

      {data.top.length > 0 ? (
        <>
          <ThemedText type="eyebrow" themeColor="textTertiary" style={styles.gPeekLabel}>
            {t('leaderboardScreen.guestPeek')}
          </ThemedText>
          <View style={styles.list}>
            {data.top.map((row) => (
              <View key={row.rank} style={styles.row}>
                <ThemedText type="smallBold" themeColor="textTertiary" style={styles.rank}>
                  {row.rank}
                </ThemedText>
                <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {initial(row.username)}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
                  @{row.username}
                </ThemedText>
                <ThemedText type="smallBold" themeColor="primaryText" style={styles.days}>
                  {daysFromSeconds(row.streakSeconds)}
                  <ThemedText type="small" themeColor="textTertiary">
                    {' '}
                    {t('leaderboardScreen.dayUnit')}
                  </ThemedText>
                </ThemedText>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" themeColor="primaryText" style={styles.statValue}>
        {value.toLocaleString('tr-TR')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <View style={styles.centered}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
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
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: Spacing.one,
  },
  seg: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: Spacing.three,
    padding: 3,
    borderRadius: 10,
  },
  segButton: {
    paddingVertical: Spacing.two - 2,
    paddingHorizontal: Spacing.three - 2,
    borderRadius: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },

  // My standing hero
  mine: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.one,
  },
  figure: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.two,
  },
  hash: {
    fontSize: 26,
    lineHeight: 30,
  },
  rankNum: {
    fontSize: 60,
    lineHeight: 60,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
    marginLeft: 2,
  },
  rankTotal: {
    marginLeft: Spacing.two,
  },
  mineMeta: {
    marginTop: Spacing.three,
    lineHeight: 19,
  },
  notRankedTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: Spacing.two,
  },
  notRankedBody: {
    marginTop: Spacing.one,
    lineHeight: 19,
  },

  // Ranking list
  list: {
    marginTop: Spacing.two,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  rank: {
    width: 22,
    textAlign: 'center',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontSize: 13.5,
  },
  days: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },

  // Guest hero
  gHero: {
    alignItems: 'center',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  gGlyph: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  gBody: {
    marginTop: Spacing.two,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  gStats: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderRadius: 14,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: Spacing.one,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  gCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 14,
  },
  gPeekLabel: {
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
  },
});
