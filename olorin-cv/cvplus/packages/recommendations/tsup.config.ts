import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disable TypeScript declarations
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  external: [
    'react',
    'react-dom',
    'firebase',
    'firebase-admin',
    'firebase-functions',
    'lodash',
    '@cvplus/core'
  ],
  banner: {
    js: '/* CVPlus Recommendations Module - AI-powered CV recommendations system */'
  },
  tsconfig: 'tsconfig.build.json'
});