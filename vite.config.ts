
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env vars regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Hard-bake environment variables into the JS bundle
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
        'process.env.VITE_REVENUECAT_API_KEY': JSON.stringify(env.VITE_REVENUECAT_API_KEY || 'goog_kqOynvNRCABzUPrpfyFvlMvHUna'),
        // Support the Gemini SDK requirement for process.env.API_KEY
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
        // Provide a bridge for build tools
        'process.env': JSON.stringify(env),
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});
