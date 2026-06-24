import 'i18next';

import en from './locales/en.json';

/**
 * t() anahtarlarını tip güvenli yapar: en.json yapısı tek doğruluk kaynağıdır.
 * Eksik/yanlış anahtarlar derleme zamanında hata verir, otomatik tamamlanır.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
