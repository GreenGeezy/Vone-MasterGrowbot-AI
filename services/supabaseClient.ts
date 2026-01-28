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
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export const signInWithGoogle = async () => {
  // Use Capacitor's native check for reliability
  const isMobile = Capacitor.isNativePlatform(); 
  
  // 1. Determine the Redirect URL
  // Matches your Supabase > Authentication > URL Configuration
  const redirectUrl = isMobile
    ? 'com.mastergrowbot.app://login-callback'
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? `${window.location.origin}` // URL Configuration in Supabase must allow this exact Origin
      : 'https://auth.mastergrowbotai.com/auth/v1/callback';
    
  console.log(`[Auth] Starting Google Sign-In. Redirecting to: ${redirectUrl}`);

  // 2. Start the OAuth flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true, // CRITICAL: We handle the redirect manually below to prevent external browser launch
    },
  });

  if (error) throw error;

  // 3. Open the URL using the Secure In-App Browser (Capacitor Browser)
  // This keeps the session context within the app container.
  if (data?.url) {
      if (isMobile) {
          await Browser.open({ 
              url: data.url, 
              windowName: '_self', // Replaces current context
              presentationStyle: 'popover' // iOS visual polish (ignored on Android)
          });
      } else {
          // Fallback for web testing (localhost)
          window.location.href = data.url;
      }
  }
  
  return data;
};

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
