import { Capacitor } from '@capacitor/core';

// 1. DEFINE YOUR GEMINI KEYS (Preserved from your original file)
const KEYS = {
    MOBILE: 'AIzaSyBEmRHHbEqZvbYwgOmuk8THcxuxJSlewlg', 
    WEB: 'AIzaSyCvPh_xKte7vpoWO6Ur-MQiD4n3EHlUD-s',
};

const getApiKey = () => {
    if (Capacitor.isNativePlatform()) {
        return KEYS.MOBILE;
    }
    return KEYS.WEB;
};

export const CONFIG = {
    // --- GEMINI CONFIGURATION (Preserved) ---
    GEMINI_API_KEY: getApiKey(),
    
    MODELS: {
        DIAGNOSIS: 'gemini-1.5-pro',
        CHAT_LIVE: 'gemini-2.0-flash-exp', 
        INSIGHTS: 'gemini-1.5-flash',       
    },

    // --- SUPABASE CONFIGURATION (THE FIX) ---
    // Logic: Try to read from CodeMagic Environment Variables first (import.meta.env).
    // If those are missing (local dev), fall back to your hardcoded values.
    
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://auth.mastergrowbotai.com',
    
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ2b2Z3ZGhsd3NhaHd4ZWNld3llayIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzQ2NjksImV4cCI6MjA0ODU1MDY2OX0.5j_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q',
    
    APP_ID: 'com.mastergrowbot.app',
};

// Debug logging
console.log(`[CONFIG] Platform: ${Capacitor.getPlatform()} | Mode: ${Capacitor.isNativePlatform() ? 'Native' : 'Web'}`);

// Safety Check: Log an error if keys are missing (visible in Android Studio logs)
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
  console.error("CRITICAL ERROR: Supabase config is missing. Check your .env or CodeMagic variables.");
}
