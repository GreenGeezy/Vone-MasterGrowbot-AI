/**
 * Frequency cap for the one contextual Premium suggestion (after a photo report).
 * Permanent entry points (Plant Health card, Strains) are navigation, not prompts.
 */
const KEY = 'mg_premium_prompt_v1';
const WEEK = 7 * 24 * 3600 * 1000;
type State = { reports: number; shownAt?: number; dismissedAt?: number };
type Store = Pick<Storage, 'getItem' | 'setItem'>;

function read(store: Store): State {
  try {
    const state = JSON.parse(store.getItem(KEY) || '{}');
    return { reports: Number.isSafeInteger(state.reports) ? state.reports : 0, shownAt: Number(state.shownAt) || undefined, dismissedAt: Number(state.dismissedAt) || undefined };
  } catch { return { reports: 0 }; }
}
function write(store: Store, state: State) { try { store.setItem(KEY, JSON.stringify(state)); } catch { /* Never block a report. */ } }

/** Count a completed photo report. The suggestion never appears on the first one. */
export function notePhotoReport(store: Store = localStorage) { const state = read(store); write(store, { ...state, reports: state.reports + 1 }); }

/** At most once a week, never on the first report, and quiet for 30 days after a dismissal. */
export function canSuggestPremium(severity: string | undefined, now = Date.now(), store: Store = localStorage): boolean {
  if (!severity || severity === 'low') return false;
  const state = read(store);
  if (state.reports < 2) return false;
  if (state.dismissedAt && now - state.dismissedAt < 30 * 24 * 3600 * 1000) return false;
  return !state.shownAt || now - state.shownAt >= WEEK;
}
export function markPremiumSuggested(now = Date.now(), store: Store = localStorage) { write(store, { ...read(store), shownAt: now }); }
export function dismissPremiumSuggestion(now = Date.now(), store: Store = localStorage) { write(store, { ...read(store), dismissedAt: now }); }
