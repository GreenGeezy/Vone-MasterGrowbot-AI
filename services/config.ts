
/**
 * MasterGrowbot Centralized Configuration
 * Safely bridges environment variables to the application logic.
 */

// Debug logging for build/runtime verification
console.log('[CONFIG] Build-time VITE_GEMINI_API_KEY detection:', 
    import.meta.env?.VITE_GEMINI_API_KEY ? 'DETECTED (starts with ' + import.meta.env.VITE_GEMINI_API_KEY.substring(0, 4) + ')' : 'NOT DETECTED'
);

export const CONFIG = {
    // Vite environment variables must be accessed statically for build-time replacement.
    GEMINI_API_KEY: (import.meta.env?.VITE_GEMINI_API_KEY as string) || (process.env?.API_KEY as string) || '',
    SUPABASE_URL: (import.meta.env?.VITE_SUPABASE_URL as string) || (process.env?.VITE_SUPABASE_URL as string) || '',
    SUPABASE_ANON_KEY: (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || (process.env?.VITE_SUPABASE_ANON_KEY as string) || '',
    REVENUECAT_API_KEY: (import.meta.env?.VITE_REVENUECAT_API_KEY as string) || (process.env?.REVENUECAT_API_KEY as string) || 'goog_kqOynvNRCABzUPrpfyFvlMvHUna',
    APP_ID: 'com.mastergrowbot.app',
};

// Second layer of debug for the resolved object
if (!CONFIG.GEMINI_API_KEY) {
    console.error('[CONFIG] CRITICAL: Gemini API Key resolved to empty string. Check Codemagic environment variables and vite.config.ts mappings.');
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
