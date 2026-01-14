import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';
import { Capacitor } from '@capacitor/core';
import { UserProfile } from '../types';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export const signInWithGoogle = async () => {
  // CRITICAL: Determine where to send the user back to
  const redirectUrl = Capacitor.isNativePlatform() 
    ? 'com.mastergrowbot.app://login-callback'  // Android/iOS Deep Link
    : 'https://www.mastergrowbotai.com/auth/v1/callback'; // Web fallback
    
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: false, 
    },
  });

  if (error) throw error;
  return data;
};

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
