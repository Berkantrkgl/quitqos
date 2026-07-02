import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useAppTheme } from '@/theme/theme-provider';

/** The tab shell. The root Stack layers the settings modal on top of this. */
export default function TabsLayout() {
  const { scheme } = useAppTheme();
  return (
    <NavThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </NavThemeProvider>
  );
}
