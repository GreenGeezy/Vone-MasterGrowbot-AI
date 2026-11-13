import { describe, expect, it, vi } from 'vitest';
import { noteSavedReport, requestSavedReportReview, REVIEW_STATE_KEY, LEGACY_REVIEW_STATE_KEY } from './analysisReview';

function storage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const save = (s: ReturnType<typeof storage>) => noteSavedReport(s, 'android');

describe('Google Play review request after saved reports', () => {
  it('waits for the second saved report', () => {
    const s = storage();
    expect(save(s)).toBe(false);
    expect(save(s)).toBe(true);
  });
  it('never counts web or iOS use or invokes their review bridge', async () => {
    const s = storage(); const request = vi.fn();
    for (const platform of ['web', 'ios']) {
      expect(noteSavedReport(s, platform)).toBe(false);
      expect(await requestSavedReportReview(s, platform, request)).toBe(false);
    }
    expect(s.getItem(REVIEW_STATE_KEY)).toBeNull(); expect(request).not.toHaveBeenCalled();
  });
  it('requests once, including concurrent calls and later saves', async () => {
    const s = storage(); const request = vi.fn().mockResolvedValue(undefined);
    save(s);
    await requestSavedReportReview(s, 'android', request); expect(request).not.toHaveBeenCalled();
    save(s);
    await Promise.all([requestSavedReportReview(s, 'android', request), requestSavedReportReview(s, 'android', request)]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(save(s)).toBe(false);
  });
  it('retains eligibility when the user leaves before the request', () => {
    const s = storage(); save(s); expect(save(s)).toBe(true);
    expect(save(s)).toBe(true);
  });
  it('contains native failure and does not nag on the next save', async () => {
    const s = storage(); save(s); save(s);
    const request = vi.fn().mockRejectedValue(new Error('Play unavailable'));
    await expect(requestSavedReportReview(s, 'android', request)).resolves.toBe(false);
    expect(save(s)).toBe(false);
  });
  it('does not re-prompt users an earlier build already asked', () => {
    const asked = storage({ [LEGACY_REVIEW_STATE_KEY]: JSON.stringify({ successCount: 3, requested: true }) });
    save(asked); expect(save(asked)).toBe(false);
    const notAsked = storage({ [LEGACY_REVIEW_STATE_KEY]: JSON.stringify({ successCount: 1, requested: false }) });
    save(notAsked); expect(save(notAsked)).toBe(true);
  });
  it('contains corrupt or unavailable storage and never calls the bridge', async () => {
    for (const s of [storage({ [REVIEW_STATE_KEY]: '{broken' }), storage({ [LEGACY_REVIEW_STATE_KEY]: '{broken' }), { getItem: () => { throw Error('Denied'); }, setItem: () => {} }, { getItem: () => null, setItem: () => { throw Error('Full'); } }]) {
      expect(save(s)).toBe(false);
      const request = vi.fn(); await requestSavedReportReview(s, 'android', request); expect(request).not.toHaveBeenCalled();
    }
  });
});
