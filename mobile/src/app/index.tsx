import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatCard } from '@/components/stat-card';
import { StreakDashboardCard } from '@/components/streak-dashboard-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getEarnedMilestoneCount } from '@/constants/milestones';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { useQuitStreak } from '@/hooks/use-quit-streak';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const { attempt, isLoading } = useQuitStreak();

  // Avoid a flash of the start prompt before storage is read.
  if (isLoading) return <ThemedView style={styles.container} />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {attempt ? <Dashboard startedAt={attempt.startedAt} /> : <StartPrompt />}
      </SafeAreaView>
    </ThemedView>
  );
}

/** Pre-streak state: invite the user to start (now or backdated). */
function StartPrompt() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { startStreak } = useQuitStreak();

  function handleBackdated() {
    // Lightweight backdate picker without a date-picker dependency.
    Alert.alert(t('home.backdated'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: '1', onPress: () => startStreak(daysAgo(1)) },
      { text: '3', onPress: () => startStreak(daysAgo(3)) },
      { text: '7', onPress: () => startStreak(daysAgo(7)) },
    ]);
  }

  return (
    <View style={styles.startContainer}>
      <ThemedText type="subtitle" style={styles.centered}>
        {t('home.startTitle')}
      </ThemedText>

      <Pressable
        onPress={() => startStreak()}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <ThemedText type="smallBold" themeColor="onPrimary">
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

/** Active-streak state: hero card + stat tiles + relapse. */
function Dashboard({ startedAt }: { startedAt: string }) {
  const { t } = useTranslation();
  const { relapse } = useQuitStreak();
  const elapsed = useElapsedTime(startedAt);
  const earnedCount = getEarnedMilestoneCount(elapsed?.totalMinutes ?? 0);

  function confirmRelapse() {
    Alert.alert(t('relapse.warningTitle'), t('relapse.warningBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('relapse.button'), style: 'destructive', onPress: relapse },
    ]);
  }

  return (
    <View style={styles.dashboardContainer}>
      <StreakDashboardCard startedAt={startedAt} />

      <View style={styles.statRow}>
        {/* onPress wired to the /badges and /leaderboard routes in M4. */}
        <StatCard
          title={t('home.dashboard.badgesTitle')}
          value={t('home.dashboard.badgesValue', { count: earnedCount })}
          icon="🏅"
          style={styles.statTile}
        />
        <StatCard
          title={t('home.dashboard.leaderboardTitle')}
          value={t('home.dashboard.leaderboardLocked')}
          icon="🏆"
          locked
          style={styles.statTile}
        />
      </View>

      <Pressable onPress={confirmRelapse} hitSlop={8} style={styles.relapseButton}>
        <ThemedText type="small" themeColor="danger">
          {t('relapse.button')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  centered: {
    textAlign: 'center',
  },
  startContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  dashboardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignSelf: 'stretch',
  },
  statTile: {
    flex: 1,
  },
  relapseButton: {
    paddingVertical: Spacing.two,
  },
});
