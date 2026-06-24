import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import '@/i18n';
import { LanguageProvider } from '@/i18n/language-provider';
import { ThemeProvider, useAppTheme } from '@/theme/theme-provider';

function NavigationShell() {
  const { scheme } = useAppTheme();
  return (
    <NavThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <NavigationShell />
      </LanguageProvider>
    </ThemeProvider>
  );
}
