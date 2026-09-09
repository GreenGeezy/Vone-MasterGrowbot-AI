import { supabase, ensureProfileExists, initializeSupabaseSession } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { getStableRevenueCatId, recoverPendingRevenueCatBinding } from './revenueCatIdentity';

export interface AppInitState {
  user: any | null;
  session: any | null;
  profile: any | null;
  isReady: boolean;
  isReturningSubscriber: boolean;
}

export async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Get or create a STABLE anonymous ID for RevenueCat.
 * This ID persists across app restarts and anonymous auth refreshes.
 * Uses Capacitor Preferences for iOS-safe native storage.
 * Keep legacy Pro/lifetime identity until an explicit Premium purchase or restore
 * binds RevenueCat to the authenticated Supabase user.
 */
/**
 * Global App Initializer
 *
 * RULES:
 * - NO API call may run before auth is complete
 * - NO database query may assume a row exists
 * - Cloud initialization and RevenueCat verification run independently
 * - RevenueCat identity persists in Preferences, including pending Premium verification
 */
let initialization: Promise<AppInitState> | null = null;
let subscriptions: Promise<boolean> | null = null;

export function initializeSubscriptions(): Promise<boolean> {
  if (!subscriptions) {
    subscriptions = checkSubscriptions().finally(() => { subscriptions = null; });
  }
  return subscriptions;
}

async function checkSubscriptions(): Promise<boolean> {
  // 6. Initialize RevenueCat with STABLE anonymous ID
  let isReturningSubscriber = false;
  if (Capacitor.isNativePlatform()) {
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const platform = Capacitor.getPlatform();
      const apiKey = platform === 'ios'
        ? import.meta.env.VITE_REVENUECAT_IOS_KEY
        : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

      if (apiKey) {
        // Use STABLE ID — never changes, even if Supabase anonymous user changes
        const stableAppUserId = await withTimeout(getStableRevenueCatId(), 3000, 'Subscription identity');

        const { isConfigured } = await withTimeout(Purchases.isConfigured(), 3000, "Subscription configuration check");
        if (!isConfigured) await withTimeout(
          Purchases.configure({ apiKey, appUserID: stableAppUserId }),
          5000,
          '[AppInitializer] RevenueCat configure'
        );

        // Check active access only; expired purchase history must not unlock the app.
        const { customerInfo: fetchedCustomerInfo } = await withTimeout(
          Purchases.getCustomerInfo(),
          5000,
          '[AppInitializer] RevenueCat customer info'
        );
        const customerInfo = await withTimeout(
          recoverPendingRevenueCatBinding(Purchases, fetchedCustomerInfo),
          5000,
          '[AppInitializer] Subscription identity recovery'
        );
        const hasActiveProEntitlement = Boolean(customerInfo?.entitlements?.active?.pro);
        const hasActiveSubscriptions = (customerInfo?.activeSubscriptions || []).some(id => ["weekly_pro_v2", "monthly_pro_v2", "yearly_pro_v2", "mastergrowbot_pro_weekly_v3", "mastergrowbot_pro_yearly_v3", "com.mastergrowbot.ai.sub.weekly", "com.mastergrowbot.ai.sub.monthly"].includes(id));

        if (hasActiveProEntitlement || hasActiveSubscriptions) {
          isReturningSubscriber = true;
        }
      } else {
        console.warn('[AppInitializer] RevenueCat API key missing for platform:', platform);
      }
    } catch (e) {
      console.warn('[AppInitializer] RevenueCat initialization failed:', e);
    }
  } else {
    // Web/dev mode: check localStorage for returning user
    const savedProfile = localStorage.getItem('mastergrowbot_profile');
    if (savedProfile) {
      isReturningSubscriber = true;
    }
  }

  return isReturningSubscriber;
}

export function initializeApp(): Promise<AppInitState> {
  if (!initialization) initialization = runInitialization().finally(() => { initialization = null; });
  return initialization;
}

async function runInitialization(): Promise<AppInitState> {
  // Native paid access must remain independent of network/database availability.
  const paidAccess = initializeSubscriptions();
  let session = null;
  let profile = null;
  try {
    // Timeout only the caller; the single-flight auth operation remains shared.
    session = await withTimeout(initializeSupabaseSession(), 8000, 'Session initialization');
    const existing = await withTimeout(
      supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
      4000, 'Profile lookup'
    );
    if (existing.error) throw existing.error;
    profile = existing.data;
    if (!profile) {
      const created = await withTimeout(ensureProfileExists(), 4000, 'Profile initialization');
      if (created.error) throw created.error;
      profile = created.data;
    }
  } catch {
    console.warn('[AppInitializer] Cloud session/profile unavailable; retaining local identity and data');
  }
  return { user: session?.user || null, session, profile, isReady: true, isReturningSubscriber: await paidAccess };
}
