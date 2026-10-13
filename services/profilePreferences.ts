import type { UserProfile } from '../types';

const PERSONAL_FIELDS = ['avatarUri', 'name', 'experience', 'grow_mode', 'goal', 'space', 'hasSeenTutorial', 'onboardingIntent', 'onboardingGoal', 'notStartedYet', 'experienceUndecided', 'growSetupUndecided'] as const;

/** Cloud authentication data remains authoritative; device-edited preferences survive refresh. */
export function mergeProfilePreferences(cloud: Partial<UserProfile> | null, local: Partial<UserProfile> | null): Partial<UserProfile> {
  const merged = { ...cloud };
  for (const field of PERSONAL_FIELDS) {
    if (local?.[field] !== undefined) Object.assign(merged, { [field]: local[field] });
  }
  if (local?.notStartedYet || local?.growSetupUndecided) delete merged.grow_mode;
  return merged;
}

export function cachedProfile(): Partial<UserProfile> | null {
  try { return JSON.parse(localStorage.getItem('mastergrowbot_profile') || 'null'); }
  catch { return null; }
}
