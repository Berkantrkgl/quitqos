import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  getEarnedMilestoneCount,
  getLastEarnedMilestone,
  getNextMilestone,
} from '@/constants/milestones';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { useQuitStreak } from '@/hooks/use-quit-streak';
import { useTheme } from '@/hooks/use-theme';
import { type StreakFigure, streakFigure } from '@/utils/elapsed-time';

/**
 * Home — the "Sükût" design. One quiet hero (elapsed time), a single-line
 * next-goal with a hairline progress bar and a soft encouragement drawn from
 * the milestone copy, and two footnotes (badges / rank). See design/sukut/.
 */
export default function HomeScreen() {
  const { attempt, isLoading } = useQuitStreak();

  // Avoid a flash of the start prompt before storage is read.
  if (isLoading) return <ThemedView style={styles.container} />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Header />
        {attempt ? <Dashboard startedAt={attempt.startedAt} /> : <StartPrompt />}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Top bar: wordmark + settings/profile button. */
function Header() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <ThemedText style={styles.wordmark}>
        Quit
        <ThemedText style={[styles.wordmark, { color: theme.primaryText }]}>QOS</ThemedText>
      </ThemedText>
      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('settings.title')}
        style={({ pressed }) => [
          styles.avatar,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <ThemedText type="smallBold" themeColor="primaryText">
          ⚙
        </ThemedText>
      </Pressable>
    </View>
  );
}

