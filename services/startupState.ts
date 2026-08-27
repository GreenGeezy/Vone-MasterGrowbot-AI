import { OnboardingStep, type UserProfile } from '../types';

export const LS_ONBOARDING_STATUS = 'mg_onboarding_status';
export const LS_PROFILE = 'mastergrowbot_profile';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalStartupState {
  onboardingStatus: OnboardingStep;
  profile: UserProfile | null;
  recoveredCorruption: boolean;
}

export function readLocalStartupState(storage: StorageLike): LocalStartupState {
  const rawStatus = storage.getItem(LS_ONBOARDING_STATUS);
  const rawProfile = storage.getItem(LS_PROFILE);
  let profile: UserProfile | null = null;
  let recoveredCorruption = false;

  if (rawProfile) {
    try {
      const parsed = JSON.parse(rawProfile);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid profile shape');
      profile = parsed as UserProfile;
    } catch {
      storage.removeItem(LS_PROFILE);
      recoveredCorruption = true;
    }
  }

  const isValidStatus = rawStatus && Object.values(OnboardingStep).includes(rawStatus as OnboardingStep);
  let onboardingStatus = isValidStatus ? rawStatus as OnboardingStep : OnboardingStep.SPLASH;
  if (rawStatus && !isValidStatus) recoveredCorruption = true;
  if ((onboardingStatus === OnboardingStep.SUMMARY || onboardingStatus === OnboardingStep.COMPLETED) && !profile) {
    onboardingStatus = OnboardingStep.SPLASH;
    recoveredCorruption = true;
  }
  if (recoveredCorruption) storage.setItem(LS_ONBOARDING_STATUS, OnboardingStep.SPLASH);
  return { onboardingStatus, profile, recoveredCorruption };
}
