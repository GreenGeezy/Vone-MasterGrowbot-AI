import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { CONFIG } from './config';

const supabaseInit = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
const ANDROID_REVENUECAT_KEY = 'goog_kqOynvNRCABzUPrpfyFvlMvHUna';

async function getStableAnonymousId(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: STABLE_ID_KEY });
    if (value) return value;
    const stableId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await Preferences.set({ key: STABLE_ID_KEY, value: stableId });
    return stableId;
  }

  const existing = localStorage.getItem(STABLE_ID_KEY);
  if (existing) return existing;
  const stableId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(STABLE_ID_KEY, stableId);
  return stableId;
}

export async function initializeApp(): Promise<AppInitState> {
  let session = (await supabaseInit.auth.getSession()).data?.session;
  let user = session?.user || null;

  if (!session || !user) {
    const { data, error } = await supabaseInit.auth.signInAnonymously();
    if (error || !data?.session?.user) {
      console.error('[AppInitializer] Anonymous sign-in failed:', error);
      return { user: null, session: null, profile: null, isReady: false, isReturningSubscriber: false };
    }
    session = data.session;
    user = data.user;
  }

  if (!user?.id) {
    return { user: null, session: null, profile: null, isReady: false, isReturningSubscriber: false };
  }

  let profile = null;
  try {
    const { data: profileData } = await supabaseInit
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    profile = profileData;

    if (!profile) {
      const { data: inserted, error: insertError } = await supabaseInit
        .from('profiles')
        .upsert({ id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (insertError) console.warn('[AppInitializer] Profile upsert failed:', insertError);
      profile = inserted;
    }
  } catch (error) {
    console.warn('[AppInitializer] Profile check failed:', error);
  }

  let isReturningSubscriber = false;
  if (Capacitor.getPlatform() === 'android') {
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const stableAppUserID = await getStableAnonymousId();
      await Purchases.configure({ apiKey: ANDROID_REVENUECAT_KEY, appUserID: stableAppUserID });
      const { customerInfo } = await Purchases.getCustomerInfo();

      isReturningSubscriber =
        Object.keys(customerInfo?.entitlements?.active || {}).length > 0 ||
        (customerInfo?.activeSubscriptions?.length || 0) > 0 ||
        (customerInfo?.allPurchasedProductIdentifiers?.length || 0) > 0;
    } catch (error) {
      console.warn('[AppInitializer] RevenueCat check failed:', error);
    }
  } else if (localStorage.getItem('mastergrowbot_profile')) {
    isReturningSubscriber = true;
  }

  return { user, session, profile, isReady: true, isReturningSubscriber };
}
