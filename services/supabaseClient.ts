
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

// Environment variables are injected via Vite's 'define' block (with fallbacks from vite.config.ts)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Auth and Database features will be disabled.");
}

// Defensive initialization: only create the client if credentials exist.
// This prevents the "supabaseUrl is required" error during the module load.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Sign in with Google OAuth.
 */
export const signInWithGoogle = async () => {
  if (!supabase) {
    console.error("Supabase client not initialized. Check your VITE_SUPABASE_ANON_KEY.");
    return { data: null, error: new Error("Supabase configuration missing") };
  }

  const redirectUrl = Capacitor.isNativePlatform() 
    ? 'com.mastergrowbot.app://callback' 
    : window.location.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  
  return { data, error };
};

/**
 * Fetches the current user's row from the 'profiles' table.
 */
export const getUserProfile = async () => {
  if (!supabase) return { data: null, error: new Error("Supabase configuration missing") };

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error("User is not authenticated") };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { data, error };
};

/**
 * Updates the current user's profile with onboarding data.
 */
export const updateOnboardingProfile = async (updates: {
  experience: string;
  environment: string;
  goal: string;
  grow_space_size: string;
}) => {
  if (!supabase) return { data: null, error: new Error("Supabase configuration missing") };

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error("User is not authenticated") };
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { data, error };
};
