import { Capacitor } from '@capacitor/core';

/**
 * Ask Google Play for a rating after the second report a grower chooses to save:
 * a moment of completed work, never mid-reading, during onboarding, or on a paywall.
 * Technical trigger only. Never selected by plant health, score, or sentiment.
 */
type ReviewStorage = Pick<Storage, 'getItem' | 'setItem'>;
interface ReviewState { saves: number; requested: boolean }
export const REVIEW_STATE_KEY = 'android_saved_report_review_v2';
/** Builds up to 2.0 asked after the third completed analysis. */
export const LEGACY_REVIEW_STATE_KEY = 'android_analysis_review_v1';
export const REVIEW_SAVE_DELAY_MS = 1_500;
const REQUIRED_SAVES = 2;

function readState(storage: ReviewStorage): ReviewState {
  const raw = storage.getItem(REVIEW_STATE_KEY);
  if (raw) {
    const state = JSON.parse(raw) as ReviewState;
    if (!Number.isSafeInteger(state.saves) || state.saves < 0 || typeof state.requested !== 'boolean') {
      throw new Error('Invalid review state');
    }
    return state;
  }
  // Anyone an earlier build already asked is not asked again.
  const legacy = storage.getItem(LEGACY_REVIEW_STATE_KEY);
  const requested = legacy ? (JSON.parse(legacy) as { requested?: unknown }).requested === true : false;
  return { saves: 0, requested };
}

/** Count a saved report. Returns true when a review request is now due. */
export function noteSavedReport(storage?: ReviewStorage, platform = Capacitor.getPlatform()): boolean {
  if (platform !== 'android') return false;
  try {
    const store = storage ?? localStorage;
    const state = readState(store);
    state.saves = Math.min(REQUIRED_SAVES, state.saves + 1);
    store.setItem(REVIEW_STATE_KEY, JSON.stringify(state));
    return state.saves >= REQUIRED_SAVES && !state.requested;
  } catch {
    // Storage failure must never affect saving or cause repeated prompts.
    return false;
  }
}

export async function requestSavedReportReview(
  storage?: ReviewStorage,
  platform = Capacitor.getPlatform(),
  request = async () => {
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
  },
): Promise<boolean> {
  if (platform !== 'android') return false;
  try {
    const store = storage ?? localStorage;
    const state = readState(store);
    if (state.requested || state.saves < REQUIRED_SAVES) return false;
    // Claim before awaiting the native bridge: one attempt, including failures/quota suppression.
    store.setItem(REVIEW_STATE_KEY, JSON.stringify({ ...state, requested: true }));
    await request();
    // The API cannot tell us whether a dialog appeared or a review was submitted.
    return true;
  } catch {
    // Keep the saved report usable regardless of Play Store availability or review errors.
    return false;
  }
}
