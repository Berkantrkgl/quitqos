import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type StatCardProps = {
  /** Uppercase label shown at the top (e.g. "Rozetler"). */
  title: string;
  /** The main value (e.g. "3 rozet"), or the locked CTA text when locked. */
  value: string;
  /** Optional leading glyph/emoji. */
  icon?: string;
  /**
   * When true the card renders as a guest-locked tile: a 🔒 marker, muted
   * styling, and a CTA value. Used for the leaderboard, which is
   * registered-only (guests can't see a rank).
   */
  locked?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * A compact stat tile. Doubles as the normal "Rozetler" card and the
 * guest-locked "Sıralama" card (see M2 in CLAUDE.md).
 */
export function StatCard({ title, value, icon, locked = false, onPress, style }: StatCardProps) {
  const theme = useTheme();

  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}
    >
      <View style={styles.header}>
        {icon ? <ThemedText type="small">{icon}</ThemedText> : null}
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {title}
        </ThemedText>
        {locked ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.lock}>
            🔒
          </ThemedText>
        ) : null}
      </View>
      <ThemedText
        type="smallBold"
        themeColor={locked ? 'primary' : 'text'}
        style={styles.value}
      >
        {value}
      </ThemedText>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  lock: {
    marginLeft: 'auto',
  },
  value: {
    fontSize: 18,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
