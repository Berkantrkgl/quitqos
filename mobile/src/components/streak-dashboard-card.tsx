import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getLastEarnedMilestone, getNextMilestone } from '@/constants/milestones';
import { useElapsedTime } from '@/hooks/use-elapsed-time';

import { ProgressRing } from './progress-ring';
import { ThemedText } from './themed-text';

type StreakDashboardCardProps = {
  /** ISO-8601 streak start. */
  startedAt: string;
};

/**
 * The active-streak hero: a progress ring wrapping a live day count, plus the
 * next-milestone hint. The ring's fill fraction is progress toward the *next*
 * milestone measured from the last-crossed one (or streak start), not the raw
 * day count (see M3 in CLAUDE.md).
 */
export function StreakDashboardCard({ startedAt }: StreakDashboardCardProps) {
  const { t } = useTranslation();
  const elapsed = useElapsedTime(startedAt);

  // Until the first tick lands we have no breakdown; render nothing.
  if (!elapsed) return null;

  const { days, hours, minutes, seconds, totalMinutes } = elapsed;

  const next = getNextMilestone(totalMinutes);
  const last = getLastEarnedMilestone(totalMinutes);

  // Fill fraction between the previous and next milestone offsets.
  const from = last?.offsetMinutes ?? 0;
  const to = next?.offsetMinutes ?? from;
  const progress = next ? (totalMinutes - from) / (to - from) : 1;

  const timer = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <ProgressRing progress={progress}>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('home.dashboard.eyebrow')}
        </ThemedText>
        <ThemedText type="display" themeColor="primary">
          {days}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('home.dashboard.dayCount', { count: days })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.timer}>
          {timer}
        </ThemedText>
      </ProgressRing>

      <ThemedText type="smallBold" themeColor="text" style={styles.nextLine}>
        {next
          ? t('home.dashboard.nextMilestone', { title: next.title })
          : t('home.dashboard.allMilestonesDone')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  timer: {
    fontVariant: ['tabular-nums'],
    marginTop: Spacing.one,
  },
  nextLine: {
    textAlign: 'center',
  },
});
