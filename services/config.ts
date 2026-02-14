import { Capacitor } from '@capacitor/core';

export const CONFIG = {
    MODELS: {
        DIAGNOSIS: 'gemini-3-pro-preview',    // User Requested (Preview)
        CHAT_LIVE: 'gemini-1.5-flash-001',    // Stable (Flash)
        INSIGHTS: 'gemini-3-pro-preview',     // User Requested (Preview)
    },

    // 2. SUPABASE CONFIGURATION
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};