/** Pre-streak: a calm invitation to start (now or backdated). */
function StartPrompt() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { startStreak } = useQuitStreak();

  function handleBackdated() {
    Alert.alert(t('home.backdated'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: '1', onPress: () => startStreak(daysAgo(1)) },
      { text: '3', onPress: () => startStreak(daysAgo(3)) },
      { text: '7', onPress: () => startStreak(daysAgo(7)) },
    ]);
  }

  return (
    <View style={styles.pre}>
      <ThemedText type="title" style={styles.preTitle}>
        {t('home.startTitle')}
      </ThemedText>

      <Pressable
        onPress={() => startStreak()}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <ThemedText type="smallBold" themeColor="onPrimary" style={styles.ctaText}>
          {t('home.startButton')}
        </ThemedText>
      </Pressable>

      <Pressable onPress={handleBackdated} hitSlop={8}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('home.backdated')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

/** Active streak: hero elapsed figure + next goal + footnotes + relapse. */
function Dashboard({ startedAt }: { startedAt: string }) {
  const { t } = useTranslation();
  const { relapse } = useQuitStreak();
  const elapsed = useElapsedTime(startedAt);

  if (!elapsed) return <View style={styles.dash} />;

  const { hours, minutes, seconds, totalMinutes } = elapsed;
  const figure = streakFigure(elapsed);
  const earnedCount = getEarnedMilestoneCount(totalMinutes);

  const next = getNextMilestone(totalMinutes);
  const last = getLastEarnedMilestone(totalMinutes);

  // Fill fraction between the previous and next milestone offsets.
  const from = last?.offsetMinutes ?? 0;
  const to = next?.offsetMinutes ?? from;
  const progress = next ? (totalMinutes - from) / (to - from) : 1;

  // Encouragement: the copy of the milestone we're currently working toward,
  // or the last one we crossed once everything's done.
  const encouragement = (last ?? next)?.description ?? '';

  const clock = `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;

  function confirmRelapse() {
    Alert.alert(t('relapse.warningTitle'), t('relapse.warningBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('relapse.button'), style: 'destructive', onPress: relapse },
    ]);
  }

  return (
    <View style={styles.dash}>
      {/* HERO — elapsed time */}
      <View style={styles.hero}>
        <ThemedText type="eyebrow" themeColor="textTertiary">
          {t('home.dashboard.label')}
        </ThemedText>
        <HeroFigure figure={figure} />
        <RemainderLine figure={figure} />
        <Clock text={clock} />
      </View>

      {/* GOAL — one line + hairline bar + soft encouragement */}
      <Goal next={next} progress={progress} encouragement={encouragement} elapsed={elapsed} />

      {/* FOOTNOTES — badges · rank */}
      <Footnotes earnedCount={earnedCount} />

      <Pressable onPress={confirmRelapse} hitSlop={8} style={styles.relapse}>
        <ThemedText type="small" themeColor="textTertiary">
          {t('relapse.button')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

/** The big number + its leading unit (gün / ay / yıl). */
function HeroFigure({ figure }: { figure: StreakFigure }) {
  const { t } = useTranslation();
  const unitKey =
    figure.scale === 'years'
      ? 'home.dashboard.heroYear'
      : figure.scale === 'months'
        ? 'home.dashboard.heroMonth'
        : 'home.dashboard.heroDay';

  return (
    <View style={styles.figureRow}>
      <ThemedText
        type="display"
        style={[styles.heroNum, figure.scale === 'years' && styles.heroNumCompact]}
      >
        {figure.heroValue}
      </ThemedText>
      <ThemedText type="subtitle" themeColor="textSecondary" style={styles.heroUnit}>
        {t(unitKey, { count: figure.heroValue })}
      </ThemedText>
    </View>
  );
}

/** Secondary breakdown beneath the hero (only for month/year scales). */
function RemainderLine({ figure }: { figure: StreakFigure }) {
  const { t } = useTranslation();
  if (figure.remainder.length === 0) return null;

  const parts = figure.remainder.map((p) => {
    const key =
      p.unit === 'months'
        ? 'home.dashboard.remMonth'
        : p.unit === 'days'
          ? 'home.dashboard.remDay'
          : 'home.dashboard.remHour';
    return t(key, { count: p.value });
  });

  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.remainder}>
      {parts.join(' ')}
    </ThemedText>
  );
}

/** Live H:M:S clock with a blinking dot. */
function Clock({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.clockRow}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.clockText}>
        {text}
      </ThemedText>
      <View style={[styles.live, { backgroundColor: theme.primary }]} />
    </View>
  );
}

/** Single-line next goal + hairline progress + milestone-derived encouragement. */
function Goal({
  next,
  progress,
  encouragement,
  elapsed,
}: {
  next: ReturnType<typeof getNextMilestone>;
  progress: number;
  encouragement: string;
  elapsed: NonNullable<ReturnType<typeof useElapsedTime>>;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const pct = Math.round(progress * 100);

  const rem = next ? remaining(next.offsetMinutes - elapsed.totalMinutes) : null;
  const goalLine = next
    ? t('home.dashboard.nextGoal', {
        title: next.title,
        remaining: t(rem!.key, { count: rem!.count }),
      })
    : t('home.dashboard.allMilestonesDone');

  return (
    <View style={styles.goal}>
      <View style={styles.goalRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.goalText}>
          {goalLine}
        </ThemedText>
        {next ? (
          <ThemedText type="smallBold" themeColor="primaryText">
            %{pct}
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View
          style={[styles.fill, { backgroundColor: theme.primary, width: `${next ? pct : 100}%` }]}
        />
      </View>
      {encouragement ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.say}>
          {encouragement}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Badges + rank as quiet, borderless footnotes split by a dot. */
function Footnotes({ earnedCount }: { earnedCount: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.foot}>
      <Pressable onPress={() => router.push('/badges')} hitSlop={8} style={styles.footItem}>
        <ThemedText type="small" themeColor="textSecondary">
          🏅 {t('home.dashboard.badgesFootnote', { count: earnedCount })}
        </ThemedText>
      </Pressable>
      <View style={[styles.footDot, { backgroundColor: theme.borderStrong }]} />
      <Pressable onPress={() => router.push('/leaderboard')} hitSlop={8} style={styles.footItem}>
        <ThemedText type="small" themeColor="textSecondary">
          🏆 {t('home.dashboard.rankFootnoteNone')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

// ---- helpers ---------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Coarse "X kaldı" from minutes remaining: returns the i18n key + count so the
 * caller runs `t` (keeps TFunction's literal-key typing intact).
 */
function remaining(minutesLeft: number): { key: 'home.dashboard.remHour' | 'home.dashboard.remDay'; count: number } {
  const m = Math.max(0, minutesLeft);
  if (m < 60) return { key: 'home.dashboard.remHour', count: 1 }; // "< 1 saat" rounds up softly
  if (m < 60 * 48) return { key: 'home.dashboard.remHour', count: Math.round(m / 60) };
  return { key: 'home.dashboard.remDay', count: Math.round(m / (60 * 24)) };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Spacing.four + Spacing.half,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  wordmark: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // pre-streak
  pre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  preTitle: {
    textAlign: 'center',
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.5,
    maxWidth: 260,
  },
  cta: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    lineHeight: 20,
  },

  // active dashboard
  dash: {
    flex: 1,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  figureRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two + 2,
    marginTop: Spacing.three,
  },
  heroNum: {
    fontSize: 132,
    lineHeight: 132 * 0.9,
    letterSpacing: -6,
    fontVariant: ['tabular-nums'],
  },
  heroNumCompact: {
    fontSize: 104,
    lineHeight: 104 * 0.9,
    letterSpacing: -5,
  },
  heroUnit: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
  },
  remainder: {
    marginTop: Spacing.three,
    fontSize: 15,
    fontWeight: '600',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  clockText: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  live: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // goal
  goal: {
    marginTop: Spacing.four,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  goalText: {
    flex: 1,
    fontWeight: '600',
  },
  track: {
    height: 3,
    borderRadius: 999,
    marginTop: Spacing.two + 2,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: 999,
  },
  say: {
    marginTop: Spacing.three,
    lineHeight: 20,
  },

  // footnotes
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four + Spacing.one,
  },
  footItem: {
    paddingVertical: Spacing.one,
  },
  footDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  relapse: {
    alignSelf: 'center',
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
