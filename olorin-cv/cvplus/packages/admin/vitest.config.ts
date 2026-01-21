/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/',
        '**/* .d.ts',
  */
        '**/*.config.*',
        '**/coverage/**'
      ]
    },
    include: [
      'src*/* .{test,spec}.{js,ts,tsx}'
  */
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/'
    ]
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@cvplus/core': resolve(__dirname, '../core/src'),
      '@cvplus/auth': resolve(__dirname, '../auth/src'),
      '@cvplus/premium': resolve(__dirname, '../premium/src'),
      '@cvplus/analytics': resolve(__dirname, '../analytics/src'),
      '@cvplus/public-profiles': resolve(__dirname, '../public-profiles/src')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test')
  }
});