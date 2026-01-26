import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: {
      'web/index': 'src/web/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
  },
  {
    entry: {
      'native/index': 'src/native/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
  },
  {
    entry: {
      'registry/index': 'src/registry/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
  },
]);
