/**
 * Pure elapsed-time helpers. No React, no side effects — trivially testable.
 */

export type Elapsed = {
  /** Total elapsed milliseconds (clamped to >= 0). */
  totalMs: number;
  /** Total whole days elapsed (used for the big ring numeral & milestones). */
  days: number;
  /** Hours within the current day (0–23). */
  hours: number;
  /** Minutes within the current hour (0–59). */
  minutes: number;
  /** Seconds within the current minute (0–59). */
  seconds: number;
  /** Total elapsed minutes (floored) — for milestone comparisons. */
  totalMinutes: number;
  /** Whole years (1 year = 365 days — matches the milestone catalogue). */
  years: number;
  /** Whole months after removing full years (1 month = 30 days). */
  months: number;
  /** Days remaining after removing full years and months. */
  dayOfMonth: number;
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Fixed-length year/month so the breakdown matches the milestone offsets
// (1 month = 43200 min = 30 days, 1 year = 525600 min = 365 days).
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

/**
 * Break down the time elapsed from `startedAt` up to `now` into
 * days/hours/minutes/seconds. A future `startedAt` clamps to zero.
 *
 * @param startedAt streak start (ms epoch, ISO string, or Date)
 * @param now       reference time (ms epoch), defaults to Date.now()
 */
/**
 * Which unit leads the hero number on the home screen, plus the leftover
 * breakdown shown quietly beneath it. Pure — the UI supplies the unit words.
 *
 * - < 30 days     → hero: `days` (unit "gün"),   remainder: none
 * - < 365 days    → hero: `months` (unit "ay"),  remainder: dayOfMonth (+hours)
 * - >= 365 days   → hero: `years` (unit "yıl"),  remainder: months + dayOfMonth (+hours)
 *
 * Rationale: the big number always shows the most meaningful unit so it stays
 * legible; the precise leftover lives in a secondary line. See sukut/home.html.
 */
export type StreakScale = 'days' | 'months' | 'years';

export type StreakFigure = {
  /** The leading unit for the hero number. */
  scale: StreakScale;
  /** The hero number's value (days, whole months, or whole years). */
  heroValue: number;
  /** Remainder parts to render beneath, largest first (empty for the days scale). */
  remainder: Array<{ unit: 'months' | 'days' | 'hours'; value: number }>;
};

export function streakFigure(e: Elapsed): StreakFigure {
  if (e.days >= DAYS_PER_YEAR) {
    return {
      scale: 'years',
      heroValue: e.years,
      remainder: [
        { unit: 'months', value: e.months },
        { unit: 'days', value: e.dayOfMonth },
        { unit: 'hours', value: e.hours },
      ].filter((p) => p.value > 0 || p.unit === 'days') as StreakFigure['remainder'],
    };
  }
  if (e.days >= DAYS_PER_MONTH) {
    return {
      scale: 'months',
      heroValue: e.months + e.years * 12, // years is 0 here, kept for safety
      remainder: [
        { unit: 'days', value: e.dayOfMonth },
        { unit: 'hours', value: e.hours },
      ].filter((p) => p.value > 0 || p.unit === 'days') as StreakFigure['remainder'],
    };
  }
  return { scale: 'days', heroValue: e.days, remainder: [] };
}

export function elapsedFrom(startedAt: number | string | Date, now: number = Date.now()): Elapsed {
  const startMs =
    startedAt instanceof Date
      ? startedAt.getTime()
      : typeof startedAt === 'string'
        ? Date.parse(startedAt)
        : startedAt;

  const totalMs = Math.max(0, now - startMs);
  const totalDays = Math.floor(totalMs / MS_PER_DAY);

  const years = Math.floor(totalDays / DAYS_PER_YEAR);
  const daysAfterYears = totalDays - years * DAYS_PER_YEAR;
  const months = Math.floor(daysAfterYears / DAYS_PER_MONTH);
  const dayOfMonth = daysAfterYears - months * DAYS_PER_MONTH;

  return {
    totalMs,
    days: totalDays,
    hours: Math.floor((totalMs % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((totalMs % MS_PER_MINUTE) / MS_PER_SECOND),
    totalMinutes: Math.floor(totalMs / MS_PER_MINUTE),
    years,
    months,
    dayOfMonth,
  };
}
