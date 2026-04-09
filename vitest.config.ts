import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@oikos/coaching': path.resolve(__dirname, 'coaching-src'),
      '@oikos/core': path.resolve(__dirname, 'src/lib/stubs/oikos-core.ts'),
    },
  },
});
