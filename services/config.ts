import { Capacitor } from '@capacitor/core';

export const CONFIG = {
    MODELS: {
        DIAGNOSIS: 'gemini-3-pro-preview',    // User Requested (Preview)
        CHAT_LIVE: 'gemini-1.5-flash-001',    // Stable (Flash)
        INSIGHTS: 'gemini-3-pro-preview',     // User Requested (Preview)
    },

    // 2. SUPABASE CONFIGURATION
    SUPABASE_URL: 'https://auth.mastergrowbotai.com',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTA5NDgsImV4cCI6MjA4MDc4Njk0OH0.Gq2EjdT48L42TeKp2bU0dQi0wBFS9Jfby7RXR1t95Ko',
};