import { Capacitor } from '@capacitor/core';
import type { ExtendedDiagnosisResult } from './geminiService';

type ReviewStorage = Pick<Storage, 'getItem' | 'setItem'>;
interface ReviewState { successCount: number; requested: boolean }
export const REVIEW_STATE_KEY = 'android_analysis_review_v1';
export const REVIEW_READING_DELAY_MS = 15_000;
const REQUIRED_REPORTS = 3;

function readState(storage: ReviewStorage): ReviewState {
  const raw = storage.getItem(REVIEW_STATE_KEY);
  if (raw) {
    const state = JSON.parse(raw) as ReviewState;
    if (!Number.isSafeInteger(state.successCount) || state.successCount < 0 || typeof state.requested !== 'boolean') {
      throw new Error('Invalid review state');
    }
    return state;
  }
  const legacy = Number(storage.getItem('diagnosis_success_count') || '0');
  const successCount = Number.isSafeInteger(legacy) && legacy > 0 ? legacy : 0;
  // Earlier builds attempted a review on report three. Do not prompt those users again.
  return { successCount, requested: successCount >= REQUIRED_REPORTS };
}

export function recordSuccessfulAnalysis(
  report: ExtendedDiagnosisResult,
  storage?: ReviewStorage,
  platform = Capacitor.getPlatform(),
): boolean {
  if (platform !== 'android') return false;
  // Technical completion only: never select users by plant health, rating or sentiment.
  if (!report || typeof report.diagnosis !== 'string' || !report.diagnosis.trim()
    || report.diagnosis.trim().toLowerCase() === 'analysis inconclusive'
    || !Number.isFinite(report.healthScore) || typeof report.topAction !== 'string' || !report.topAction.trim()
    || !Array.isArray(report.fixSteps) || report.fixSteps.length === 0) return false;
  try {
    const store = storage ?? localStorage;
    const state = readState(store);
    state.successCount = Math.min(REQUIRED_REPORTS, state.successCount + 1);
    store.setItem(REVIEW_STATE_KEY, JSON.stringify(state));
    return state.successCount >= REQUIRED_REPORTS && !state.requested;
  } catch {
    // Storage failure must never affect analysis or cause repeated prompts.
    return false;
  }
}

export async function requestAnalysisReview(
  storage?: ReviewStorage,
  platform = Capacitor.getPlatform(),
  request = async () => {
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
  },
): Promise<void> {
  if (platform !== 'android') return;
  try {
    const store = storage ?? localStorage;
    const state = readState(store);
    if (state.requested || state.successCount < REQUIRED_REPORTS) return;
    // Claim before awaiting the native bridge: one attempt, including failures/quota suppression.
    store.setItem(REVIEW_STATE_KEY, JSON.stringify({ ...state, requested: true }));
    await request();
    // The API cannot tell us whether a dialog appeared or a review was submitted.
  } catch {
    // Keep the report usable regardless of Play Store availability or review errors.
  }
}
