import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';
import { createSessionInitializer } from './authSession';
import { UserProfile } from '../types';

// Initialize Supabase using the CONFIG we fixed in the previous step
export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // DISABLED: We handle this manually in App.tsx to avoid race conditions
    flowType: 'pkce',
  },
});

const IDENTITY_MARKER = 'mg_supabase_identity_exists';
const AUTH_STORAGE_KEY = `sb-${new URL(CONFIG.SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
// Preserve evidence of older installations before the SDK can clear an invalid token.
if (localStorage.getItem(AUTH_STORAGE_KEY)) localStorage.setItem(IDENTITY_MARKER, 'true');
export const initializeSupabaseSession = createSessionInitializer(supabase.auth, {
  exists: () => localStorage.getItem(IDENTITY_MARKER) === 'true',
  remember: () => localStorage.setItem(IDENTITY_MARKER, 'true'),
});

// DEPRECATED: OAuth is disabled for this app. Users use RevenueCat/Anonymous auth only.
/*
export const signInWithGoogle = async () => {
  // ... (Code removed to prevent usage) ...
  console.warn("Google Sign-In is disabled.");
  return null;
};
*/

// --- Helper Functions (Preserved exactly from your code) ---

export const getUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No user" };

  // FIX (Step 1): .maybeSingle() does NOT throw 406 when the anonymous user
  // has no profile row yet — it returns { data: null, error: null }.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { data: data as UserProfile | null, error };
};

/**
 * FIX (Step 1): Creates the profile row for the currently authenticated
 * anonymous user if one does not already exist. Safe to call repeatedly
 * (upsert on primary key). Call this immediately after signInAnonymously()
 * resolves so downstream reads always find a row.
 */
export const ensureProfileExists = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'No user' };

  // Do not combine ignoreDuplicates with a representation response: PostgREST
  // can correctly insert nothing for an existing row and then answer 406 when
  // asked to coerce that empty response into one object.
  const { error: insertError } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (insertError) {
    console.warn('ensureProfileExists: upsert error (non-fatal):', insertError);
    return { data: null, error: insertError };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) console.warn('ensureProfileExists: lookup error (non-fatal):', error);
  return { data, error };
};

export const updateOnboardingProfile = async (updates: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user logged in');

  const { error } = await supabase
    .from('profiles')
    .upsert({ ...Object.fromEntries(Object.entries(updates).filter(([key]) =>
      ['email', 'grow_experience', 'subscription_status', 'experience_level', 'grow_environment', 'primary_goal', 'grow_space_size'].includes(key)
    )), id: user.id });

  if (error) throw error;
};
