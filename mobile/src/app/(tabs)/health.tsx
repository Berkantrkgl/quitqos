import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MILESTONES, type Milestone } from '@/constants/milestones';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { useQuitStreak } from '@/hooks/use-quit-streak';
import { useTheme } from '@/hooks/use-theme';

type ItemStatus = 'done' | 'next' | 'upcoming';

export default function HealthScreen() {
  const { t } = useTranslation();
  const { attempt } = useQuitStreak();
  const elapsed = useElapsedTime(attempt?.startedAt ?? null);

  // No active streak → invite the user to start (mirrors the empty state).
  if (!attempt || !elapsed) {
    return (
      <PlaceholderScreen title={t('health.emptyTitle')} hint={t('health.emptyBody')} icon="🫀" />
    );
  }

  const total = elapsed.totalMinutes;
  const doneCount = MILESTONES.filter((m) => m.offsetMinutes <= total).length;
  const nextIndex = MILESTONES.findIndex((m) => m.offsetMinutes > total);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="subtitle">{t('health.title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('health.subtitle')}
            </ThemedText>
            <ThemedText type="eyebrow" themeColor="primary" style={styles.summary}>
              {t('health.progressSummary', { done: doneCount, total: MILESTONES.length })}
            </ThemedText>
          </View>

          <View style={styles.timeline}>
            {MILESTONES.map((m, i) => {
              const status: ItemStatus =
                m.offsetMinutes <= total ? 'done' : i === nextIndex ? 'next' : 'upcoming';
              // Fill fraction for the "next" node: from previous milestone to this one.
              const prevOffset = i > 0 ? MILESTONES[i - 1].offsetMinutes : 0;
              const progress =
                status === 'next'
                  ? Math.min(1, Math.max(0, (total - prevOffset) / (m.offsetMinutes - prevOffset)))
                  : 0;
              return (
                <TimelineItem
                  key={m.key}
                  milestone={m}
                  status={status}
                  progress={progress}
                  isLast={i === MILESTONES.length - 1}
                />
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** One recovery step: timeline rail on the left, content card on the right. */
function TimelineItem({
  milestone,
  status,
  progress,
  isLast,
}: {
  milestone: Milestone;
  status: ItemStatus;
  progress: number;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const done = status === 'done';
  const next = status === 'next';

  const dotColor = done || next ? theme.primary : theme.border;
  const statusLabel = done
    ? t('health.statusDone')
    : next
      ? t('health.statusNext')
      : t('health.statusUpcoming');

  return (
    <View style={styles.item}>
      {/* Left rail: node + connector line. */}
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            { borderColor: dotColor, backgroundColor: done ? theme.primary : theme.background },
          ]}
        >
          {done ? (
            <ThemedText type="small" themeColor="onPrimary" style={styles.dotCheck}>
              ✓
            </ThemedText>
          ) : null}
        </View>
        {!isLast ? (
          <View style={styles.connectorTrack}>
            <View style={[styles.connectorFill, { backgroundColor: theme.border }]} />
            {done ? (
              <View
                style={[
                  styles.connectorFill,
                  styles.connectorOverlay,
                  { backgroundColor: theme.primary },
                ]}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Right: content card. */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: next ? theme.primary : 'transparent',
            opacity: status === 'upcoming' ? 0.55 : 1,
          },
        ]}
      >
        <View style={styles.cardHead}>
          <ThemedText type="smallBold">{milestone.title}</ThemedText>
          <ThemedText
            type="eyebrow"
            themeColor={done ? 'success' : next ? 'primary' : 'textSecondary'}
          >
            {statusLabel}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {milestone.description}
        </ThemedText>

        {/* Progress bar only for the in-progress step. */}
        {next ? (
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.primary, width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
        ) : null}
      </View>
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
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  summary: {
    marginTop: Spacing.two,
  },
  timeline: {
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rail: {
    alignItems: 'center',
    width: 24,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCheck: {
    fontSize: 12,
    lineHeight: 16,
  },
  connectorTrack: {
    flex: 1,
    width: 2,
    marginVertical: 2,
  },
  connectorFill: {
    flex: 1,
    width: 2,
    borderRadius: 1,
  },
  connectorOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  card: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
});
