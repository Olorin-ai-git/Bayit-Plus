import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'web.ts', 'native.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['react', 'react-native', 'i18next', 'react-i18next', '@olorin/shared-i18n'],
});
