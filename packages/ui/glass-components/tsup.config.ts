import { defineConfig } from 'tsup';

export default defineConfig([
  // React Native build
  {
    entry: {
      'native/index': 'src/native/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: false,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: [
      'react',
      'react-native',
      'react-native-linear-gradient',
      'react-native-reanimated',
      'react-native-safe-area-context',
      'react-native-gesture-handler',
      '@olorin/design-tokens',
      'zustand',
      'nanoid',
    ],
    esbuildOptions(options) {
      options.resolveExtensions = ['.native.tsx', '.native.ts', '.tsx', '.ts'];
    },
  },
  // React Web build
  {
    entry: {
      'web/index': 'src/web/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: ['react', 'react-dom', '@olorin/design-tokens'],
    esbuildOptions(options) {
      options.resolveExtensions = ['.web.tsx', '.web.ts', '.tsx', '.ts'];
    },
  },
  // Shared hooks build
  {
    entry: {
      'hooks/index': 'src/hooks/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: ['react', 'react-native', '@olorin/design-tokens'],
  },
  // Theme build
  {
    entry: {
      'theme/index': 'src/theme/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: ['@olorin/design-tokens'],
  },
  // Stores build
  {
    entry: {
      'stores/index': 'src/stores/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: ['react', 'zustand', 'nanoid'],
  },
  // Contexts build
  {
    entry: {
      'contexts/index': 'src/contexts/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: [
      'react',
      'react-native',
      'react-native-safe-area-context',
      '@olorin/design-tokens',
      'zustand',
    ],
  },
]);
