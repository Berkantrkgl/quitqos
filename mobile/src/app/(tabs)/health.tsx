import { useFocusEffect } from 'expo-router';
import { HeartPulse } from 'lucide-react-native';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StreakEmptyState } from '@/components/streak-empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MILESTONES, type Milestone } from '@/constants/milestones';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { useQuitStreak } from '@/hooks/use-quit-streak';
import { useTheme } from '@/hooks/use-theme';

type ItemStatus = 'done' | 'now' | 'upcoming';

type Row = {
  milestone: Milestone;
  status: ItemStatus;
  /** Fill fraction 0–1 for the "now" step. */
  progress: number;
  /** Minutes remaining until this (upcoming/now) milestone. */
  minutesLeft: number;
};

/**
 * Health — the "Sükût" recovery timeline (see design/sukut/health.html).
 * One continuous vertical line in chronological order (20 min at the top, 1 year
 * at the bottom). On open, the list scrolls so the "now" step is near the top —
 * past achievements above, upcoming steps below. Kept minimal to match Home: a
 * soft tint (no card border) marks the "now" step.
 */
export default function HealthScreen() {
  const { t } = useTranslation();
  const { attempt } = useQuitStreak();
  const elapsed = useElapsedTime(attempt?.startedAt ?? null);

  const scrollRef = useRef<ScrollView>(null);
  // Y offset of the "now" row within the scrolled rail; used to auto-position it.
  const nowY = useRef<number | null>(null);
  // Guards a single auto-scroll per focus; reset each time the tab regains focus.
  const didScroll = useRef(false);

  // Re-center "now" every time the tab regains focus (not just first mount). If
  // the layout is already measured, scroll now; otherwise onNowLayout will.
  useFocusEffect(
    useCallback(() => {
      didScroll.current = false;
      if (nowY.current != null) {
        didScroll.current = true;
        scrollRef.current?.scrollTo({ y: nowScrollTarget(nowY.current), animated: false });
      }
    }, []),
  );

  if (!attempt || !elapsed) {
    return (
      <StreakEmptyState
        eyebrow={t('health.eyebrow')}
        screenTitle={t('health.title')}
        icon={HeartPulse}
        title={t('health.emptyTitle')}
        body={t('health.emptyBody')}
        cta={t('health.startButton')}
      />
    );
  }

  const total = elapsed.totalMinutes;
  const doneCount = MILESTONES.filter((m) => m.offsetMinutes <= total).length;
  const nextIndex = MILESTONES.findIndex((m) => m.offsetMinutes > total);

  // Chronological order (top = 20 min, bottom = 1 year).
  const rows: Row[] = MILESTONES.map((m, i) => {
    const status: ItemStatus =
      m.offsetMinutes <= total ? 'done' : i === nextIndex ? 'now' : 'upcoming';
    const prevOffset = i > 0 ? MILESTONES[i - 1].offsetMinutes : 0;
    const progress =
      status === 'now'
        ? Math.min(1, Math.max(0, (total - prevOffset) / (m.offsetMinutes - prevOffset)))
        : 0;
    return { milestone: m, status, progress, minutesLeft: Math.max(0, m.offsetMinutes - total) };
  });

  // Scroll "now" near the top once its offset is known (a little breathing room
  // above so a done step peeks in as context). Runs once.
  function maybeScrollToNow() {
    if (didScroll.current || nowY.current == null) return;
    didScroll.current = true;
    scrollRef.current?.scrollTo({ y: nowScrollTarget(nowY.current), animated: false });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header stays pinned; only the timeline rail scrolls. */}
        <Header doneCount={doneCount} total={MILESTONES.length} />
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.rail}>
            {rows.map((row, i) => (
              <TimelineStep
                key={row.milestone.key}
                row={row}
                isLast={i === rows.length - 1}
                onNowLayout={
                  row.status === 'now'
                    ? (y) => {
                        nowY.current = y;
                        maybeScrollToNow();
                      }
                    : undefined
                }
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Screen title + a "N / total steps" summary with a thin progress bar. */
function Header({ doneCount, total }: { doneCount: number; total: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const pct = Math.round((doneCount / total) * 100);
  return (
    <View style={styles.header}>
      <ThemedText type="subtitle" style={styles.title}>
        {t('health.title')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
        {t('health.subtitle')}
      </ThemedText>
      <View style={styles.sumRow}>
        <ThemedText type="smallBold" themeColor="primaryText" style={styles.sumText}>
          {t('health.stepsSummary', { done: doneCount, total })}
        </ThemedText>
        <View style={[styles.sumTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.sumFill, { backgroundColor: theme.primary, width: `${pct}%` }]} />
        </View>
      </View>
    </View>
  );
}

/** One recovery step on the continuous rail. */
function TimelineStep({
  row,
  isLast,
  onNowLayout,
}: {
  row: Row;
  isLast: boolean;
  /** Reports this row's Y within the rail — set only on the "now" step. */
  onNowLayout?: (y: number) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { milestone, status, progress } = row;

  const done = status === 'done';
  const now = status === 'now';

  const statusLabel = done
    ? t('health.statusDone')
    : now
      ? t('health.statusNow')
      : t('health.statusUpcoming');

  const handleLayout = onNowLayout
    ? (e: LayoutChangeEvent) => onNowLayout(e.nativeEvent.layout.y)
    : undefined;

  return (
    <View style={styles.step} onLayout={handleLayout}>
      {/* Left rail: node + connector. */}
      <View style={styles.railCol}>
        <View
          style={[
            styles.node,
            done
              ? { backgroundColor: theme.primary }
              : now
                ? { backgroundColor: theme.background, borderColor: theme.primary, borderWidth: 2 }
                : { backgroundColor: theme.background, borderColor: theme.borderStrong, borderWidth: 2 },
          ]}
        >
          {done ? (
            <ThemedText type="eyebrow" themeColor="onPrimary" style={styles.check}>
              ✓
            </ThemedText>
          ) : null}
        </View>
        {!isLast ? (
          <View style={[styles.connector, { backgroundColor: done ? theme.primary : theme.border }]} />
        ) : null}
      </View>

      {/* Right: content. The "now" step is a self-contained tinted card. */}
      {now ? (
        <View style={[styles.nowCard, { backgroundColor: theme.primaryMuted }]}>
          <View style={styles.nowHead}>
            <ThemedText type="smallBold" style={styles.nowTitle}>
              {milestone.title}
            </ThemedText>
            <ThemedText type="eyebrow" themeColor="primaryText">
              {statusLabel}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.nowDesc}>
            {milestone.description}
          </ThemedText>
          <NowProgress progress={progress} minutesLeft={row.minutesLeft} />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.bodyTop}>
            <ThemedText type="smallBold" themeColor={done ? 'text' : 'textSecondary'} style={styles.stepTitle}>
              {milestone.title}
            </ThemedText>
            <ThemedText type="eyebrow" themeColor={done ? 'primaryText' : 'textTertiary'}>
              {statusLabel}
            </ThemedText>
          </View>
          <ThemedText
            type="small"
            themeColor={done ? 'textSecondary' : 'textTertiary'}
            style={styles.stepDesc}
          >
            {milestone.description}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

/** Live progress bar + "%64 · 6 saat kaldı" line for the current step. */
function NowProgress({ progress, minutesLeft }: { progress: number; minutesLeft: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const rem = remaining(minutesLeft);
  return (
    <View style={styles.nowProgress}>
      <View style={[styles.progTrack, { backgroundColor: theme.background }]}>
        <View style={[styles.progFill, { backgroundColor: theme.primary, width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <ThemedText type="smallBold" themeColor="primaryText" style={styles.eta}>
        {t('health.nowEta', { pct: Math.round(progress * 100), remaining: t(rem.key, { count: rem.count }) })}
      </ThemedText>
    </View>
  );
}

/**
 * Scroll offset that lands the "now" card flush at the top of the rail. The card
 * uses marginTop: -Spacing.one to align with its node, so it visually starts a
 * few px above the row's layout Y — compensate so its top isn't clipped and no
 * sliver of the previous step shows.
 */
function nowScrollTarget(nowRowY: number): number {
  return Math.max(0, nowRowY - Spacing.one);
}

/** Coarse "X kaldı" from minutes: returns i18n key + count (keeps TFunction typing). */
function remaining(minutesLeft: number): { key: 'home.dashboard.remHour' | 'home.dashboard.remDay'; count: number } {
  const m = Math.max(0, minutesLeft);
  if (m < 60) return { key: 'home.dashboard.remHour', count: 1 };
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
    maxWidth: MaxContentWidth,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four + Spacing.half,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    paddingHorizontal: Spacing.four + Spacing.half,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: Spacing.one,
    lineHeight: 19,
  },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  sumText: {
    minWidth: 84,
    fontVariant: ['tabular-nums'],
  },
  sumTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sumFill: {
    height: 4,
    borderRadius: 999,
  },

  rail: {
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  railCol: {
    alignItems: 'center',
    width: 22,
  },
  node: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
  },
  connector: {
    flex: 1,
    width: StyleSheet.hairlineWidth * 2,
    marginVertical: 4,
    borderRadius: 1,
    minHeight: 16,
  },
  body: {
    flex: 1,
    // small nudge so the title baseline aligns with the node
    paddingTop: 1,
  },
  // "now" — a self-contained tinted card with even padding on all sides.
  nowCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    // pull up slightly so the title row lines up with the node's center
    marginTop: -Spacing.one,
  },
  nowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  nowTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  nowDesc: {
    lineHeight: 19,
  },
  bodyTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  stepTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  stepDesc: {
    marginTop: 3,
    lineHeight: 19,
  },
  nowProgress: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  progTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progFill: {
    height: 5,
    borderRadius: 999,
  },
  eta: {
    fontVariant: ['tabular-nums'],
  },
});
