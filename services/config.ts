import { Capacitor } from '@capacitor/core';

/**
 * MasterGrowbot Configuration
 * Handles "Dual Key" logic for Web vs. Mobile
 */

const KEYS = {
    // 1. YOUR MOBILE KEY (Restricted to com.mastergrowbot.app)
    MOBILE: 'AIzaSyBEmRHHbEqZvbYwgOmuk8THcxuxJSlewlg', 
    
    // 2. YOUR WEB KEY (Restricted to your Website Domain)
    WEB: 'AIzaSyCvPh_xKte7vpoWO6Ur-MQiD4n3EHlUD-s',
};

// Logic: If on a phone, use Mobile Key. If on a website, use Web Key.
const getApiKey = () => {
    if (Capacitor.isNativePlatform()) {
        return KEYS.MOBILE;
    }
    return KEYS.WEB;
};

export const CONFIG = {
    // Automatically selects the correct key
    GEMINI_API_KEY: getApiKey(),
    
    // AI Models
    MODELS: {
        DIAGNOSIS: 'gemini-1.5-pro',
        CHAT_LIVE: 'gemini-2.0-flash-exp', 
        INSIGHTS: 'gemini-1.5-flash',       
    },

    // Supabase & App Config
    SUPABASE_URL: (import.meta as any).env?.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
    APP_ID: 'com.mastergrowbot.app',
};

console.log(`[CONFIG] Platform: ${Capacitor.getPlatform()} | Mode: ${Capacitor.isNativePlatform() ? 'Native' : 'Web'}`);
