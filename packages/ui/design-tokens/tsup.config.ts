import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    colors: 'src/colors.ts',
    spacing: 'src/spacing.ts',
    typography: 'src/typography.ts',
    shadows: 'src/shadows.ts',
    animations: 'src/animations.ts',
    'tailwind.preset': 'src/tailwind.preset.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ['tailwindcss'],
});
