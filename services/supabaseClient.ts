
import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { CONFIG } from './config';

if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing. Auth and Database features will be limited.");
}

export const supabase = (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) 
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
  : null;

export const signInWithGoogle = async () => {
  if (!supabase) return { data: null, error: new Error("Supabase missing") };

  const redirectUrl = Capacitor.isNativePlatform() 
    ? 'mastergrowbot://callback' 
    : window.location.origin;

  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
};

export const getUserProfile = async () => {
  if (!supabase) return { data: null, error: new Error("Supabase missing") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("No user") };

  return await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
};

export const updateOnboardingProfile = async (updates: any) => {
  if (!supabase) return { data: null, error: new Error("Supabase missing") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("No user") };

  return await supabase
    .from('profiles')
    .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single();
};
