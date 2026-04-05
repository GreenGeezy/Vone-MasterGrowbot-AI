import { Capacitor } from '@capacitor/core';

export const CONFIG = {
    MODELS: {
        DIAGNOSIS: 'gemini-3.1-pro-preview',    // User Requested (Preview)
        INSIGHTS: 'gemini-3.1-pro-preview',     // User Requested (Preview)
    },

    // 2. SUPABASE CONFIGURATION
    SUPABASE_URL: 'https://auth.mastergrowbotai.com',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTA5NDgsImV4cCI6MjA4MDc4Njk0OH0.Gq2EjdT48L42TeKp2bU0dQi0wBFS9Jfby7RXR1t95Ko',

    // 3. WHOP MONETIZATION
    WHOP: {
        PACKS: {
            seedling: {
                label: 'Seedling Pack',
                price: 4.99,
                credits: 10,
                url: 'https://whop.com/checkout/plan_cnBXmjls6vqve',
            },
            grower: {
                label: 'Grower Pack',
                price: 9.99,
                credits: 25,
                url: 'https://whop.com/checkout/plan_8IeEs8R5eQeW8',
            },
            master: {
                label: 'Master Pack',
                price: 19.99,
                credits: 60,
                url: 'https://whop.com/checkout/plan_yTa1NCVRPlcHf',
            },
            annual: {
                label: 'Pro Annual',
                price: 99.99,
                url: 'https://whop.com/checkout/plan_wLuGSt6BE4oia',
            },
        },
        SUCCESS_PARAM: 'whop_success',
    },

    // 4. TOKEN COSTS PER AI FEATURE
    TOKEN_COSTS: {
        DIAGNOSIS:        1.0,
        STRAIN_INSIGHT:   0.5,
        JOURNAL_ANALYSIS: 0.3,
        DAILY_INSIGHT:    0,
    },

    // 5. FREE CREDITS FOR NEW WEB USERS
    FREE_CREDITS: 3,
};