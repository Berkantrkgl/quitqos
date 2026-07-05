import { Award, HeartPulse, House, Trophy, type LucideIcon } from 'lucide-react-native';

/**
 * Tab bar icons from Lucide (line icons drawn as SVG via react-native-svg), so
 * they render pixel-identically on iOS and Android and follow the theme color.
 * Focus is conveyed by color plus a slightly heavier stroke — never by filling.
 *
 * Mapping (see design/sukut/tabbar.html):
 *   Home → house · Health → heart-pulse · Badges → award · Leaderboard → trophy
 */

export type TabIconProps = {
  color: string;
  size?: number;
  focused?: boolean;
};

/** Shared renderer: focus only bumps the stroke weight. */
function make(Glyph: LucideIcon) {
  return function TabIcon({ color, size = 24, focused = false }: TabIconProps) {
    return <Glyph color={color} size={size} strokeWidth={focused ? 2.1 : 1.9} />;
  };
}

/** Home — a house. */
export const HomeIcon = make(House);

/** Health — a heart with a pulse line (recovery, not just "love"). */
export const HealthIcon = make(HeartPulse);

/** Badges — a medal/award. */
export const BadgesIcon = make(Award);

/** Leaderboard — a trophy. */
export const LeaderboardIcon = make(Trophy);
