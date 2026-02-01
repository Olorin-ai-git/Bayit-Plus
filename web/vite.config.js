import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@bayit/shared': path.resolve(__dirname, '../shared'),
      '@bayit/shared/ui': path.resolve(__dirname, '../shared/components/ui'),
      '@bayit/shared/search': path.resolve(__dirname, '../shared/components/search'),
      '@bayit/shared-hooks': path.resolve(__dirname, '../shared/hooks'),
      '@bayit/shared-services': path.resolve(__dirname, '../shared/services'),
      '@bayit/shared-utils': path.resolve(__dirname, '../shared/utils'),
      '@bayit/i18n': path.resolve(__dirname, '../packages/ui/bayit-i18n/dist/index.mjs'),
      '@bayit/i18n/web': path.resolve(__dirname, '../packages/ui/bayit-i18n/dist/web.mjs'),
      '@olorin/shared-i18n': path.resolve(__dirname, '../packages/ui/shared-i18n/dist/index.mjs'),
      '@olorin/design-tokens': path.resolve(__dirname, '../packages/ui/design-tokens/src'),
      '@olorin/shared-icons/web': path.resolve(__dirname, '../packages/ui/shared-icons/src/web'),
      '@olorin/shared-icons/native': path.resolve(__dirname, '../packages/ui/shared-icons/src/native'),
      '@olorin/shared-icons': path.resolve(__dirname, '../packages/ui/shared-icons/src'),
      '@olorin/glass-ui/stores': path.resolve(__dirname, '../packages/ui/glass-components/src/stores'),
      '@bayit/glass': path.resolve(__dirname, '../packages/ui/glass-components/src'),
      '@bayit/shared-hooks/useSafeArea': path.resolve(__dirname, '../shared/hooks/useSafeArea'),
    },
  },
  server: {
    port: 3200,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for /api/v1/ws/* endpoints
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
