import { Capacitor } from '@capacitor/core';

export const CONFIG = {
  // 1. MODEL CONFIGURATION
  // These are the models powering your app via the Supabase Backend.
  MODELS: {
    DIAGNOSIS: 'gemini-3-pro-preview',   // Reasoning Model (Plant Doctor)
    CHAT_LIVE: 'gemini-3-flash-preview', // Fast Model (Chatbot & Voice)
    INSIGHTS: 'gemini-3-flash-preview',  // Fast Model (Daily Tips)
  },

  // 2. SUPABASE CONFIGURATION
  // This connects your app to your secure backend "Kitchen".
  SUPABASE_URL: 'https://auth.mastergrowbotai.com',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ2b2Z3ZGhsd3NhaHd4ZWNld3llayIsInJlZiI6InZvZndkaGx3c2Fod3hlY2V3eWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NzQ2NjksImV4cCI6MjA0ODU1MDY2OX0.5j_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q_Q6Q',
};