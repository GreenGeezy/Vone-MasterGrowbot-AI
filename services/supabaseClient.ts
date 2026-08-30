import { createClient, type Session, type User } from '@supabase/supabase-js';
import { CONFIG } from './config';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { UserProfile } from '../types';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof localStorage === 'undefined' ? undefined : localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export interface AuthInitializationResult {
  session: Session | null;
  user: User | null;
  error: unknown | null;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function createAuthInitializer(auth: Pick<typeof supabase.auth, 'getSession' | 'signInAnonymously'>, retryDelayMs = 250) {
  let initializationPromise: Promise<AuthInitializationResult> | null = null;

  const readCanonicalSession = async (): Promise<AuthInitializationResult> => {
    const first = await auth.getSession();
    if (first.data.session) return { session: first.data.session, user: first.data.session.user, error: null };

    if (first.error) {
      await delay(retryDelayMs);
      const reread = await auth.getSession();
      if (reread.data.session) return { session: reread.data.session, user: reread.data.session.user, error: null };
      return { session: null, user: null, error: reread.error || first.error };
    }

    const anonymous = await auth.signInAnonymously();
    if (anonymous.error || !anonymous.data.session?.user) {
      return { session: null, user: null, error: anonymous.error || new Error('Anonymous sign-in returned no session') };
    }
    return { session: anonymous.data.session, user: anonymous.data.user, error: null };
  };

  return (): Promise<AuthInitializationResult> => {
    if (!initializationPromise) {
      initializationPromise = readCanonicalSession().then(result => {
        if (!result.session) initializationPromise = null;
        return result;
      }, error => {
        initializationPromise = null;
        return { session: null, user: null, error };
      });
    }
    return initializationPromise;
  };
}

/** All callers share one startup promise and one persisted Supabase client. */
export const initializeSupabaseAuth = createAuthInitializer(supabase.auth);

export interface EnsureProfileResult {
  ok: boolean;
  profile: Record<string, unknown> | null;
  user: User | null;
  error: unknown | null;
}

export function createProfileEnsurer(
  work: (user: User) => Promise<EnsureProfileResult>,
) {
  const inFlight = new Map<string, Promise<EnsureProfileResult>>();
  return (user: User): Promise<EnsureProfileResult> => {
    const existing = inFlight.get(user.id);
    if (existing) return existing;
    const attempt = work(user).finally(() => {
      if (inFlight.get(user.id) === attempt) inFlight.delete(user.id);
    });
    inFlight.set(user.id, attempt);
    return attempt;
  };
}

const ensureProfileRow = createProfileEnsurer(async (user: User): Promise<EnsureProfileResult> => {
  const existing = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (existing.data) return { ok: true, profile: existing.data, user, error: null };
  if (existing.error) return { ok: false, profile: null, user, error: existing.error };

  const inserted = await supabase.from('profiles').insert({ id: user.id }).select('*').maybeSingle();
  if (inserted.data) return { ok: true, profile: inserted.data, user, error: null };
  // Keep the cross-process recovery path. Same-process callers no longer race,
  // but another process or an older installed client may still create the row.
  if (inserted.error?.code === '23505') {
    const concurrent = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (concurrent.data) return { ok: true, profile: concurrent.data, user, error: null };
    return { ok: false, profile: null, user, error: concurrent.error || inserted.error };
  }
  return { ok: false, profile: null, user, error: inserted.error || new Error('Profile insert returned no row') };
});

export async function ensureProfileForCurrentUser(): Promise<EnsureProfileResult> {
  const auth = await initializeSupabaseAuth();
  if (!auth.user?.id) return { ok: false, profile: null, user: null, error: auth.error || new Error('No authenticated user') };
  return ensureProfileRow(auth.user);
}

export const signInWithGoogle = async () => {
  const isMobile = Capacitor.isNativePlatform();
  const redirectUrl = isMobile
    ? 'com.mastergrowbot.app://login-callback'
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? window.location.origin
      : 'https://vofwdhlwsahwxecewyek.supabase.co/auth/v1/callback';
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl, skipBrowserRedirect: true } });
  if (error) throw error;
  if (data?.url) {
    if (isMobile) await Browser.open({ url: data.url, windowName: '_self', presentationStyle: 'popover' });
    else window.location.href = data.url;
  }
  return data;
};

export const getUserProfile = async () => {
  const ensured = await ensureProfileForCurrentUser();
  return { data: ensured.profile as unknown as UserProfile | null, error: ensured.error };
};

const PROFILE_COLUMN_MAP: Record<string, string> = {
  grow_experience: 'grow_experience', experience: 'experience_level', experience_level: 'experience_level',
  grow_mode: 'grow_environment', grow_environment: 'grow_environment', goal: 'primary_goal',
  primary_goal: 'primary_goal', space: 'grow_space_size', grow_space_size: 'grow_space_size',
  subscription_status: 'subscription_status',
};

export const updateOnboardingProfile = async (updates: Record<string, unknown>) => {
  const ensured = await ensureProfileForCurrentUser();
  if (!ensured.ok || !ensured.user) throw ensured.error || new Error('Required profile is unavailable');
  const payload = Object.entries(updates).reduce<Record<string, unknown>>((safe, [key, value]) => {
    const column = PROFILE_COLUMN_MAP[key];
    if (column && value !== undefined) safe[column] = value;
    return safe;
  }, {});
  if (!Object.keys(payload).length) return ensured.profile;
  const result = await supabase.from('profiles').update(payload).eq('id', ensured.user.id).select('*').single();
  if (result.error) throw result.error;
  return result.data;
};
