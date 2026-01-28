import { defineConfig } from 'vite';
import { resolve } from 'path';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  plugins: [
    webExtension({
      manifest: resolve(__dirname, 'extension/manifest.json'),
      additionalInputs: [
        'extension/offscreen.html',
        'extension/popup.html',
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'extension'),
      '@olorin/glass-ui': resolve(__dirname, '../packages/ui/glass-components/src'),
      '@olorin/shared-i18n': resolve(__dirname, '../packages/ui/shared-i18n/src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.VITE_ENV === 'development' ? 'inline' : false,
    rollupOptions: {
      input: {
        'service-worker': resolve(__dirname, 'extension/service-worker.ts'),
        'offscreen/offscreen': resolve(__dirname, 'extension/offscreen/offscreen.ts'),
        'content/content-script': resolve(__dirname, 'extension/content/content-script.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.VITE_ENV || 'development'),
  },
});
