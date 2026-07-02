/**
 * Guest-mode milestone catalogue — hardcoded client-side.
 *
 * Mirrors the backend's 9 static seed rows (see CLAUDE.md "Milestone seed").
 * Guests never contact the backend, so the catalogue lives on the device.
 * `offsetMinutes` is the elapsed time from streak start at which the milestone
 * is earned; content is Turkish to match the backend.
 */

export type Milestone = {
  /** Stable key — mirrors the backend milestone identity (fixed offsets). */
  key: string;
  /** Elapsed minutes from streak start at which this milestone is earned. */
  offsetMinutes: number;
  title: string;
  description: string;
};

/** The 9 fixed milestones, ordered by offset (ascending). */
export const MILESTONES: readonly Milestone[] = [
  {
    key: '20min',
    offsetMinutes: 20,
    title: '20 dakika',
    description: 'Nabzın ve tansiyonun normale dönmeye başladı.',
  },
  {
    key: '8h',
    offsetMinutes: 480,
    title: '8 saat',
    description: 'Kandaki karbonmonoksit seviyesi yarıya indi.',
  },
  {
    key: '24h',
    offsetMinutes: 1440,
    title: '24 saat',
    description: 'Kalp krizi riskin düşmeye başladı.',
  },
  {
    key: '48h',
    offsetMinutes: 2880,
    title: '48 saat',
    description: 'Tat ve koku alma duyuların keskinleşiyor.',
  },
  {
    key: '72h',
    offsetMinutes: 4320,
    title: '72 saat',
    description: 'Nefes alman kolaylaşıyor, bronşların gevşiyor.',
  },
  {
    key: '1week',
    offsetMinutes: 10080,
    title: '1 hafta',
    description: 'Bir haftayı devirdin — en zor kısım geride kaldı.',
  },
  {
    key: '1month',
    offsetMinutes: 43200,
    title: '1 ay',
    description: 'Akciğer fonksiyonların belirgin biçimde iyileşti.',
  },
  {
    key: '3months',
    offsetMinutes: 129600,
    title: '3 ay',
    description: 'Dolaşımın düzeldi, kondisyonun arttı.',
  },
  {
    key: '1year',
    offsetMinutes: 525600,
    title: '1 yıl',
    description: 'Kalp hastalığı riskin, bırakmayanların yarısına indi.',
  },
] as const;

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
