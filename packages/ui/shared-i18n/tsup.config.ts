import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'index.ts',
    web: 'web.ts',
    native: 'native.ts',
    types: 'types.ts',
    protocols: 'protocols.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: [
    'i18next',
    'react-i18next',
    '@react-native-async-storage/async-storage',
    'react-native',
  ],
});
