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

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { data: data as UserProfile, error };
};

export const updateOnboardingProfile = async (updates: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user logged in');

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...updates, updated_at: new Date() });

  if (error) throw error;
};
