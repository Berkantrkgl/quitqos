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
    // nötr — "Sükût" sistemi: nötr tonlar teal'a doğru çok hafif kaydırıldı
    // (saf gri yerine seçilmiş nötr). Metin renkleri ≥4.5:1 kontrast.
    text: '#0C1613',
    textSecondary: '#4C5C55',
    textTertiary: '#86978F', // etiketler/dipnotlar (büyük veya ikincil)
    background: '#FBFDFC',
    backgroundElement: '#F2F5F3',
    backgroundSelected: '#E6ECE9',
    border: '#E6ECE9',
    borderStrong: '#D2DCD7', // hover / güçlü hairline
    // marka
    primary: '#0E9E77',
    primaryText: '#0A7458', // teal'ı METİN olarak kullanırken (kontrast için koyu)
    primaryMuted: '#E4F5EF',
    onPrimary: '#FFFFFF',
    // semantic
    streak: '#C77A0A', // amber, metin olarak okunur olacak şekilde koyulaştırıldı
    streakMuted: '#FBEEDA',
    success: '#0E9E77',
    warning: '#C77A0A',
    danger: '#C4433A',
    dangerMuted: '#FBE7E5',
  },
  dark: {
    // nötr — softer slate (not near-black) so it's easier on the eyes and
    // elevated surfaces read as distinct layers.
    text: '#ECF3F0',
    textSecondary: '#A6B6AF',
    textTertiary: '#6F817A',
    background: '#0C1210',
    backgroundElement: '#151E1A',
    backgroundSelected: '#1E2A25',
    border: '#1E2A25',
    borderStrong: '#30403A',
    // marka
    primary: '#34E3AD',
    primaryText: '#52ECBE',
    primaryMuted: '#123028',
    onPrimary: '#04130E',
    // semantic
    streak: '#F0B429',
    streakMuted: '#2A2410',
    success: '#34E3AD',
    warning: '#F0B429',
    danger: '#EF8880',
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

/**
 * Space to reserve at the bottom of scrollable screens so content clears the
 * floating dock (see components/app-tabs.tsx). Larger than a standard tab bar
 * because the dock is detached, has its own padding + shadow, and sits above
 * the safe-area inset. Screens add their own extra spacing on top of this.
 */
export const BottomTabInset = Platform.select({ ios: 96, android: 100 }) ?? 96;
export const MaxContentWidth = 800;
