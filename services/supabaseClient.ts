import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
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

  // Insert with ignoreDuplicates: safe if the row already exists.
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) console.warn('ensureProfileExists: upsert error (non-fatal):', error);
  return { data, error };
};

export const updateOnboardingProfile = async (updates: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user logged in');

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() });

  if (error) throw error;
};
