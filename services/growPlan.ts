/**
 * 7-day grow plan: one plant, five photo check-ins (days 1, 2, 3, 5, 7).
 * Derived entirely from saved journal reports. Nothing is promised about the
 * plant's outcome; the plan only shows the scores the grower's own reports gave.
 */
const DAY = 24 * 3600 * 1000;

export const PLAN_MILESTONES = [
  { day: 1, title: 'First check-in', detail: 'Save a photo report to start your plan.' },
  { day: 2, title: 'Re-check: what changed?', detail: 'Take a new photo of the same plant and see its score next to your first one.' },
  { day: 3, title: 'See the trend', detail: 'Three check-ins show which way your plant is heading.' },
  { day: 5, title: 'Mid-week check-in', detail: 'Keep the record going and catch changes early.' },
  { day: 7, title: '7-day progress report', detail: 'Finish the week and compare day 1 with day 7 side by side.' },
] as const;

export type PlanCheck = { at: number; score: number; image?: string; topAction?: string; diagnosis?: string };
export type GrowPlan =
  | { started: false }
  | {
    started: true; plantId: string; plantName: string; checks: PlanCheck[]; done: number; day: number;
    checkedToday: boolean; complete: boolean; delta: number;
    trend: 'improving' | 'holding steady' | 'needs attention' | null;
    next: (typeof PLAN_MILESTONES)[number] | null;
  };

const dayIndex = (time: number) => { const d = new Date(time); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY); };

export function entryTime(entry: any): number {
  const created = Date.parse(entry?.createdAt || '');
  if (Number.isFinite(created)) return created;
  const id = Number(entry?.id);
  if (Number.isFinite(id) && id > 1e12 && id < 1e13) return id; // Local entries use Date.now() as their id.
  const dated = Date.parse(entry?.date || '');
  return Number.isFinite(dated) ? dated : NaN;
}

/** Saved photo reports for one plant, oldest first, one per calendar day (the latest of each day). */
export function planChecks(plant: any): PlanCheck[] {
  const byDay = new Map<number, PlanCheck>();
  for (const entry of plant?.journal || []) {
    const score = Number(entry?.diagnosisData?.healthScore);
    const at = entryTime(entry);
    if (!Number.isFinite(score) || !Number.isFinite(at)) continue;
    const key = dayIndex(at);
    const existing = byDay.get(key);
    if (!existing || at >= existing.at) byDay.set(key, { at, score: Math.round(score), image: entry.image || entry.imageUri, topAction: entry.diagnosisData.topAction, diagnosis: entry.diagnosisData.diagnosis });
  }
  return [...byDay.values()].sort((a, b) => a.at - b.at);
}

export function buildGrowPlan(plants: any[], now = Date.now()): GrowPlan {
  let focus: { plant: any; checks: PlanCheck[] } | null = null;
  for (const plant of plants || []) {
    const checks = planChecks(plant);
    if (checks.length && (!focus || checks[checks.length - 1].at > focus.checks[focus.checks.length - 1].at)) focus = { plant, checks };
  }
  if (!focus) return { started: false };
  const checks = focus.checks.slice(-PLAN_MILESTONES.length);
  const first = checks[0], last = checks[checks.length - 1];
  const done = checks.length;
  const delta = last.score - first.score;
  return {
    started: true, plantId: String(focus.plant.id), plantName: String(focus.plant.name || focus.plant.strain || 'Your plant'), checks, done,
    day: Math.max(1, dayIndex(now) - dayIndex(first.at) + 1),
    checkedToday: dayIndex(last.at) === dayIndex(now),
    complete: done >= PLAN_MILESTONES.length,
    delta,
    trend: done < 2 ? null : delta >= 3 ? 'improving' : delta <= -3 ? 'needs attention' : 'holding steady',
    next: done < PLAN_MILESTONES.length ? PLAN_MILESTONES[done] : null,
  };
}

/** The previous saved score for this plant from an earlier day, for the in-report comparison. */
export function previousCheck(plant: any, now = Date.now()): PlanCheck | null {
  const earlier = planChecks(plant).filter(check => dayIndex(check.at) < dayIndex(now));
  return earlier.length ? earlier[earlier.length - 1] : null;
}
