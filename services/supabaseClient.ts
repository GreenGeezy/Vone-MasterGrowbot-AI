import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { CONFIG } from './config';
import { UserProfile } from '../types';

// Check for missing credentials to warn the developer
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing. Auth and Database features will be limited.");
}

// Initialize Supabase Client
export const supabase = (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) 
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  : null;

/**
 * Handle Google Sign-In (Works on Web & Mobile)
 */
export const signInWithGoogle = async () => {
  if (!supabase) return { data: null, error: new Error("Supabase missing") };

  const redirectUrl = Capacitor.isNativePlatform() 
    ? 'com.mastergrowbot.app://login-callback' 
    : window.location.origin;

  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
};

/**
 * Fetch the current user's profile with strict typing
 */
export const getUserProfile = async () => {
  if (!supabase) return { data: null, error: { message: "Supabase not initialized" } };
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "No active user" } };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // FIXED: Explicitly cast data to UserProfile to prevent build errors
  return { data: data as UserProfile | null, error };
};

/**
 * Update the user's profile during onboarding
 */
export const updateOnboardingProfile = async (updates: Partial<UserProfile>) => {
  if (!supabase) return { data: null, error: new Error("Supabase missing") };
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("No user") };

  return await supabase
    .from('profiles')
    .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single();
};
