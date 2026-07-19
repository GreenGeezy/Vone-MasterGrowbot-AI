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
  let session = null;
  try {
    session = (await withTimeout(
      supabaseInit.auth.getSession(),
      3000,
      '[AppInitializer] getSession'
    )).data?.session;
  } catch (error) {
    console.warn('[AppInitializer] getSession did not finish before startup timeout:', error);
  }
  let user = session?.user || null;

  if (!session || !user) {
    try {
      const { data, error } = await withTimeout(
        supabaseInit.auth.signInAnonymously(),
        5000,
        '[AppInitializer] anonymous sign-in'
      );
      if (error || !data?.session?.user) {
        console.error('[AppInitializer] Anonymous sign-in failed:', error);
        return { user: null, session: null, profile: null, isReady: false, isReturningSubscriber: false };
      }
      session = data.session;
      user = data.user;
    } catch (error) {
      console.warn('[AppInitializer] Anonymous sign-in did not finish before startup timeout:', error);
      return { user: null, session: null, profile: null, isReady: false, isReturningSubscriber: false };
    }
  }

  if (!user?.id) {
    return { user: null, session: null, profile: null, isReady: false, isReturningSubscriber: false };
  }

  let profile = null;
  try {
    const { data: profileData, error: profileError } = await withTimeout<any>(
      supabaseInit
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),
      4000,
      '[AppInitializer] profile fetch'
    );

    if (profileError) console.warn('[AppInitializer] Profile fetch failed:', profileError);

    profile = profileData;

    if (!profile) {
      const { data: inserted, error: insertError } = await withTimeout<any>(
        supabaseInit
          .from('profiles')
          .upsert({ id: user.id }, { onConflict: 'id' })
          .select()
          .maybeSingle(),
        4000,
        '[AppInitializer] profile upsert'
      );

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
      await withTimeout(
        Purchases.configure({ apiKey: ANDROID_REVENUECAT_KEY, appUserID: stableAppUserID }),
        5000,
        '[AppInitializer] RevenueCat configure'
      );
      const { customerInfo } = await withTimeout(
        Purchases.getCustomerInfo(),
        5000,
        '[AppInitializer] RevenueCat customer info'
      );

      isReturningSubscriber =
        !!customerInfo?.entitlements?.active?.pro ||
        (customerInfo?.activeSubscriptions?.length || 0) > 0;
    } catch (error) {
      console.warn('[AppInitializer] RevenueCat check failed:', error);
    }
  } else if (localStorage.getItem('mastergrowbot_profile')) {
    isReturningSubscriber = true;
  }

  return { user, session, profile, isReady: true, isReturningSubscriber };
}
