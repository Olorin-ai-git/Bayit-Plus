import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/CultureContext.tsx',
    'src/ModalContext.tsx',
    'src/ProfileContext.tsx',
    'src/VoiceListeningContext.tsx',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-native', '@olorin/shared-types', '@olorin/shared-hooks'],
});
