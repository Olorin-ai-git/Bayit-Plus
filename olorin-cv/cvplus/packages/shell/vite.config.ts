import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@cvplus/core': resolve(__dirname, '../core/src'),
      '@cvplus/auth': resolve(__dirname, '../auth/src/frontend'),
      '@cvplus/processing': resolve(__dirname, '../processing/src/frontend'),
      '@cvplus/multimedia': resolve(__dirname, '../multimedia/src/frontend'),
      '@cvplus/public-profiles': resolve(__dirname, '../public-profiles/src/frontend'),
      '@cvplus/analytics': resolve(__dirname, '../analytics/src/frontend'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
  },
  define: {
    global: 'globalThis',
  },
});