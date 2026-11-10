import { Capacitor } from '@capacitor/core';
import { recordEvent } from './premiumLibrary';

/**
 * Ask for an App Store rating after the second report a grower chooses to save:
 * a moment of completed work, never mid-reading, onboarding, or a paywall.
 * Technical trigger only. Never selected by plant health, score, or sentiment.
 */
export const REVIEW_KEY = 'mg_ios_review_v2';
const REQUIRED_SAVES = 2;
type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function noteSavedReport(store: Store = localStorage): boolean {
  try {
    const state = JSON.parse(store.getItem(REVIEW_KEY) || '{}');
    const saves = Math.min(REQUIRED_SAVES, (Number.isSafeInteger(state.saves) ? state.saves : 0) + 1);
    store.setItem(REVIEW_KEY, JSON.stringify({ saves, requested: state.requested === true }));
    return saves >= REQUIRED_SAVES && state.requested !== true;
  } catch { return false; }
}

export async function requestSavedReportReview(store: Store = localStorage, platform = Capacitor.getPlatform()): Promise<void> {
  if (platform !== 'ios') return;
  try {
    const state = JSON.parse(store.getItem(REVIEW_KEY) || '{}');
    if (state.requested === true || !(state.saves >= REQUIRED_SAVES)) return;
    // Claim first: one attempt per install, even if Apple suppresses the sheet.
    store.setItem(REVIEW_KEY, JSON.stringify({ ...state, requested: true }));
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
    recordEvent('review_prompt_requested', 'journal');
  } catch { /* The saved report stays usable whatever the store does. */ }
}
