import { defineConfig } from 'tsup';

// External dependencies that should not be bundled
const external = [
  'react',
  'react-native',
  'lucide-react',
  'lucide-react-native',
  '@olorin/design-tokens',
];

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    external,
  },
  {
    entry: {
      'web/index': 'src/web/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external,
  },
  {
    entry: {
      'native/index': 'src/native/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external,
  },
  {
    entry: {
      'registry/index': 'src/registry/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    external,
  },
]);
