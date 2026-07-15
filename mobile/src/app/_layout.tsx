import { Stack } from 'expo-router';

import { AuthProvider } from '@/hooks/use-auth';
import { QuitStreakProvider } from '@/hooks/use-quit-streak';
import '@/i18n';
import { LanguageProvider } from '@/i18n/language-provider';
import { ThemeProvider } from '@/theme/theme-provider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <QuitStreakProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
              <Stack.Screen name="login" options={{ presentation: 'modal' }} />
            </Stack>
          </QuitStreakProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
