import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { type AppLanguage, SUPPORTED_LANGUAGES } from '@/i18n';
import { useLanguage } from '@/i18n/language-provider';
import { type ThemePreference, useAppTheme } from '@/theme/theme-provider';

type ThemeOption = {
  value: ThemePreference;
  labelKey: 'settings.themeSystem' | 'settings.themeLight' | 'settings.themeDark';
  icon: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', labelKey: 'settings.themeSystem', icon: '📱' },
  { value: 'light', labelKey: 'settings.themeLight', icon: '☀️' },
  { value: 'dark', labelKey: 'settings.themeDark', icon: '🌙' },
];

const LANGUAGE_META: Record<AppLanguage, { labelKey: 'language.tr' | 'language.en'; flag: string }> = {
  tr: { labelKey: 'language.tr', flag: '🇹🇷' },
  en: { labelKey: 'language.en', flag: '🇬🇧' },
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { preference, setPreference } = useAppTheme();
  const { language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Modal header: title + close (root Stack has no header). */}
        <View style={styles.header}>
          <ThemedText type="subtitle">{t('settings.title')}</ThemedText>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText type="smallBold" themeColor="textSecondary">
              ✕
            </ThemedText>
          </Pressable>
        </View>

        {/* Account */}
        <SectionHeader icon="👤" title={t('auth.account')} hint={t('auth.subtitle')} />
        {user ? (
          <View style={[styles.accountRow, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">@{user.username}</ThemedText>
            <Pressable onPress={signOut} hitSlop={8}>
              <ThemedText type="smallBold" themeColor="danger">
                {t('auth.signOut')}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.signInButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <ThemedText type="smallBold" themeColor="onPrimary">
              {t('auth.title')}
            </ThemedText>
          </Pressable>
        )}

        {/* Appearance */}
        <SectionHeader
          icon="🎨"
          title={t('settings.theme')}
          hint={t('settings.themeHint')}
        />
        <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
          {THEME_OPTIONS.map((opt) => {
            const selected = preference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPreference(opt.value)}
                style={[
                  styles.segmentItem,
                  selected && {
                    backgroundColor: theme.background,
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  },
                ]}
              >
                <ThemedText style={styles.segmentIcon}>{opt.icon}</ThemedText>
                <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                  {t(opt.labelKey)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Language */}
        <SectionHeader
          icon="🌐"
          title={t('settings.language')}
          hint={t('settings.languageHint')}
        />
        <View style={styles.langRow}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const selected = language === lang;
            const meta = LANGUAGE_META[lang];
            return (
              <Pressable
                key={lang}
                onPress={() => setLanguage(lang)}
                style={({ pressed }) => [
                  styles.langCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <ThemedText style={styles.flag}>{meta.flag}</ThemedText>
                <ThemedText type="small" themeColor={selected ? 'primary' : 'text'}>
                  {t(meta.labelKey)}
                </ThemedText>
                {selected ? (
                  <ThemedText type="smallBold" themeColor="primary" style={styles.langCheck}>
                    ✓
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/** A section title with a leading emoji chip and a one-line hint. */
function SectionHeader({ icon, title, hint }: { icon: string; title: string; hint: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small">{icon}</ThemedText>
      </View>
      <View style={styles.sectionText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.four,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  signInButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionText: {
    gap: 1,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: Spacing.two + 2,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  segmentIcon: {
    fontSize: 13,
    lineHeight: 18,
  },
  langRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  langCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flag: {
    fontSize: 18,
    lineHeight: 22,
  },
  langCheck: {
    marginLeft: 'auto',
  },
});
