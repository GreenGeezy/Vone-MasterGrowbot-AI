
/**
 * MasterGrowbot Centralized Configuration
 * Safely bridges environment variables to the application logic.
 */

// Safely detect environment variables without throwing TypeError if objects are undefined
const safeGetEnv = (key: string): string => {
  try {
    // Check import.meta.env (Vite) first, then fallback to process.env (Vite define block)
    const value = (import.meta.env && import.meta.env[key]) || (process.env && (process.env as any)[key]);
    return typeof value === 'string' ? value : '';
  } catch (e) {
    return '';
  }
};

const GEMINI_KEY = safeGetEnv('VITE_GEMINI_API_KEY');

// Debug logging for build/runtime verification
console.log('[CONFIG] Gemini API Key detection:', 
    GEMINI_KEY ? 'DETECTED (starts with ' + GEMINI_KEY.substring(0, 4) + ')' : 'NOT DETECTED'
);

export const CONFIG = {
    GEMINI_API_KEY: GEMINI_KEY,
    SUPABASE_URL: safeGetEnv('VITE_SUPABASE_URL'),
    SUPABASE_ANON_KEY: safeGetEnv('VITE_SUPABASE_ANON_KEY'),
    REVENUECAT_API_KEY: safeGetEnv('VITE_REVENUECAT_API_KEY') || 'goog_kqOynvNRCABzUPrpfyFvlMvHUna',
    APP_ID: 'com.mastergrowbot.app',
};

// Second layer of debug for the resolved object
if (!CONFIG.GEMINI_API_KEY) {
    console.warn('[CONFIG] Warning: Gemini API Key is empty. Ensure VITE_GEMINI_API_KEY is set in your environment.');
}

// Runtime validation helper
export const validateConfig = () => {
    const missing = Object.entries(CONFIG)
        .filter(([key, value]) => !value && key !== 'REVENUECAT_API_KEY')
        .map(([key]) => key);
    
    if (missing.length > 0) {
        console.warn(`[CONFIG] Missing environment variables: ${missing.join(', ')}`);
    }
};
