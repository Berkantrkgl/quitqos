import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import {
  BadgesIcon,
  HealthIcon,
  HomeIcon,
  LeaderboardIcon,
  type TabIconProps,
} from './tab-icons';
import { ThemedText } from './themed-text';

/** i18n keys accepted by the translation function for tab labels. */
type TabLabelKey = 'tabs.home' | 'tabs.health' | 'tabs.badges' | 'tabs.leaderboard';

type TabDef = {
  name: string;
  href: string;
  labelKey: TabLabelKey;
  Icon: (props: TabIconProps) => ReactNode;
};

const TABS: TabDef[] = [
  { name: 'index', href: '/', labelKey: 'tabs.home', Icon: HomeIcon },
  { name: 'health', href: '/health', labelKey: 'tabs.health', Icon: HealthIcon },
  { name: 'badges', href: '/badges', labelKey: 'tabs.badges', Icon: BadgesIcon },
  { name: 'leaderboard', href: '/leaderboard', labelKey: 'tabs.leaderboard', Icon: LeaderboardIcon },
];

/**
 * Custom bottom tab bar built on expo-router/ui's headless Tabs. Rendered
 * identically on iOS and Android with SVG icons that follow the theme (see M4).
 */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <TabBar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as never} asChild>
              <TabButton label={tab.labelKey} Icon={tab.Icon} />
            </TabTrigger>
          ))}
        </TabBar>
      </TabList>
    </Tabs>
  );
}

/** The floating bar container; honors the bottom safe-area inset. */
function TabBar({ children, ...props }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}
    >
      {children}
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  label: TabLabelKey;
  Icon: (props: TabIconProps) => ReactNode;
};

/** A single tab: SVG icon + label, tinted by focus state. */
const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { label, Icon, isFocused, ...props },
  ref,
) {
  const { t } = useTranslation();
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;

  return (
    <Pressable
      ref={ref}
      {...props}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <Icon color={color} size={24} focused={isFocused} />
      <ThemedText type="small" style={[styles.label, { color }]}>
        {t(label)}
      </ThemedText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
});
