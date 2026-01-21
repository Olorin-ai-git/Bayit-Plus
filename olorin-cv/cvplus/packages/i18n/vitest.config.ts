import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/.cache/**',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@cvplus/core': resolve(__dirname, '../core/src'),
    },
  },
  optimizeDeps: {
    exclude: ['canvas'],
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});