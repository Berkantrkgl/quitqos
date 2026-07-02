import { Stack } from 'expo-router';

import { QuitStreakProvider } from '@/hooks/use-quit-streak';
import '@/i18n';
import { LanguageProvider } from '@/i18n/language-provider';
import { ThemeProvider } from '@/theme/theme-provider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QuitStreakProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          </Stack>
        </QuitStreakProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
