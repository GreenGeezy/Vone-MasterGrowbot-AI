import { Capacitor } from '@capacitor/core';

export const CONFIG = {
    // 1. YOUR API KEY
    GEMINI_API_KEY: 'AIzaSyBEmRHHbEqZvbYwgOmuk8THcxuxJSlewlg',
    
    // 2. MODEL CONFIGURATION (Updated for New SDK)
    // We use the Gemini 3 Preview models which are publicly available via the new SDK.
    MODELS: {
        DIAGNOSIS: 'gemini-3-pro-preview', // Pro-level reasoning for Plant Scan
        CHAT_LIVE: 'gemini-3-flash-preview', // High-speed for Chatbot
        INSIGHTS: 'gemini-3-flash-preview',  
    },

    SUPABASE_URL: 'https://auth.mastergrowbotai.com',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ2b2Z3ZGhsd3NhaHd4ZWNld3llayIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzQ2NjksImV4cCI6MjA0ODU1MDY2OX0.5j_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q',
};
