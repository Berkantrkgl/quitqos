import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getLastEarnedMilestone, getNextMilestone } from '@/constants/milestones';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { useTheme } from '@/hooks/use-theme';
import { useAppTheme } from '@/theme/theme-provider';

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
  const theme = useTheme();
  const { scheme } = useAppTheme();
  const elapsed = useElapsedTime(startedAt);

  // Light: white card lifted by shadow. Dark: an elevated slate surface that
  // stands out against the (darker) page instead of relying on a shadow.
  const cardBackground = scheme === 'dark' ? theme.backgroundElement : theme.background;

  // Until the first tick lands we have no breakdown; render nothing.
  if (!elapsed) return null;

  const { days, hours, minutes, seconds, totalMinutes, years, months, dayOfMonth } = elapsed;

  const next = getNextMilestone(totalMinutes);
  const last = getLastEarnedMilestone(totalMinutes);

  // Fill fraction between the previous and next milestone offsets.
  const from = last?.offsetMinutes ?? 0;
  const to = next?.offsetMinutes ?? from;
  const progress = next ? (totalMinutes - from) / (to - from) : 1;

  const timer = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`;

  // Year/month columns only appear once they're non-zero, so a fresh streak
  // shows a clean "Gün · Saat" and long streaks show the full breakdown.
  const units = [
    { key: 'y', value: years, label: t('home.dashboard.unitYear'), show: years > 0 },
    { key: 'mo', value: months, label: t('home.dashboard.unitMonth'), show: years > 0 || months > 0 },
    { key: 'd', value: dayOfMonth, label: t('home.dashboard.unitDay'), show: true },
    { key: 'h', value: hours, label: t('home.dashboard.unitHour'), show: true },
  ].filter((u) => u.show);

  return (
    <View style={[styles.card, { backgroundColor: cardBackground, borderColor: theme.border }]}>
      {next ? (
        <ThemedText type="eyebrow" themeColor="textSecondary" style={styles.cardTitle}>
          {t('home.dashboard.nextMilestoneTitle', { title: next.title })}
        </ThemedText>
      ) : null}

      <ProgressRing progress={progress}>
        <ThemedText type="display" themeColor="text">
          {days}
        </ThemedText>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('home.dashboard.eyebrow')}
        </ThemedText>
        <View style={[styles.timerPill, { backgroundColor: theme.primaryMuted }]}>
          <ThemedText type="smallBold" themeColor="primary" style={styles.timerText}>
            {timer}
          </ThemedText>
        </View>
      </ProgressRing>

      {/* Year · Month · Day · Hour breakdown. */}
      <View style={styles.breakdown}>
        {units.map((u, i) => (
          <View key={u.key} style={styles.breakdownRow}>
            {i > 0 ? (
              <View style={[styles.breakdownDivider, { backgroundColor: theme.border }]} />
            ) : null}
            <View style={styles.breakdownUnit}>
              <ThemedText type="smallBold" themeColor="text" style={styles.breakdownValue}>
                {u.value}
              </ThemedText>
              <ThemedText type="eyebrow" themeColor="textSecondary">
                {u.label}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.nextLine}>
        {next
          ? t('home.dashboard.nextMilestone', { title: next.title })
          : t('home.dashboard.allMilestonesDone')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    alignSelf: 'stretch',
    // Soft lift so the card reads as a distinct surface even on a white page.
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  cardTitle: {
    textAlign: 'center',
  },
  timerPill: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  timerText: {
    fontVariant: ['tabular-nums'],
  },
  breakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
  },
  breakdownUnit: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  breakdownValue: {
    fontSize: 20,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  nextLine: {
    textAlign: 'center',
  },
});
