import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['services/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    exclude: ['android/**', 'output/**', 'node_modules/**', 'dist/**'],
    maxWorkers: 2,
    minWorkers: 1,
  },
});
