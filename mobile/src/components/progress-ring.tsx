import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type ProgressRingProps = {
  /** Fill fraction, 0–1 (clamped). */
  progress: number;
  /** Outer diameter in px. */
  size?: number;
  /** Stroke thickness in px. */
  strokeWidth?: number;
  /** Track (unfilled) color. Defaults to the theme border color. */
  trackColor?: string;
  /** Progress (filled) color. Defaults to the theme primary color. */
  color?: string;
  /** Centered content (e.g. the day count). */
  children?: ReactNode;
  style?: ViewStyle;
};

/**
 * A solid-color circular progress ring (no gradient). The arc starts at the
 * top (12 o'clock) and fills clockwise. Content is centered inside the ring.
 */
export function ProgressRing({
  progress,
  size = 220,
  strokeWidth = 14,
  trackColor,
  color,
  children,
  style,
}: ProgressRingProps) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor ?? theme.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc — rotated -90° so it starts at 12 o'clock. */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color ?? theme.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {/* Centered content overlay. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}
