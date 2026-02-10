import { Capacitor } from '@capacitor/core';

export const CONFIG = {
    MODELS: {
        DIAGNOSIS: 'gemini-3-pro-preview',    // User Requested (Preview)
        CHAT_LIVE: 'gemini-1.5-flash-001',    // Stable (Flash)
        INSIGHTS: 'gemini-3-pro-preview',     // User Requested (Preview)
    },

    // 2. SUPABASE CONFIGURATION
    SUPABASE_URL: 'https://auth.mastergrowbotai.com',
    SUPABASE_ANON_KEY: 'sb_publishable_nVYJrVpgVGW5mSuafXfMRg_Nr_3BKxm',
};