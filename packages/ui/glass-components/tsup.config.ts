import { resolve } from 'node:path';
import type { Plugin } from 'esbuild';
import { defineConfig, type Options } from 'tsup';

const notificationStoreSource = resolve('src/stores/notificationStore');
const notificationStorePlugin: Plugin = {
  name: 'canonical-notification-store',
  setup(build) {
    build.onResolve({ filter: /notificationStore(?:\.[cm]?[jt]sx?)?$/ }, (args) => {
      const source = resolve(args.resolveDir, args.path).replace(/\.[cm]?[jt]sx?$/, '');
      if (source !== notificationStoreSource) return undefined;
      return { path: '../stores/index.js', external: true };
    });
  },
};

const publicBuilds: Options[] = [
  // React Native build
  {
    entry: {
      'native/index': 'src/native/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    minify: true,
    external: [
      'react',
      'react-native',
      'react-native-linear-gradient',
      'react-native-reanimated',
      'react-native-safe-area-context',
      'react-native-gesture-handler',
      '@olorin/design-tokens',
      '@olorin/shared-icons',
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
    format: ['esm'],
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
];

export default defineConfig([
  ...publicBuilds.map((options) => ({
    ...options,
    esbuildPlugins: [notificationStorePlugin],
  })),
  // Both public module formats share this one runtime store through Node's
  // module cache or the consuming bundler's module graph.
  {
    entry: { 'stores/index': 'src/stores/index.ts' },
    format: ['cjs'],
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: ['react', 'zustand', 'nanoid'],
  },
]);
