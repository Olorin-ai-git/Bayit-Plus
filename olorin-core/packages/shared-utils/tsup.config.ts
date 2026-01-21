import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/formatters.ts',
    'src/rtlHelpers.ts',
    'src/platform.ts',
    'src/logger.ts',
    'src/accessibility.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-native'],
});
