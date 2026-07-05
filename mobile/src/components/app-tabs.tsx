import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppTheme } from '@/theme/theme-provider';

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
 * Custom bottom tab bar built on expo-router/ui's headless Tabs. The bar is a
 * floating dock ("Sükût" system, see design/sukut/tabbar.html): detached from
 * the edges, rounded, shadowed, with a tinted capsule behind the active tab.
 * Rendered identically on iOS and Android with Lucide SVG icons.
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

/**
 * The floating dock container: absolutely positioned above the content with a
 * side inset, rounded corners, and a soft shadow. Honors the bottom safe-area.
 */
function TabBar({ children, ...props }: { children: ReactNode }) {
  const theme = useTheme();
  const { scheme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
    >
      <View
        style={[
          styles.dock,
          {
            backgroundColor: scheme === 'dark' ? theme.backgroundElement : theme.background,
            borderColor: theme.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  label: TabLabelKey;
  Icon: (props: TabIconProps) => ReactNode;
};

/** A single tab: SVG icon + label, with a tinted capsule when focused. */
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
      style={({ pressed }) => [
        styles.tab,
        isFocused && { backgroundColor: theme.primaryMuted },
        pressed && styles.pressed,
      ]}
    >
      <Icon color={color} size={24} focused={isFocused} />
      <ThemedText
        type="small"
        style={[styles.label, { color: isFocused ? theme.primaryText : theme.textSecondary }]}
      >
        {t(label)}
      </ThemedText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // Full-width wrapper pinned to the bottom; lets touches pass through the gaps.
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  dock: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: Spacing.two,
    // Soft lift so the dock reads as a floating surface.
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: Spacing.two,
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
});
