
/**
 * MasterGrowbot Centralized Configuration
 * Safely bridges environment variables to the application logic.
 */

// Safe pattern: defaults to empty string to prevent crashes on undefined
// Using both import.meta.env (Vite) and process.env (Baked via define) for maximum compatibility
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
console.log('[CONFIG] Environment Detection Status:', {
    gemini: !!CONFIG.GEMINI_API_KEY,
    supabase: !!CONFIG.SUPABASE_URL,
    revenueCat: CONFIG.REVENUECAT_API_KEY !== 'goog_kqOynvNRCABzUPrpfyFvlMvHUna'
});

/**
 * Validates the current configuration and alerts the user/developer 
 * if critical environment variables are missing.
 */
export const validateConfig = () => {
    const criticalKeys = ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missing = criticalKeys.filter(key => !CONFIG[key as keyof typeof CONFIG]);
    
    if (missing.length > 0) {
        console.error(`[CONFIG] CRITICAL MISSING KEYS: ${missing.join(', ')}`);
        // We return false to allow the UI to show a warning banner if needed
        return false;
    }
    return true;
};
