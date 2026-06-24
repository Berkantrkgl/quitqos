/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * QuitQOS marka paleti.
 * primary  → teal/yeşil (sağlık & iyileşme), buton/halka/aktif vurgu
 * streak   → amber, aktif streak & ödül vurgusu
 * success/warning/danger → semantic durumlar (relapse = danger)
 * Her rengin light/dark karşılığı vardır; nötr (text/background) tonlar
 * şablonun mevcut bileşenleriyle uyumlu kalsın diye korunmuştur.
 */
export const Colors = {
  light: {
    // nötr
    text: '#11181C',
    textSecondary: '#60646C',
    background: '#FFFFFF',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    border: '#E2E4E9',
    // marka
    primary: '#10B981',
    primaryMuted: '#D1FAE5',
    onPrimary: '#FFFFFF',
    // semantic
    streak: '#F59E0B',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    dangerMuted: '#FEE2E2',
  },
  dark: {
    // nötr
    text: '#ECEDEE',
    textSecondary: '#B0B4BA',
    background: '#0B0F0E',
    backgroundElement: '#181C1B',
    backgroundSelected: '#23282A',
    border: '#2A2F2E',
    // marka
    primary: '#2DD4A7',
    primaryMuted: '#0F3D33',
    onPrimary: '#04130E',
    // semantic
    streak: '#FBBF24',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    dangerMuted: '#3A1A1A',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
