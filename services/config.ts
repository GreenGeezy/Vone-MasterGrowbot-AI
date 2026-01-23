import { Capacitor } from '@capacitor/core';

export const CONFIG = {
    // 1. API KEY
    GEMINI_API_KEY: 'AIzaSyBEmRHHbEqZvbYwgOmuk8THcxuxJSlewlg',
    
    // 2. MODEL CONFIGURATION
    // Explicitly targeting Gemini 2.5 Pro for high-reasoning vision tasks
    MODELS: {
        DIAGNOSIS: 'gemini-2.5-pro', 
        CHAT_LIVE: 'gemini-2.5-flash',
        INSIGHTS: 'gemini-2.5-flash', 
    },

    SUPABASE_URL: 'https://auth.mastergrowbotai.com',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ2b2Z3ZGhsd3NhaHd4ZWNld3llayIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzQ2NjksImV4cCI6MjA0ODU1MDY2OX0.5j_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q',
};
