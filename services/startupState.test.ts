import { describe, expect, it } from 'vitest';
import { OnboardingStep } from '../types';
import { LS_ONBOARDING_STATUS, LS_PROFILE, readLocalStartupState } from './startupState';

function storage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) };
}

describe('local startup recovery', () => {
  it('defaults to a usable splash screen', () => expect(readLocalStartupState(storage()).onboardingStatus).toBe(OnboardingStep.SPLASH));
  it('preserves a valid completed profile', () => {
    const state = readLocalStartupState(storage({ [LS_ONBOARDING_STATUS]: OnboardingStep.COMPLETED, [LS_PROFILE]: JSON.stringify({ experience: 'Novice' }) }));
    expect(state.onboardingStatus).toBe(OnboardingStep.COMPLETED);
    expect(state.recoveredCorruption).toBe(false);
  });
  it.each([
    [{ [LS_ONBOARDING_STATUS]: 'garbage' }],
    [{ [LS_ONBOARDING_STATUS]: OnboardingStep.COMPLETED }],
    [{ [LS_ONBOARDING_STATUS]: OnboardingStep.SUMMARY, [LS_PROFILE]: '{bad json' }],
    [{ [LS_ONBOARDING_STATUS]: OnboardingStep.COMPLETED, [LS_PROFILE]: '"not-a-profile"' }],
  ])('recovers corrupt or incomplete state to splash', seed => {
    const state = readLocalStartupState(storage(seed));
    expect(state.onboardingStatus).toBe(OnboardingStep.SPLASH);
    expect(state.recoveredCorruption).toBe(true);
  });
});
