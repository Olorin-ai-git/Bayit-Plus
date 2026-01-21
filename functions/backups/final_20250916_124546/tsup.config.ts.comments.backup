import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    compilerOptions: {
      declaration: true,
      declarationMap: true,
      skipLibCheck: true,
      moduleResolution: 'node',
    }
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    '@cvplus/core'
  ],
  treeshake: true,
  minify: false, // Keep readable for debugging
  target: 'es2020',
  outDir: 'dist',
  esbuildOptions(options) {
    options.chunkNames = '[name]-[hash]';
    // Suppress warnings about mixed exports and unused imports
    options.logLevel = 'error';
    options.pure = ['console.log', 'console.warn'];
    // Exclude backend functions from bundle (they're Firebase Functions)
    options.external = [...(options.external || []), './backend/functions', './backend/functions/*'];
  },
  outExtension: ({ format }) => ({
    js: format === 'cjs' ? '.js' : '.esm.js',
  }),
  onSuccess: async () => {
    console.log('✅ @cvplus/i18n built successfully');
    
    // Copy locale files to dist
    const fs = await import('fs');
    const path = await import('path');
    
    const localesDir = path.resolve(__dirname, 'locales');
    const distLocalesDir = path.resolve(__dirname, 'dist/locales');
    
    if (fs.existsSync(localesDir)) {
      fs.cpSync(localesDir, distLocalesDir, { recursive: true });
      console.log('✅ Locale files copied to dist');
    }
  },
});