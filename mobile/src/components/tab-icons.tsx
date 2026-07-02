import Svg, { Path } from 'react-native-svg';

/**
 * Tab bar icons drawn as SVG so they render pixel-identically on iOS and
 * Android and follow the theme color. Each icon takes `color` + `size` and a
 * `focused` flag. Icons are line-drawings, so focus is conveyed by color and a
 * slightly heavier stroke — never by filling (filling a line path collapses it
 * into a blob).
 *
 * Paths are on a 24×24 viewBox (Material-style line icons).
 */

export type TabIconProps = {
  color: string;
  size?: number;
  focused?: boolean;
};

type IconPathProps = TabIconProps & { d: string };

/** Shared renderer: always stroked; focus only bumps the stroke weight. */
function Icon({ color, size = 24, focused = false, d }: IconPathProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={focused ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Home — a house. */
export function HomeIcon(props: TabIconProps) {
  return <Icon {...props} d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z" />;
}

/** Health — a heart. */
export function HealthIcon(props: TabIconProps) {
  return (
    <Icon
      {...props}
      d="M12 20s-7-4.35-9.33-8.5C1.4 9.24 2.34 6 5.5 6 7.36 6 8.66 7.1 12 10c3.34-2.9 4.64-4 6.5-4 3.16 0 4.1 3.24 2.83 5.5C19 15.65 12 20 12 20Z"
    />
  );
}

/** Badges — a medal: two ribbons meeting at a round medallion. */
export function BadgesIcon(props: TabIconProps) {
  return (
    <Icon
      {...props}
      d="M8.5 3 12 9m3.5-6L12 9m0 0-2.2 2M12 9l2.2 2M12 22a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
    />
  );
}

/** Leaderboard — a trophy. */
export function LeaderboardIcon(props: TabIconProps) {
  return (
    <Icon
      {...props}
      d="M8 4h8v4a4 4 0 0 1-8 0V4Zm0 2H5v1a3 3 0 0 0 3 3m8-4h3v1a3 3 0 0 1-3 3m-4 4v3m-3 3h6l-.5-3h-5L9 20Z"
    />
  );
}
