
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load environment variables from process.cwd()
    // Cast process to any to resolve 'Property cwd does not exist on type Process' error in some IDE/TS configurations
    const env = loadEnv(mode, (process as any).cwd(), '');

    // Map env variables into a define block so they are accessible as process.env.VITE_...
    const envDefinitions: Record<string, string> = {};
    Object.keys(env).forEach((key) => {
      envDefinitions[`process.env.${key}`] = JSON.stringify(env[key]);
    });
    
    // Mapping specifically for Gemini SDK expectations
    envDefinitions['process.env.API_KEY'] = JSON.stringify(env.VITE_GEMINI_API_KEY || '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        ...envDefinitions,
        // Bridge for older libraries or specific build tools
        'process.env': JSON.stringify(env),
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});