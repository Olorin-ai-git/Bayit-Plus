import { defineConfig } from 'vite';
import { resolve } from 'path';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  root: resolve(__dirname, 'extension'),
  plugins: [
    webExtension({
      manifest: resolve(__dirname, 'extension/manifest.json'),
      additionalInputs: [
        'offscreen.html',
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'extension'),
      '@bayit/glass': resolve(__dirname, 'extension/lib/glass-shim'),
      '@olorin/glass-ui': resolve(__dirname, '../packages/ui/glass-components/src'),
      '@olorin/shared-i18n': resolve(__dirname, '../packages/ui/shared-i18n/src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: process.env.VITE_ENV === 'development' ? 'inline' : false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.VITE_ENV || 'development'),
  },
});
