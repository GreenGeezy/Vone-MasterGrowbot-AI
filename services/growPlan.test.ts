import { describe, expect, it } from 'vitest';
import { buildGrowPlan, planChecks, previousCheck } from './growPlan';

const DAY = 86_400_000;
const now = new Date(2026, 10, 10, 15).getTime();
const entry = (daysAgo: number, score: number) => ({
  id: String(now - daysAgo * DAY), createdAt: new Date(now - daysAgo * DAY).toISOString(),
  diagnosisData: { healthScore: score, topAction: 'Check runoff pH', diagnosis: 'Example' },
});
const started = (plants: any[]) => {
  const plan = buildGrowPlan(plants, now);
  if (!plan.started) throw new Error('Plan has not started');
  return plan;
};

describe('7-day grow plan', () => {
  it('has not started without a saved report', () => {
    expect(buildGrowPlan([{ id: 'a', journal: [{ id: '1', notes: 'note only' }] }], now)).toEqual({ started: false });
    expect(buildGrowPlan([], now)).toEqual({ started: false });
  });
  it('starts day 1 with the first saved report and points at the next check-in', () => {
    const plan = started([{ id: 'a', name: 'Tent 1', journal: [entry(0, 72)] }]);
    expect(plan).toMatchObject({ day: 1, done: 1, checkedToday: true, trend: null, plantName: 'Tent 1' });
    expect(plan.next?.day).toBe(2);
  });
  it('counts several reports on one day as one check-in, keeping the latest score', () => {
    const checks = planChecks({ journal: [entry(0.1, 60), entry(0, 75)] });
    expect(checks).toHaveLength(1);
    expect(checks[0].score).toBe(75);
  });
  it('derives score change and trend only from saved scores', () => {
    const plan = started([{ id: 'a', journal: [entry(2, 70), entry(1, 74), entry(0, 79)] }]);
    expect(plan).toMatchObject({ day: 3, done: 3, delta: 9, trend: 'improving' });
    expect(plan.next?.day).toBe(5);
    expect(started([{ id: 'a', journal: [entry(1, 80), entry(0, 70)] }]).trend).toBe('needs attention');
    expect(started([{ id: 'a', journal: [entry(1, 80), entry(0, 81)] }]).trend).toBe('holding steady');
  });
  it('keeps the plan open after a missed day', () => {
    const plan = started([{ id: 'a', journal: [entry(3, 70)] }]);
    expect(plan).toMatchObject({ day: 4, checkedToday: false });
    expect(plan.next?.day).toBe(2);
  });
  it('completes after five check-in days and follows the most recently checked plant', () => {
    const plan = started([{ id: 'old', journal: [entry(9, 50)] }, { id: 'a', journal: [6, 5, 4, 2, 0].map((d, i) => entry(d, 70 + i)) }]);
    expect(plan).toMatchObject({ plantId: 'a', complete: true, next: null });
  });
  it('ignores entries without a usable score or date', () => {
    expect(planChecks({ journal: [{ id: 'x', diagnosisData: { healthScore: 'n/a' } }, { diagnosisData: { healthScore: 80 } }] })).toEqual([]);
  });
  it('compares against an earlier day, never a report from today', () => {
    expect(previousCheck({ journal: [entry(0, 70)] }, now)).toBeNull();
    expect(previousCheck({ journal: [entry(1, 66), entry(0, 70)] }, now)?.score).toBe(66);
  });
});
