import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { Colors, type ColorScheme } from '@/constants/theme';

const STORAGE_KEY = 'quitqos.theme';

/** Kullanıcının seçtiği tema tercihi. 'system' = cihaz ayarını takip et. */
export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  /** Kullanıcı tercihi (ayarlar ekranında gösterilen). */
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  /** Tercih + cihaz ayarından çözümlenen aktif şema. */
  scheme: ColorScheme;
  /** Aktif şemanın renkleri. */
  colors: (typeof Colors)[ColorScheme];
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  function setPreference(pref: ThemePreference) {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  }

  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  return (
    <ThemeContext value={{ preference, setPreference, scheme, colors: Colors[scheme] }}>
      {children}
    </ThemeContext>
  );
}

export function useAppTheme() {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}
