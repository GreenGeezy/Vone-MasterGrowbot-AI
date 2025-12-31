
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Fallbacks to ensure the app doesn't crash if env vars are missing
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || 'AIzaSyDBk9zcegLlzNRV3qSDJcLFBX2Fj7wATNc'),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || 'AIzaSyDBk9zcegLlzNRV3qSDJcLFBX2Fj7wATNc'),
        'process.env.REVENUECAT_API_KEY': JSON.stringify(env.VITE_REVENUECAT_API_KEY || env.REVENUECAT_API_KEY || 'goog_kqOynvNRCABzUPrpfyFvlMvHUna'),
        // Supabase Credentials Fallbacks
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://vofwdhlwsahwxecewyek.supabase.co'),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nVYJrVpgVGW5mSuafXfMRg_Nr_3BKxm')
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});
