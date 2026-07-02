import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type PlaceholderScreenProps = {
  /** Screen title (already translated). */
  title: string;
  /** Body/hint text (already translated). */
  hint: string;
  /** Leading glyph/emoji. */
  icon?: string;
};

/**
 * Minimal "coming soon" screen used by the Health / Badges / Leaderboard tabs
 * until their real content lands. Guest leaderboard shows a sign-in hint here.
 */
export function PlaceholderScreen({ title, hint, icon }: PlaceholderScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {icon ? <ThemedText type="display">{icon}</ThemedText> : null}
          <ThemedText type="subtitle" style={styles.centered}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {hint}
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
});
