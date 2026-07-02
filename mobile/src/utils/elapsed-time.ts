/**
 * Pure elapsed-time helpers. No React, no side effects — trivially testable.
 */

export type Elapsed = {
  /** Total elapsed milliseconds (clamped to >= 0). */
  totalMs: number;
  /** Whole days component. */
  days: number;
  /** Hours within the current day (0–23). */
  hours: number;
  /** Minutes within the current hour (0–59). */
  minutes: number;
  /** Seconds within the current minute (0–59). */
  seconds: number;
  /** Total elapsed minutes (floored) — for milestone comparisons. */
  totalMinutes: number;
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Break down the time elapsed from `startedAt` up to `now` into
 * days/hours/minutes/seconds. A future `startedAt` clamps to zero.
 *
 * @param startedAt streak start (ms epoch, ISO string, or Date)
 * @param now       reference time (ms epoch), defaults to Date.now()
 */
export function elapsedFrom(startedAt: number | string | Date, now: number = Date.now()): Elapsed {
  const startMs =
    startedAt instanceof Date
      ? startedAt.getTime()
      : typeof startedAt === 'string'
        ? Date.parse(startedAt)
        : startedAt;

  const totalMs = Math.max(0, now - startMs);

  return {
    totalMs,
    days: Math.floor(totalMs / MS_PER_DAY),
    hours: Math.floor((totalMs % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((totalMs % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((totalMs % MS_PER_MINUTE) / MS_PER_SECOND),
    totalMinutes: Math.floor(totalMs / MS_PER_MINUTE),
  };
}
