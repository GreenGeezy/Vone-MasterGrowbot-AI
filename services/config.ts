
/**
 * MasterGrowbot Centralized Configuration
 * Safely bridges environment variables to the application logic.
 */

// Safe pattern as requested: defaults to empty string to prevent crashes on undefined
export const GEMINI_KEY = (import.meta.env?.VITE_GEMINI_API_KEY as string) || '';
export const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL as string) || '';
export const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';
export const REVENUECAT_KEY = (import.meta.env?.VITE_REVENUECAT_API_KEY as string) || 'goog_kqOynvNRCABzUPrpfyFvlMvHUna';

// Debug logging for build/runtime verification
console.log('[CONFIG] Gemini API Key detection:', 
    GEMINI_KEY ? 'DETECTED (starts with ' + GEMINI_KEY.substring(0, 4) + ')' : 'NOT DETECTED'
);

export const CONFIG = {
    GEMINI_API_KEY: GEMINI_KEY,
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    REVENUECAT_API_KEY: REVENUECAT_KEY,
    APP_ID: 'com.mastergrowbot.app',
};

// Runtime validation helper
export const validateConfig = () => {
    const missing = Object.entries(CONFIG)
        .filter(([key, value]) => !value && key !== 'REVENUECAT_API_KEY')
        .map(([key]) => key);
    
    if (missing.length > 0) {
        console.warn(`[CONFIG] Missing environment variables: ${missing.join(', ')}`);
    }
};
