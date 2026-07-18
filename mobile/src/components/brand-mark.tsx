import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type BrandMarkProps = {
  /** Rendered width & height in px (the mark is square). */
  size?: number;
};

/**
 * QuitQOS "Twin Rings" brand mark — the canonical logo, drawn as SVG so it
 * renders pixel-identically on iOS and Android and follows the active theme.
 *
 * Meaning: two overlapping rings (a QuitQOS "QQ") — left = O, right = Q, with
 * the amber tail = "the now / streak". The launcher /
 * splash PNGs are rasterised from design/sukut/assets-src/mark-color.svg, which
 * mirrors this exact geometry (just richer: gradient + glow on a dark ground).
 *
 * This in-app variant is deliberately FLAT: a single teal stroke that takes the
 * theme's `primary`, plus an amber (`streak`) tail — no gradient or glow, so it
 * reads cleanly at small sizes and on any background, light or dark.
 */
export function BrandMark({ size = 40 }: BrandMarkProps) {
  const theme = useTheme();
  // viewBox is 100×100; every coordinate matches mark-color.svg 1:1.
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* right ring (Q) — drawn first */}
      <Circle cx={63} cy={50} r={20} stroke={theme.primary} strokeWidth={9} fill="none" />
      {/* Q tail (amber / streak) */}
      <Path
        d="M74.5 62 L86 73.5"
        stroke={theme.streak}
        strokeWidth={9}
        strokeLinecap="round"
        fill="none"
      />
      {/* left ring (O) — drawn on top, a clean z-order overlap at the crossing */}
      <Circle cx={37} cy={50} r={20} stroke={theme.primary} strokeWidth={9} fill="none" />
    </Svg>
  );
}
