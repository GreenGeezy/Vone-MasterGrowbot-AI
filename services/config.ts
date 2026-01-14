import { Capacitor } from '@capacitor/core';

// 1. DEFINE YOUR KEYS (Do not share publicly)
const KEYS = {
    // Mobile API Key (restricted to Android/iOS apps in Google Cloud)
    MOBILE: 'AIzaSyBEmRHHbEqZvbYwgOmuk8THcxuxJSlewlg', 
    // Web API Key (restricted to HTTP referrers in Google Cloud)
    WEB: 'AIzaSyCvPh_xKte7vpoWO6Ur-MQiD4n3EHlUD-s',
};

// 2. HELPER FUNCTION TO SELECT KEY BASED ON PLATFORM
const getApiKey = () => {
    if (Capacitor.isNativePlatform()) {
        // Running on Android or iOS
        return KEYS.MOBILE;
    }
    // Running in a browser (PWA or dev server)
    return KEYS.WEB;
};

export const CONFIG = {
    // Dynamically select the correct API key
    GEMINI_API_KEY: getApiKey(),
    
    // Gemini Model Versions
    MODELS: {
        DIAGNOSIS: 'gemini-1.5-pro', // Better for vision tasks
        CHAT_LIVE: 'gemini-2.0-flash-exp', // Faster for chat
        INSIGHTS: 'gemini-1.5-flash',       
    },

    // FIXED: Point to your verified Custom Domain
    SUPABASE_URL: 'https://www.mastergrowbotai.com', 
    
    // Existing Anon Key (This key works for both your default and custom domains)
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ2b2Z3ZGhsd3NhaHd4ZWNld3llayIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzQ2NjksImV4cCI6MjA0ODU1MDY2OX0.5j_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q',
    
    // Your App's Deep Link Scheme
    APP_ID: 'com.mastergrowbot.app',
};

// Log current platform for debugging (helpful in logs)
console.log(`[CONFIG] Platform: ${Capacitor.getPlatform()} | Mode: ${Capacitor.isNativePlatform() ? 'Native' : 'Web'}`);
