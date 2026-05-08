import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';
import { Capacitor } from '@capacitor/core';

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

/**
 * Get or create a STABLE anonymous ID for RevenueCat.
 * This ID persists across app restarts and anonymous auth refreshes.
 * CRITICAL: RevenueCat appUserID must NEVER change once set,
 * otherwise purchases become orphaned.
 */
function getStableAnonymousId(): string {
  const STORAGE_KEY = 'mg_rc_stable_id';
  let stableId = localStorage.getItem(STORAGE_KEY);
  if (!stableId) {
    stableId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, stableId);
    console.log('[AppInitializer] Generated new stable anonymous ID:', stableId);
  } else {
    console.log('[AppInitializer] Using existing stable anonymous ID:', stableId);
  }
  return stableId;
}

/**
 * Global App Initializer
 *
 * RULES:
 * - NO API call may run before auth is complete
 * - NO database query may assume a row exists
 * - Waits for anonymous auth, ensures profile row, THEN initializes RevenueCat
 * - RevenueCat appUserID is STABLE and never changes (stored in localStorage)
 */
export async function initializeApp(): Promise<AppInitState> {
  console.log('[AppInitializer] Starting initialization...');

  // 1. Await existing session
  let session = (await supabaseInit.auth.getSession()).data?.session;
  let user = session?.user || null;

  // 2. If no session, sign in anonymously
  if (!session || !user) {
    console.log('[AppInitializer] No session found. Signing in anonymously...');
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

  console.log('[AppInitializer] Supabase user authenticated:', user.id);

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
      console.log('[AppInitializer] Profile missing. Creating row...');
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
        console.log('[AppInitializer] Profile created successfully');
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
        const stableAppUserId = getStableAnonymousId();

        await Purchases.configure({ apiKey, appUserID: stableAppUserId });
        console.log('[AppInitializer] RevenueCat configured with STABLE appUserID:', stableAppUserId);
        console.log('[AppInitializer] Supabase user.id (for DB only):', user.id);

        // Check subscription status — check for ANY active entitlement OR subscription
        const { customerInfo } = await Purchases.getCustomerInfo();
        console.log('[AppInitializer] RC customerInfo:', JSON.stringify(customerInfo, null, 2));
        console.log('[AppInitializer] RC active entitlements keys:', Object.keys(customerInfo?.entitlements?.active || {}));
        console.log('[AppInitializer] RC active subscriptions:', customerInfo?.activeSubscriptions);
        console.log('[AppInitializer] RC all purchased products:', customerInfo?.allPurchasedProductIdentifiers);
        console.log('[AppInitializer] RC originalAppUserId:', customerInfo?.originalAppUserId);
        console.log('[AppInitializer] RC firstSeen:', customerInfo?.firstSeen);
        console.log('[AppInitializer] RC originalPurchaseDate:', customerInfo?.originalPurchaseDate);

        const hasActiveEntitlements = Object.keys(customerInfo?.entitlements?.active || {}).length > 0;
        const hasActiveSubscriptions = (customerInfo?.activeSubscriptions?.length || 0) > 0;
        const hasPurchasedProducts = (customerInfo?.allPurchasedProductIdentifiers?.length || 0) > 0;

        if (hasActiveEntitlements || hasActiveSubscriptions || hasPurchasedProducts) {
          isReturningSubscriber = true;
          console.log('[AppInitializer] Returning subscriber detected. Entitlements:', hasActiveEntitlements, 'Subscriptions:', hasActiveSubscriptions, 'Products:', hasPurchasedProducts);
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

  console.log('[AppInitializer] Initialization complete. isReturningSubscriber:', isReturningSubscriber);

  return {
    user,
    session,
    profile,
    isReady: true,
    isReturningSubscriber,
  };
}
