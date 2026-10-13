import type { UserProfile } from '../types';

/** Experience changes the introduction, never the analysis or subscription terms. */
export function growerBenefits(profile?: Partial<UserProfile> | null) {
  if (profile?.onboardingIntent === 'learn') return {
    headline: 'Get to know your grow.',
    description: 'Explore strain references and keep what you learn in your journal.',
    photo: 'Check plant photos when you’re ready.',
    journal: 'Keep growing notes you can return to.',
    references: 'Explore the included strain reference library.',
    summary: 'Start with strain references. Keep notes as you learn, and try photo reports when you’re ready.',
    video: 'Review multiple views when you have a plant to check.',
  };
  if (profile?.onboardingIntent === 'explore') return {
    headline: 'Find your starting point.',
    description: 'Explore your grow tools and choose what helps you first.',
    photo: 'Review a plant photo when you’re ready.',
    journal: 'Keep your notes and photos together.',
    references: 'Browse strain references at your own pace.',
    summary: 'Explore your tools first. Start a journal, browse references, or check a plant photo when you’re ready.',
    video: 'Add multiple views when video suits your check-in.',
  };
  if (profile?.experience === 'Expert') return {
    headline: 'Your observations. One grow record.',
    description: 'Review photo reports alongside your notes and follow-ups.',
    photo: 'Review visible signs in your plant photos.',
    journal: 'Keep observations and saved reports together.',
    references: 'Consult strain references alongside your own records.',
    summary: 'Get straight to the tools. Keep your observations and reports in one place.',
    video: 'Review multiple angles in one video check-in.',
  };
  if (profile?.experience === 'Intermediate') return {
    headline: 'Make each check-in count.',
    description: 'Review plant photos and keep a record you can return to.',
    photo: 'Check visible changes with a photo report.',
    journal: 'Compare your notes and photos over time.',
    references: 'Find strain references for your next grow.',
    summary: 'Build on what you know. Save each check-in so you can revisit what changed.',
    video: 'Add more views when one photo is not enough.',
  };
  return {
    headline: 'Know what to check next.',
    description: 'Turn a plant photo into practical next checks. Keep your progress in one place.',
    photo: 'Review visible signs and suggested next checks.',
    journal: 'Save your first check-in and find it again.',
    references: 'Explore strain references as you learn.',
    summary: 'Start with one check-in. Explore the report at your pace and save it with your notes.',
    video: 'Show multiple views in one short video.',
  };
}
