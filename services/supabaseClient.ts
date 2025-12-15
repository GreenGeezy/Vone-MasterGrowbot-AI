import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

// Hardcoded credentials as requested for sandbox environment
const supabaseUrl = 'https://vofwdhlwsahwxecewyek.supabase.co';
const supabaseAnonKey = 'sb_publishable_nVYJrVpgVGW5mSuafXfMRg_Nr_3BKxm';

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Sign in with Google OAuth.
 * Handles the deep-link redirect back to the app via custom scheme.
 */
export const signInWithGoogle = async () => {
  // 'mastergrowbot' is the custom scheme for this application.
  // We use this explicitly on native platforms to trigger the deep link.
  // On web, we use window.location.origin to prevent the browser from hanging on an unknown scheme.
  const redirectUrl = Capacitor.isNativePlatform() 
    ? 'mastergrowbot://callback' 
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
 * @param updates Object containing experience, environment, goal, and grow space size.
 */
export const updateOnboardingProfile = async (updates: {
  experience: string;
  environment: string;
  goal: string;
  grow_space_size: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error("User is not authenticated") };
  }

  // Uses upsert to create the row if it doesn't exist (e.g. first login)
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