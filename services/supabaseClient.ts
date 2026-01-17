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
  const isMobile = Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios';
  
  // FIXED: Redirect to the new 'auth' subdomain
  const redirectUrl = isMobile
    ? 'com.mastergrowbot.app://login-callback'
    : 'https://auth.mastergrowbotai.com/auth/v1/callback';
    
  console.log(`[Auth] Starting Google Sign-In. Redirecting to: ${redirectUrl}`);

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

// ... (Keep the rest of the file getUserProfile, etc. exactly as is) ...
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
