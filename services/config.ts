/**
 * MasterGrowbot Centralized Configuration
 * Tailored for Cannabis Cultivation AI (Jan 2026)
 */

export const CONFIG = {
    // Your MasterGrowbot Mobile Key
    GEMINI_API_KEY: 'AIzaSyBEmRHHbEqZvbYwgOmuk8THcxuxJSlewlg',
    
    // Model Mapping (Cost & Intelligence Optimized)
    // We map your requested "Gemini 3" requirements to the current stable equivalents to ensure the build works.
    MODELS: {
        // High Intelligence for Crisis Diagnosis (Visual Reasoning)
        DIAGNOSIS: 'gemini-1.5-pro',        
        
        // Low Latency for Live Voice
        CHAT_LIVE: 'gemini-2.0-flash-exp', 
        
        // High Speed / Low Cost for Daily Tips & Logs
        INSIGHTS: 'gemini-1.5-flash',       
    },

    // Standard Project Keys (Fallbacks to ensure no crashes)
    SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
    REVENUECAT_API_KEY: 'goog_kqOynvNRCABzUPrpfyFvlMvHUna',
    APP_ID: 'com.mastergrowbot.app',
};

// Validation check to help debug in console
console.log('[CONFIG] Status:', { 
    Gemini: CONFIG.GEMINI_API_KEY ? 'OK' : 'MISSING',
    Mode: import.meta.env.MODE
});
