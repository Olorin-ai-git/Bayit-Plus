import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.d.ts',
        'tests/',
        'extension/offscreen/audio-worklet-processor.js', // AudioWorklet runs in separate context
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'extension'),
      '@olorin/glass-ui': resolve(__dirname, '../packages/ui/glass-components/src'),
      '@olorin/shared-i18n': resolve(__dirname, '../packages/ui/shared-i18n/src'),
    },
  },
});
