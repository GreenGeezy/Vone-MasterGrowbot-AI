import { Capacitor } from '@capacitor/core';

// 1. DEFINE YOUR KEYS
const KEYS = {
    // Hardcoded to ensure immediate functionality
    MOBILE: 'AIzaSyBEmRHHbEqZvbYwgOmuk8THcxuxJSlewlg', 
    WEB: 'AIzaSyBEmRHHbEqZvbYwgOmuk8THcxuxJSlewlg',
};

const getApiKey = () => {
    return KEYS.MOBILE;
};

export const CONFIG = {
    GEMINI_API_KEY: getApiKey(),
    
    // MODEL CONFIGURATION
    // We use the STABLE 1.5 endpoints to ensure the app works today.
    // Future 2.5/3.0 capabilities will map here when released publicly.
    MODELS: {
        DIAGNOSIS: 'gemini-1.5-pro', // Highest accuracy for Vision
        CHAT_LIVE: 'gemini-1.5-flash', // Fastest speed for Chat
        INSIGHTS: 'gemini-1.5-flash', // Best for background tasks
    },

    SUPABASE_URL: 'https://auth.mastergrowbotai.com',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ2b2Z3ZGhsd3NhaHd4ZWNld3llayIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzQ2NjksImV4cCI6MjA0ODU1MDY2OX0.5j_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q',
    APP_ID: 'com.mastergrowbot.app',
};
