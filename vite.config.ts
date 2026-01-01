
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Explicitly define the process.env keys needed for the Gemini SDK and general app config
    const envDefinitions: Record<string, string> = {};
    Object.keys(env).forEach((key) => {
      envDefinitions[`process.env.${key}`] = JSON.stringify(env[key]);
    });
    
    // Ensure API_KEY is mapped for the Google GenAI SDK rules
    envDefinitions['process.env.API_KEY'] = JSON.stringify(env.VITE_GEMINI_API_KEY);

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        ...envDefinitions,
        // Also provide the requested process.env object bridge
        'process.env': JSON.stringify(env)
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});
