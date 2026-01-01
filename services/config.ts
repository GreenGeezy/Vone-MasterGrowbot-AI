
/**
 * MasterGrowbot Centralized Configuration
 * Safely bridges environment variables to the application logic.
 */

export const CONFIG = {
    // Vite environment variables must be accessed statically for build-time replacement.
    // We use optional chaining to prevent crashes if the env object is missing.
    GEMINI_API_KEY: (import.meta.env?.VITE_GEMINI_API_KEY as string) || '',
    SUPABASE_URL: (import.meta.env?.VITE_SUPABASE_URL as string) || '',
    SUPABASE_ANON_KEY: (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '',
    REVENUECAT_API_KEY: (import.meta.env?.VITE_REVENUECAT_API_KEY as string) || 'goog_kqOynvNRCABzUPrpfyFvlMvHUna',
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
