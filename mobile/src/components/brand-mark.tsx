import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type BrandMarkProps = {
  /** Rendered width & height in px (the mark is square). */
  size?: number;
};

/**
 * QuitQOS "Orbit Q" brand mark — the canonical logo, drawn as SVG so it renders
 * pixel-identically on iOS and Android and follows the active theme.
 *
 * Meaning: the inner Q is the person (the still centre); the outer orbit is
 * elapsed time; the teal arc is the distance travelled and the amber dot is
 * "now" on that orbit. Single source of truth for the mark's geometry lives in
 * design/sukut/assets-src/mark-color.svg — this component mirrors it exactly.
 * The launcher/splash PNGs are rasterised from that same SVG, so the in-app
 * mark and the OS icon are one and the same design.
 *
 * Colours come from the theme: the orbit track is a neutral (textTertiary), the
 * arc + Q are `primary`, the dot is `streak` (amber). All read on both schemes.
 */
export function BrandMark({ size = 40 }: BrandMarkProps) {
  const theme = useTheme();
  // viewBox is 100×100; every coordinate below matches mark-color.svg 1:1.
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* outer orbit ring — neutral track */}
      <Circle cx={50} cy={50} r={30} stroke={theme.textTertiary} strokeWidth={5} fill="none" />
      {/* travelled arc (teal), from 12 o'clock clockwise to the dot */}
      <Path
        d="M50 20 A30 30 0 0 1 76.5 34.5"
        stroke={theme.primary}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      {/* the "now" dot on the orbit (amber) */}
      <Circle cx={76.5} cy={34.5} r={5} fill={theme.streak} />
      {/* inner Q core */}
      <Circle cx={50} cy={50} r={13.5} stroke={theme.primary} strokeWidth={8} fill="none" />
      {/* Q tail — short so it never touches the orbit */}
      <Path
        d="M59.5 59.5 L69 69"
        stroke={theme.primary}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
