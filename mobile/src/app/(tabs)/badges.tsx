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

export default function BadgesScreen() {
  const { t } = useTranslation();
  const { attempt } = useQuitStreak();
  const elapsed = useElapsedTime(attempt?.startedAt ?? null);

  if (!attempt || !elapsed) {
    return (
      <PlaceholderScreen
        title={t('badgesScreen.emptyTitle')}
        hint={t('badgesScreen.emptyBody')}
        icon="🏅"
      />
    );
  }

  const total = elapsed.totalMinutes;
  const doneCount = MILESTONES.filter((m) => m.offsetMinutes <= total).length;
  const progress = doneCount / MILESTONES.length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Header doneCount={doneCount} progress={progress} />

          <View style={styles.grid}>
            {MILESTONES.map((m) => (
              <BadgeCell key={m.key} milestone={m} unlocked={m.offsetMinutes <= total} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Header({ doneCount, progress }: { doneCount: number; progress: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <ThemedText type="subtitle">{t('badgesScreen.title')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('badgesScreen.subtitle')}
      </ThemedText>
      <ThemedText type="eyebrow" themeColor="primary" style={styles.summary}>
        {t('badgesScreen.summary', { done: doneCount, total: MILESTONES.length })}
      </ThemedText>
      <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: theme.primary, width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

/** A single badge tile. Colored + emoji when unlocked; muted + lock when not. */
function BadgeCell({ milestone, unlocked }: { milestone: Milestone; unlocked: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.cellWrap}>
      <View
        style={[
          styles.cell,
          {
            backgroundColor: unlocked ? theme.primaryMuted : theme.backgroundElement,
            borderColor: unlocked ? theme.primary : theme.border,
          },
        ]}
      >
        <ThemedText style={[styles.medal, !unlocked && styles.medalLocked]}>
          {unlocked ? milestone.icon : '🔒'}
        </ThemedText>
        <ThemedText
          type="smallBold"
          themeColor={unlocked ? 'text' : 'textSecondary'}
          style={styles.cellTitle}
        >
          {milestone.title}
        </ThemedText>
        <ThemedText type="eyebrow" themeColor={unlocked ? 'primary' : 'textSecondary'}>
          {unlocked ? t('badgesScreen.statusUnlocked') : t('badgesScreen.lockedHint')}
        </ThemedText>
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
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.one,
  },
  cellWrap: {
    width: '50%',
    padding: Spacing.one,
  },
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 132,
    justifyContent: 'center',
  },
  medal: {
    fontSize: 40,
    lineHeight: 48,
  },
  medalLocked: {
    fontSize: 26,
    lineHeight: 40,
    opacity: 0.6,
  },
  cellTitle: {
    marginTop: Spacing.one,
    textAlign: 'center',
  },
});
