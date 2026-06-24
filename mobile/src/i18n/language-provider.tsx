import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import i18n, { AppLanguage, getDeviceLanguage, SUPPORTED_LANGUAGES } from '@/i18n';

const STORAGE_KEY = 'quitqos.language';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => getDeviceLanguage());

  // Kayıtlı dil tercihini yükle (yoksa cihaz dili kalır).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
        const lang = stored as AppLanguage;
        setLanguageState(lang);
        i18n.changeLanguage(lang);
      }
    });
  }, []);

  function setLanguage(lang: AppLanguage) {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang);
  }

  return <LanguageContext value={{ language, setLanguage }}>{children}</LanguageContext>;
}

export function useLanguage() {
  const ctx = use(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
