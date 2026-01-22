import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), '');

    const envDefinitions: Record<string, string> = {};
    Object.keys(env).forEach((key) => {
      envDefinitions[`process.env.${key}`] = JSON.stringify(env[key]);
    });
    
    // Explicitly define API_KEY for Google SDKs that might look for it
    envDefinitions['process.env.API_KEY'] = JSON.stringify(env.VITE_GEMINI_API_KEY || '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        ...envDefinitions,
        // Polyfill process.env for libs that expect it
        'process.env': JSON.stringify(env),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'), // Standard alias
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: true,
      }
    };
});
