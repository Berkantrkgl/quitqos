import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { StreakEmptyState } from '@/components/streak-empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  MILESTONES,
  type Milestone,
  milestoneDescription,
  milestoneShort,
  milestoneTitle,
} from '@/constants/milestones';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { useQuitStreak } from '@/hooks/use-quit-streak';
import { useTheme } from '@/hooks/use-theme';

/**
 * Badges — the "Sükût" collection screen (see design/sukut/badges-impeccable.html,
 * direction D). Summary before detail: the most recently earned badge is the hero
 * (large glyph, its health fact, the date it was earned), then the whole set runs
 * below as a tight grid of quiet glyph chips. The next milestone is marked with a
 * hairline ring. Icons are line-drawn Lucide glyphs (no emoji) so they render
 * identically on iOS/Android and follow the theme color.
 */
export default function BadgesScreen() {
  const { t } = useTranslation();
  const { attempt } = useQuitStreak();
  const elapsed = useElapsedTime(attempt?.startedAt ?? null);

  if (!attempt || !elapsed) {
    return (
      <StreakEmptyState
        eyebrow={t('badgesScreen.eyebrow')}
        screenTitle={t('badgesScreen.title')}
        icon={MILESTONES[0].Icon}
        title={t('badgesScreen.startTitle')}
        body={t('badgesScreen.startBody')}
        cta={t('badgesScreen.startButton')}
      />
    );
  }

  const total = elapsed.totalMinutes;
  const doneCount = MILESTONES.filter((m) => m.offsetMinutes <= total).length;
  const nextIndex = MILESTONES.findIndex((m) => m.offsetMinutes > total);
  // Most recently earned = the last done milestone (null before the first one).
  const featured = doneCount > 0 ? MILESTONES[doneCount - 1] : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="eyebrow" themeColor="textTertiary">
            {t('badgesScreen.eyebrow')}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.title}>
            {t('badgesScreen.title')}
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {featured ? (
            <Featured
              milestone={featured}
              startedAt={attempt.startedAt}
              doneCount={doneCount}
            />
          ) : null}

          <View style={styles.sectionRow}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              {t('badgesScreen.allTitle')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionCount}>
              {t('badgesScreen.allCount', { done: doneCount, total: MILESTONES.length })}
            </ThemedText>
          </View>

          <View style={styles.chips}>
            {MILESTONES.map((m, i) => (
              <Chip
                key={m.key}
                milestone={m}
                state={m.offsetMinutes <= total ? 'on' : i === nextIndex ? 'next' : 'off'}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Hero card for the most recently earned badge: a completed teal ring around the
 * milestone's glyph, its title, health fact, and the date it was earned + running
 * count. The one place color carries weight on this screen.
 */
function Featured({
  milestone,
  startedAt,
  doneCount,
}: {
  milestone: Milestone;
  startedAt: string;
  doneCount: number;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { Icon } = milestone;

  // Earned when elapsed first reached the offset: start + offsetMinutes.
  const earnedAt = new Date(new Date(startedAt).getTime() + milestone.offsetMinutes * 60_000);
  const date = formatDate(earnedAt, i18n.language);

  return (
    <View style={[styles.feature, { backgroundColor: theme.primaryMuted }]}>
      <View style={styles.ring}>
        <Svg width={78} height={78} style={StyleSheet.absoluteFill}>
          <Circle cx={39} cy={39} r={35} stroke={theme.primary} strokeOpacity={0.3} strokeWidth={2} fill="none" />
          <Circle cx={39} cy={39} r={35} stroke={theme.primary} strokeWidth={2} fill="none" strokeLinecap="round" />
        </Svg>
        <Icon color={theme.primaryText} size={34} strokeWidth={1.7} />
      </View>

      <View style={styles.featureMeta}>
        <ThemedText type="eyebrow" themeColor="primaryText">
          {t('badgesScreen.featuredLabel')}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.featureTitle}>
          {milestoneTitle(t, milestone)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.featureDesc}>
          {milestoneDescription(t, milestone)}
        </ThemedText>
        <ThemedText type="eyebrow" themeColor="primaryText" style={styles.featureWhen}>
          {t('badgesScreen.featuredMeta', { date, done: doneCount, total: MILESTONES.length })}
        </ThemedText>
      </View>
    </View>
  );
}

type ChipState = 'on' | 'next' | 'off';

/** One badge in the collection grid: filled glyph (earned), ringed (up next), or muted (locked). */
function Chip({ milestone, state }: { milestone: Milestone; state: ChipState }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { Icon } = milestone;

  const disc =
    state === 'on'
      ? { backgroundColor: theme.primaryMuted }
      : state === 'next'
        ? { backgroundColor: theme.background, borderColor: theme.primary, borderWidth: 1.5 }
        : { backgroundColor: theme.backgroundElement };

  const glyphColor =
    state === 'off' ? theme.textTertiary : theme.primaryText;

  return (
    <View style={styles.chip}>
      <View style={[styles.disc, disc]}>
        <Icon color={glyphColor} size={24} strokeWidth={1.7} opacity={state === 'off' ? 0.55 : 1} />
      </View>
      <ThemedText
        type="small"
        themeColor={state === 'off' ? 'textTertiary' : 'textSecondary'}
        style={styles.chipLabel}
      >
        {milestoneShort(t, milestone)}
      </ThemedText>
    </View>
  );
}

/** Localized "3 Temmuz" style date (day + month, no year — recent by nature). */
function formatDate(date: Date, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: Spacing.one,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },

  // Featured hero
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 18,
    padding: Spacing.three,
  },
  ring: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureMeta: {
    flex: 1,
    minWidth: 0,
  },
  featureTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 3,
  },
  featureDesc: {
    lineHeight: 18,
    marginTop: 5,
  },
  featureWhen: {
    marginTop: Spacing.two,
    fontVariant: ['tabular-nums'],
  },

  // Section header
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Spacing.four + Spacing.one,
    marginBottom: Spacing.one,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontVariant: ['tabular-nums'],
  },

  // Collection chips (4-col grid, wraps)
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.two,
  },
  chip: {
    width: '25%',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  disc: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
});
