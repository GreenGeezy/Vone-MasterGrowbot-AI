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
        // Essential mapping for @google/genai SDK
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        // Redundant mappings for general app usage
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.REVENUECAT_API_KEY': JSON.stringify(env.VITE_REVENUECAT_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});
