/**
 * Aktif tema renklerini döndürür.
 * Renkler, kullanıcının tema tercihini (system/light/dark) yöneten
 * ThemeProvider'dan beslenir — bkz. @/theme/theme-provider.
 */
import { useAppTheme } from '@/theme/theme-provider';

export function useTheme() {
  return useAppTheme().colors;
}
