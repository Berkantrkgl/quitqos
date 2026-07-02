import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Decorative sample rows behind the sign-in gate — not real data. They show a
// guest what the leaderboard looks like without inventing a rank for them.
const SAMPLE_ROWS = [
  { rank: 1, username: 'aysekaya', days: 312, medal: '🥇' },
  { rank: 2, username: 'mehmet_d', days: 287, medal: '🥈' },
  { rank: 3, username: 'zeynep06', days: 264, medal: '🥉' },
  { rank: 4, username: 'can_t', days: 198, medal: null },
  { rank: 5, username: 'elifs', days: 156, medal: null },
];

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  function handleSignIn() {
    // Real Firebase auth flow is a later stage; backend endpoints already exist.
    Alert.alert(t('leaderboardScreen.signIn'), t('common.comingSoon'));
  }

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
                  gün
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
              onPress={handleSignIn}
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
