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
    description: 'Nabzın ve tansiyonun, nikotinin yol açtığı yükselmenin ardından düşmeye başlıyor.',
  },
  {
    key: '12h',
    offsetMinutes: 720,
    title: '12 saat',
    description: 'Kandaki karbonmonoksit normale iniyor; oksijen taşıma kapasiten düzeliyor.',
  },
  {
    key: '24h',
    offsetMinutes: 1440,
    title: '24 saat',
    description: 'Kandaki nikotin seviyesi neredeyse sıfıra indi.',
  },
  {
    key: '48h',
    offsetMinutes: 2880,
    title: '48 saat',
    description: 'Tat ve koku duyuların keskinleşmeye başlıyor.',
  },
  {
    key: '72h',
    offsetMinutes: 4320,
    title: '72 saat',
    description: 'Bronşların gevşiyor, nefes almak kolaylaşıyor.',
  },
  {
    key: '5days',
    offsetMinutes: 7200,
    title: '5 gün',
    description: 'Yoksunluğun en yoğun günleri geride kaldı — en zor kısmı devirdin.',
  },
  {
    key: '1week',
    offsetMinutes: 10080,
    title: '1 hafta',
    description: 'Vücudun nikotinsiz düzene uyum sağlamaya başlıyor.',
  },
  {
    key: '10days',
    offsetMinutes: 14400,
    title: '10 gün',
    description: 'Tat ve koku almaya belirgin biçimde başlıyorsun; yemekler daha lezzetli.',
  },
  {
    key: '2weeks',
    offsetMinutes: 20160,
    title: '2 hafta',
    description: 'Dolaşımın düzeliyor; yürüyüş ve hareket etmek kolaylaşıyor.',
  },
  {
    key: '1month',
    offsetMinutes: 43200,
    title: '1 ay',
    description: 'Akciğer fonksiyonun düzeliyor, öksürük azalıyor ve enerjin toparlanmaya başlıyor.',
  },
  {
    key: '3months',
    offsetMinutes: 129600,
    title: '3 ay',
    description: 'Dolaşımın ve akciğer fonksiyonun belirgin biçimde iyileşiyor.',
  },
  {
    key: '6months',
    offsetMinutes: 259200,
    title: '6 ay',
    description: 'Stres ve gerginliğin azalıyor; ruh halin daha dengeli hale geliyor.',
  },
  {
    key: '1year',
    offsetMinutes: 525600,
    title: '1 yıl',
    description: 'Koroner kalp hastalığı fazla riskin, içmeye devam edenlerin yarısına iniyor.',
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
