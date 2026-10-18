import { describe, expect, it, vi } from 'vitest';
import { recordSuccessfulAnalysis, requestAnalysisReview, REVIEW_STATE_KEY } from './analysisReview';
import type { ExtendedDiagnosisResult } from './geminiService';

const report = { diagnosis: 'Nutrient stress', healthScore: 20, severity: 'high', topAction: 'Check the roots', fixSteps: ['Check moisture'] } as ExtendedDiagnosisResult;
function storage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const complete = (s: ReturnType<typeof storage>, r = report) => recordSuccessfulAnalysis(r, s, 'android');

describe('Google Play analysis review opportunities', () => {
  it('waits for three completed reports and does not screen by plant health', () => {
    const s = storage();
    expect(complete(s)).toBe(false);
    expect(complete(s, { ...report, healthScore: 95, severity: 'low' })).toBe(false);
    expect(complete(s, { ...report, healthScore: 0 })).toBe(true);
  });
  it('excludes inconclusive, malformed and missing reports', () => {
    const s = storage();
    for (const r of [null, { ...report, diagnosis: 'Analysis Inconclusive' }, { ...report, topAction: '' }, { ...report, fixSteps: [] }, { ...report, healthScore: NaN }]) {
      expect(complete(s, r as ExtendedDiagnosisResult)).toBe(false);
    }
    expect(s.getItem(REVIEW_STATE_KEY)).toBeNull();
  });
  it('never counts web or iOS use or invokes their review bridge', async () => {
    const s = storage(); const request = vi.fn();
    for (const platform of ['web', 'ios']) {
      expect(recordSuccessfulAnalysis(report, s, platform)).toBe(false);
      await requestAnalysisReview(s, platform, request);
    }
    expect(s.getItem(REVIEW_STATE_KEY)).toBeNull(); expect(request).not.toHaveBeenCalled();
  });
  it('requests once, including concurrent calls and later reports', async () => {
    const s = storage(); const request = vi.fn().mockResolvedValue(undefined);
    complete(s); complete(s);
    await requestAnalysisReview(s, 'android', request); expect(request).not.toHaveBeenCalled();
    complete(s);
    await Promise.all([requestAnalysisReview(s, 'android', request), requestAnalysisReview(s, 'android', request)]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(complete(s)).toBe(false);
  });
  it('retains eligibility when the user leaves before the request', () => {
    const s = storage(); complete(s); complete(s); expect(complete(s)).toBe(true);
    expect(complete(s)).toBe(true);
  });
  it('contains native failure and does not nag on the next analysis', async () => {
    const s = storage(); complete(s); complete(s); complete(s);
    const request = vi.fn().mockRejectedValue(new Error('Play unavailable'));
    await expect(requestAnalysisReview(s, 'android', request)).resolves.toBeUndefined();
    expect(complete(s)).toBe(false);
  });
  it('preserves progress and avoids re-prompting legacy users', () => {
    expect(complete(storage({ diagnosis_success_count: '2' }))).toBe(true);
    for (const count of ['3', '12']) expect(complete(storage({ diagnosis_success_count: count }))).toBe(false);
    expect(complete(storage({ diagnosis_success_count: 'invalid' }))).toBe(false);
  });
  it('contains corrupt or unavailable storage and never calls the bridge', async () => {
    for (const s of [storage({ [REVIEW_STATE_KEY]: '{broken' }), { getItem: () => { throw Error('Denied'); }, setItem: () => {} }, { getItem: () => null, setItem: () => { throw Error('Full'); } }]) {
      expect(complete(s)).toBe(false);
      const request = vi.fn(); await requestAnalysisReview(s, 'android', request); expect(request).not.toHaveBeenCalled();
    }
  });
});
