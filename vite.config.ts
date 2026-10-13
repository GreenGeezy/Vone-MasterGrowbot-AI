import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000, host: '127.0.0.1',
        watch: { ignored: ['**/android/**','**/ios/**','**/output/**','**/.tooling/**','**/.playwright-cli/**','**/Phase6_Keys/**'] },
        fs: { deny: ['.env','.env.*','**/.git/**','**/Phase6_Keys/**','**/.tooling/**'] },
      },
      plugins: [react()],
      resolve: { alias: { '@': path.resolve(__dirname, './src') } },
      build: { outDir: 'dist', sourcemap: true }
    };
});
