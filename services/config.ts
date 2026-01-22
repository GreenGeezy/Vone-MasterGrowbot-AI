import { Capacitor } from '@capacitor/core';

// 1. DEFINE YOUR GEMINI KEYS
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
    GEMINI_API_KEY: getApiKey(),
    
    // UPGRADED: Switching to Gemini 2.5 Series as requested
    MODELS: {
        // High-reasoning model for complex plant health reports
        DIAGNOSIS: 'gemini-2.5-pro', 
        
        // Low-latency model for real-time coaching
        CHAT_LIVE: 'gemini-2.5-flash', 
        
        // Efficient model for daily tips
        INSIGHTS: 'gemini-2.5-flash',       
    },

    // CUSTOM DOMAIN: Prevents browser redirection issues
    SUPABASE_URL: 'https://auth.mastergrowbotai.com',
    
    // Auth Key with Fallback for CodeMagic
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ2b2Z3ZGhsd3NhaHd4ZWNld3llayIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzQ2NjksImV4cCI6MjA0ODU1MDY2OX0.5j_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q',
    
    APP_ID: 'com.mastergrowbot.app',
};

// Safety Check
if (!CONFIG.GEMINI_API_KEY) {
  console.error("CRITICAL: Gemini API Key is missing!");
}
