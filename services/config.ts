
/**
 * MasterGrowbot Centralized Configuration
 * Safely bridges environment variables to the application logic.
 */

// Fail-safe initialization: ensures app doesn't crash if env vars are missing
export const GEMINI_KEY = (import.meta.env?.VITE_GEMINI_API_KEY as string) || (process.env?.VITE_GEMINI_API_KEY as string) || '';
export const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL as string) || (process.env?.VITE_SUPABASE_URL as string) || '';
export const SUPABASE_ANON_KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || (process.env?.VITE_SUPABASE_ANON_KEY as string) || '';
export const REVENUECAT_KEY = (import.meta.env?.VITE_REVENUECAT_API_KEY as string) || (process.env?.VITE_REVENUECAT_API_KEY as string) || 'goog_kqOynvNRCABzUPrpfyFvlMvHUna';

export const CONFIG = {
    GEMINI_API_KEY: GEMINI_KEY,
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    REVENUECAT_API_KEY: REVENUECAT_KEY,
    APP_ID: 'com.mastergrowbot.app',
};

// Debug logging for build/runtime verification
console.log('[CONFIG] Environment Status:', {
    gemini: GEMINI_KEY ? 'READY' : 'MISSING',
    supabase: SUPABASE_URL ? 'READY' : 'MISSING',
});

/**
 * Validates the current configuration and alerts if critical keys are missing.
 */
export const validateConfig = () => {
    const criticalKeys = ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missing = criticalKeys.filter(key => !CONFIG[key as keyof typeof CONFIG]);
    
    if (missing.length > 0) {
        console.warn(`[CONFIG] Missing critical environment variables: ${missing.join(', ')}`);
        return false;
    }
    return true;
};
