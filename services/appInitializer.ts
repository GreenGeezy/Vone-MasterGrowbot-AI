import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Re-create a dedicated client for initialization to avoid circular deps
const supabaseInit = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export interface AppInitState {
  user: any | null;
  session: any | null;
  profile: any | null;
  isReady: boolean;
  isReturningSubscriber: boolean;
}

const STABLE_ID_KEY = 'mg_rc_stable_id';

/**
 * Get or create a STABLE anonymous ID for RevenueCat.
 * This ID persists across app restarts and anonymous auth refreshes.
 * Uses Capacitor Preferences for iOS-safe native storage.
 * CRITICAL: RevenueCat appUserID must NEVER change once set,
 * otherwise purchases become orphaned.
 */
async function getStableAnonymousId(): Promise<string> {
  const { value } = await Preferences.get({ key: STABLE_ID_KEY });
  if (value) {
    return value;
  }
  const stableId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await Preferences.set({ key: STABLE_ID_KEY, value: stableId });
  return stableId;
}

/**
 * Global App Initializer
 *
 * RULES:
 * - NO API call may run before auth is complete
 * - NO database query may assume a row exists
 * - Waits for anonymous auth, ensures profile row, THEN initializes RevenueCat
 * - RevenueCat appUserID is STABLE and never changes (stored in Capacitor Preferences)
 */
export async function initializeApp(): Promise<AppInitState> {
  // 1. Await existing session
  let session = (await supabaseInit.auth.getSession()).data?.session;
  let user = session?.user || null;

  // 2. If no session, sign in anonymously
  if (!session || !user) {
    try {
      const { data: authData, error: authError } = await supabaseInit.auth.signInAnonymously();
      if (authError) {
        console.error('[AppInitializer] Anonymous sign-in failed:', authError);
        return { user: null, session: null, profile: null, isReady: false, isReturningSubscriber: false };
      }
      session = authData?.session;
      user = authData?.user;
    } catch (e) {
      console.error('[AppInitializer] Unexpected auth error:', e);
      return { user: null, session: null, profile: null, isReady: false, isReturningSubscriber: false };
    }
  }

  // 3. GUARD: Ensure user.id exists
  if (!user?.id) {
    console.error('[AppInitializer] Auth resolved but user.id is missing');
    return { user: null, session: null, profile: null, isReady: false, isReturningSubscriber: false };
  }

  // 4. Fetch or create profile using maybeSingle()
  let profile = null;
  try {
    const { data: profileData, error: profileError } = await supabaseInit
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('[AppInitializer] Profile fetch error:', profileError);
    }

    profile = profileData;

    // 5. If profile is null, INSERT a new row
    if (!profile) {
      const newProfile = {
        id: user.id,
        created_at: new Date().toISOString(),
      };
      const { data: inserted, error: insertError } = await supabaseInit
        .from('profiles')
        .insert(newProfile)
        .select()
        .maybeSingle();

      if (insertError) {
        console.warn('[AppInitializer] Profile insert error:', insertError);
      } else {
        profile = inserted;
      }
    }
  } catch (e) {
    console.error('[AppInitializer] Profile operation failed:', e);
  }

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
        const stableAppUserId = await getStableAnonymousId();

        await Purchases.configure({ apiKey, appUserID: stableAppUserId });

        // Check active access only; expired purchase history must not unlock the app.
        const { customerInfo } = await Purchases.getCustomerInfo();
        const hasActiveProEntitlement = Boolean(customerInfo?.entitlements?.active?.pro);
        const hasActiveSubscriptions = (customerInfo?.activeSubscriptions?.length || 0) > 0;

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

  return {
    user,
    session,
    profile,
    isReady: true,
    isReturningSubscriber,
  };
}
