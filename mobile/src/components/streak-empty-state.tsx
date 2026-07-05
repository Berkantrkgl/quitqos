import { type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useQuitStreak } from '@/hooks/use-quit-streak';
import { useTheme } from '@/hooks/use-theme';

type StreakEmptyStateProps = {
  /** Small uppercase label above the title (already translated). */
  eyebrow: string;
  /** Screen title shown pinned at the top (already translated). */
  screenTitle: string;
  /** Line-drawn Lucide glyph shown in the centered disc (no emoji). */
  icon: LucideIcon;
  /** Centered headline inviting the user to start (already translated). */
  title: string;
  /** Supporting line under the headline (already translated). */
  body: string;
  /** CTA label (already translated). */
  cta: string;
};

/**
 * The shared "no streak yet" screen for the Health and Badges tabs (design/sukut).
 * Both tabs are empty until a streak exists, so instead of a passive placeholder they
 * show the same calm invitation — a glyph, a headline, and a button that starts the
 * counter right here (via useQuitStreak, so guests start locally and registered users
 * hit the backend). Keeping it in one component keeps the two tabs visually identical.
 */
export function StreakEmptyState({
  eyebrow,
  screenTitle,
  icon: Icon,
  title,
  body,
  cta,
}: StreakEmptyStateProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { startStreak } = useQuitStreak();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="eyebrow" themeColor="textTertiary">
            {eyebrow}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.screenTitle}>
            {screenTitle}
          </ThemedText>
        </View>

        <View style={styles.body}>
          <View style={[styles.disc, { backgroundColor: theme.backgroundElement }]}>
            <Icon color={theme.textTertiary} size={34} strokeWidth={1.6} />
          </View>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {body}
          </ThemedText>
          <Pressable
            onPress={() => startStreak()}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText type="smallBold" themeColor="onPrimary">
              {cta}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
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
    paddingBottom: Spacing.three,
  },
  screenTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: Spacing.one,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
  },
  disc: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: Spacing.three,
    textAlign: 'center',
    maxWidth: 280,
  },
  hint: {
    marginTop: Spacing.two,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  cta: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 14,
  },
});
