import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import tr from './locales/tr.json';

export const resources = {
  en: { translation: en },
  tr: { translation: tr },
} as const;

export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

/** Cihaz dilini desteklenen dillerden birine eşler, yoksa varsayılana düşer. */
export function getDeviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code ?? '')
    ? (code as AppLanguage)
    : DEFAULT_LANGUAGE;
}

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
