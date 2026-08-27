import { Capacitor } from '@capacitor/core';
import { ensureProfileForCurrentUser, initializeSupabaseAuth } from './supabaseClient';
import { getStartupSubscriptionStatus } from './revenueCatService';

export interface AppInitState {
  user: any | null; session: any | null; profile: any | null; isReady: boolean;
  isReturningSubscriber: boolean; authError: unknown | null;
}
let appInitializationPromise: Promise<AppInitState> | null = null;

export async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try { return await Promise.race([promise, timeoutPromise]); }
  finally { if (timeoutId) clearTimeout(timeoutId); }
}

async function runInitialization(): Promise<AppInitState> {
  const authPromise = withTimeout(initializeSupabaseAuth(), 8000, '[AppInitializer] Supabase auth')
    .catch(error => ({ session: null, user: null, error }));
  const revenueCatPromise = Capacitor.getPlatform() === 'android'
    ? withTimeout(getStartupSubscriptionStatus(), 8000, '[AppInitializer] RevenueCat').catch(() => ({ isSubscribed: false, customerInfo: null }))
    : Promise.resolve({ isSubscribed: false, customerInfo: null });
  const [auth, subscription] = await Promise.all([authPromise, revenueCatPromise]);
  let profile = null;
  if (auth.user?.id) {
    const ensured = await withTimeout(ensureProfileForCurrentUser(), 5000, '[AppInitializer] profile')
      .catch(error => ({ ok: false, profile: null, user: auth.user, error }));
    profile = ensured.profile;
    if (ensured.ok) void import('./dbService').then(module => module.reconcilePendingPersistence()).catch(() => undefined);
  }
  return { user: auth.user, session: auth.session, profile, isReady: true, isReturningSubscriber: subscription.isSubscribed, authError: auth.error };
}

/** StrictMode and every startup caller share this one bounded initialization. */
export function initializeApp(): Promise<AppInitState> {
  if (!appInitializationPromise) appInitializationPromise = runInitialization();
  return appInitializationPromise;
}
