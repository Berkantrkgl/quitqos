/**
 * Milestone catalogue — the 13 fixed offsets, shared by guest and registered
 * users alike (mobile never fetches milestone content from the backend; see
 * CLAUDE.md "Milestone seed").
 *
 * Structure only: `key`, `offsetMinutes`, and the badge `Icon`. The visible
 * text (title / description / short label) lives in i18n under
 * `milestoneContent.<key>.*` (tr/en) so it follows the app language — resolve
 * it with the helpers below (`milestoneTitle`, `milestoneDescription`,
 * `milestoneShort`) rather than reading a field off the object.
 */

import type { TFunction } from 'i18next';
import {
  Activity,
  CalendarDays,
  Droplets,
  Dumbbell,
  Flower2,
  Footprints,
  Heart,
  ScanFace,
  Sun,
  Trophy,
  UtensilsCrossed,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

/** The 13 fixed milestone identities — also the i18n lookup keys for text. */
export type MilestoneKey =
  | '20min'
  | '12h'
  | '24h'
  | '48h'
  | '72h'
  | '5days'
  | '1week'
  | '10days'
  | '2weeks'
  | '1month'
  | '3months'
  | '6months'
  | '1year';

export type Milestone = {
  /**
   * Stable key — mirrors the backend milestone identity (fixed offsets) and is
   * the i18n lookup key for the visible text (`milestoneContent.<key>.*`).
   */
  key: MilestoneKey;
  /** Elapsed minutes from streak start at which this milestone is earned. */
  offsetMinutes: number;
  /**
   * Line-drawn Lucide icon shown as the badge face. Replaces the old emoji so
   * badges render pixel-identically on iOS/Android and follow the theme color
   * (see design/sukut/badges-impeccable.html, direction D). Each glyph is chosen
   * to match the milestone's health fact.
   */
  Icon: LucideIcon;
};

/** The 13 fixed milestones, ordered by offset (ascending). Text is in i18n. */
export const MILESTONES: readonly Milestone[] = [
  { key: '20min', offsetMinutes: 20, Icon: Heart },
  { key: '12h', offsetMinutes: 720, Icon: Droplets },
  { key: '24h', offsetMinutes: 1440, Icon: Sun },
  { key: '48h', offsetMinutes: 2880, Icon: ScanFace },
  { key: '72h', offsetMinutes: 4320, Icon: Wind },
  { key: '5days', offsetMinutes: 7200, Icon: Dumbbell },
  { key: '1week', offsetMinutes: 10080, Icon: CalendarDays },
  { key: '10days', offsetMinutes: 14400, Icon: UtensilsCrossed },
  { key: '2weeks', offsetMinutes: 20160, Icon: Activity },
  { key: '1month', offsetMinutes: 43200, Icon: Zap },
  { key: '3months', offsetMinutes: 129600, Icon: Footprints },
  { key: '6months', offsetMinutes: 259200, Icon: Flower2 },
  { key: '1year', offsetMinutes: 525600, Icon: Trophy },
] as const;

/**
 * Resolve a milestone's visible text from i18n (`milestoneContent.<key>.*`).
 * `t` is passed in by the caller (a component's `useTranslation().t`, or the
 * i18n instance's `t` from non-component code like notifications). Kept here so
 * every screen looks the text up the same way and the key scheme stays in one
 * place.
 *
 * The keys are typed as the exact literal union the project's strict
 * `CustomTypeOptions` expects (see i18next.d.ts / mobile/CLAUDE.md's "don't pass
 * a loosely-typed t" note), so `t(...)` type-checks without widening.
 */
type MilestoneField = 'title' | 'description' | 'short';
/** The exact literal-key union the strict TFunction expects for our text keys. */
type MilestoneTextKey = `milestoneContent.${MilestoneKey}.${MilestoneField}`;

function milestoneText(t: TFunction, m: Milestone, field: MilestoneField): string {
  // Every key here is a real entry present in both locales; the template type
  // stays inside the strict TFunction literal-key union, so no cast is needed.
  const key: MilestoneTextKey = `milestoneContent.${m.key}.${field}`;
  return t(key);
}

export function milestoneTitle(t: TFunction, m: Milestone): string {
  return milestoneText(t, m, 'title');
}
export function milestoneDescription(t: TFunction, m: Milestone): string {
  return milestoneText(t, m, 'description');
}
export function milestoneShort(t: TFunction, m: Milestone): string {
  return milestoneText(t, m, 'short');
}

/**
 * The next milestone the user is working toward, given elapsed minutes.
 * Returns `null` once every milestone has been earned.
 */
export function getNextMilestone(elapsedMinutes: number): Milestone | null {
  return MILESTONES.find((m) => m.offsetMinutes > elapsedMinutes) ?? null;
}

/** The most recently earned milestone, or `null` if none earned yet. */
export function getLastEarnedMilestone(elapsedMinutes: number): Milestone | null {
  let last: Milestone | null = null;
  for (const m of MILESTONES) {
    if (m.offsetMinutes <= elapsedMinutes) last = m;
    else break;
  }
  return last;
}

/** How many milestones have been earned given elapsed minutes. */
export function getEarnedMilestoneCount(elapsedMinutes: number): number {
  return MILESTONES.filter((m) => m.offsetMinutes <= elapsedMinutes).length;
}
