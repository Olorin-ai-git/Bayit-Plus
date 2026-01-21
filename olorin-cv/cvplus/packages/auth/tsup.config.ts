import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  target: 'es2020',
  dts: {
    compilerOptions: {
      skipLibCheck: true,
      rootDir: undefined,
    }
  },
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'firebase',
    'firebase-admin',
    '@cvplus/core',
    'lucide-react'
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
  },
  tsconfig: 'tsconfig.build.json',
});