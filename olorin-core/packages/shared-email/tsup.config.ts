import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'tracking.ts', 'campaign.ts', 'preview.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
});
