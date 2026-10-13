import type { UserProfile } from '../types';
export const ONBOARDING_KEY = 'mg_onboarding_v2';
export type OnboardingDraft = { version: 2; step: number; profile: Partial<UserProfile>; completed: boolean };
export function readOnboarding(): OnboardingDraft {
  try {
    const d = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || 'null');
    if (d?.version === 2 && Number.isInteger(d.step) && d.step >= 0 && d.step <= 5) return { ...d, profile: d.profile || {}, completed: d.completed === true };
  } catch { /* Corrupt preferences never prevent opening the introduction. */ }
  return { version: 2, step: 0, profile: {}, completed: false };
}
export function writeOnboarding(draft: OnboardingDraft) {
  try { localStorage.setItem(ONBOARDING_KEY, JSON.stringify(draft)); } catch { /* Session state remains usable. */ }
}
export function completeOnboarding() { writeOnboarding({ ...readOnboarding(), completed: true }); }
export function onboardingVariant(enabled:boolean):'control'|'treatment' {
  if(!enabled)return 'treatment';
  const key='mg_onboarding_variant_v2';
  try {const saved=localStorage.getItem(key);if(saved==='control'||saved==='treatment')return saved;
    const variant=crypto.getRandomValues(new Uint32Array(1))[0]%2===0?'control':'treatment';localStorage.setItem(key,variant);return variant;
  } catch{return 'treatment';}
}
export function initialDestination(p: Partial<UserProfile> | null) {
  return p?.onboardingIntent === 'journal' ? 'JOURNAL'
    : p?.onboardingIntent === 'references' || p?.onboardingIntent === 'learn' ? 'STRAINS'
    : p?.onboardingIntent === 'explore' ? 'HOME' : 'DIAGNOSE';
}

export function firstActionDetails(p?: Partial<UserProfile> | null) {
  if (p?.onboardingIntent === 'learn') return { title: 'Explore strain references', hint: 'Start with strain references. Save notes as you learn.' };
  if (p?.onboardingIntent === 'explore') return { title: 'Explore your grow tools', hint: 'Explore your tools. Start a journal or check a photo when you’re ready.' };
  if (p?.onboardingIntent === 'references') return { title: 'The strain reference library', hint: 'Start with strain references. Your tools are ready.' };
  if (p?.onboardingIntent === 'journal') return { title: 'Your first journal entry', hint: 'Start with a journal entry. Keep your notes and photos together.' };
  return { title: 'Your first photo check-in', hint: 'Start with your first photo check-in. Your tools are ready.' };
}

/** Unknown answers remain explicit preferences; analysis uses a safe existing level. */
export function answerOnboarding(profile: Partial<UserProfile>, key: string, value: string): Partial<UserProfile> {
  if (key === 'onboardingGoal') {
    const destinations = { skills: 'learn', health: 'photo', size: 'journal', quality: 'journal', organize: 'journal', explore: 'explore' } as const;
    if (value in destinations) return { ...profile, onboardingGoal: value as UserProfile['onboardingGoal'], onboardingIntent: destinations[value as keyof typeof destinations] };
  }
  if (key === 'experience') {
    if (value === 'not_sure') return { ...profile, experience: 'Novice', experienceUndecided: true };
    if (['Novice', 'Intermediate', 'Expert'].includes(value)) return { ...profile, experience: value as UserProfile['experience'], experienceUndecided: false };
  }
  if (key === 'grow_mode') {
    if (value === 'not_started' || value === 'not_sure') return { ...profile, grow_mode: undefined, notStartedYet: value === 'not_started', growSetupUndecided: value === 'not_sure' };
    if (['Indoor', 'Outdoor', 'Greenhouse'].includes(value)) return { ...profile, grow_mode: value as UserProfile['grow_mode'], notStartedYet: false, growSetupUndecided: false };
  }
  if (key === 'onboardingIntent' && ['photo', 'journal', 'references', 'learn', 'explore'].includes(value)) return { ...profile, onboardingIntent: value as UserProfile['onboardingIntent'] };
  return profile;
}

export function goalDetails(p: Partial<UserProfile>) {
  const details = {
    skills: { title: 'Get better at growing', description: 'Learn your plants, one grow at a time. Explore strain references and keep notes on what works for your setup.' },
    health: { title: 'Keep your plants healthy', description: 'Got yellow leaves or something that looks off? Start with a photo report, check the suggested next steps, and keep a record.' },
    size: { title: 'Grow bigger plants', description: 'Keep an eye on growth and care as your plants develop. Start a journal, add photos, and track what changes in your setup.' },
    quality: { title: 'Improve your grow’s quality', description: 'Make your observations easier to act on. Keep photos, notes, and follow-ups together so you can revisit what changed.' },
    organize: { title: 'Keep track of your grow', description: 'Keep your grow in one place. Save photos, notes, and reports so you can pick up where you left off.' },
    explore: { title: 'Find your growing goal', description: 'You don’t need all the answers yet. Explore the tools and choose your first step when you’re ready.' },
  };
  return p.onboardingGoal ? details[p.onboardingGoal] : null;
}
