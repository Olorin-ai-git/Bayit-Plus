import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Security headers plugin for development and production
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Content Security Policy - Development friendly (allows Firebase emulators)
          const cspPolicy = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com https://apis.google.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com data:",
            "connect-src 'self' https: wss: ws: http: http://localhost:* ws://localhost:* https://accounts.google.com https://oauth2.googleapis.com https://identitytoolkit.googleapis.com",
            "media-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "frame-src 'self' https://accounts.google.com http://localhost:9099"
          ].join('; ');
          
          res.setHeader('Content-Security-Policy', cspPolicy);
          
          // XSS Protection headers
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          
          // Additional security headers
          res.setHeader('Permissions-Policy', 
            'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
          );
          
          // Remove potentially revealing headers
          res.removeHeader('X-Powered-By');
          res.removeHeader('Server');
          
          next();
        });
      }
    }
  ],
    define: {
      // Firebase tree shaking
      __FIREBASE_DEFAULTS__: JSON.stringify({
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID
      })
    },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 1 // Reduce from 3 to 1 to prevent hanging
      }
    },
    rollupOptions: {
      external: [
        '@cvplus/core',
        '@cvplus/auth',
        '@cvplus/i18n',
        '@cvplus/logging',
        '@cvplus/multimedia',
        '@cvplus/analytics',
        '@cvplus/premium',
        '@cvplus/recommendations',
        '@cvplus/public-profiles',
        '@cvplus/admin',
        '@cvplus/workflow',
        '@cvplus/payments',
        '@cvplus/cv-processing',
        '@cvplus/shell',
        '@cvplus/enhancements',
        '@cvplus/processing',
        '@cvplus/processing/frontend',
        /^@cvplus\/.*\/frontend$/,
        /^@cvplus\/.*\/backend$/,
        /^@cvplus\/[^/]+\/.*$/ // Match subpath imports like @cvplus/auth/services/...
      ],
      output: {
        manualChunks: {
          // Core vendors - shared across all microservices
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react'],

          // Core UI microservice - shared infrastructure
          'core-ui': ['./src/microservices/core-ui'],

          // Domain microservices - independent chunks for selective loading
          'auth-ui': ['./src/microservices/auth-ui'],
          'processing-ui': ['./src/microservices/processing-ui'],
          'multimedia-ui': ['./src/microservices/multimedia-ui'],
          'analytics-ui': ['./src/microservices/analytics-ui'],
          'premium-ui': ['./src/microservices/premium-ui'],
          'public-profiles-ui': ['./src/microservices/public-profiles-ui'],
          'admin-ui': ['./src/microservices/admin-ui'],
          'workflow-ui': ['./src/microservices/workflow-ui'],
          'payments-ui': ['./src/microservices/payments-ui']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase limit to reduce warnings
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/functions',
      'firebase/storage',
      'dompurify',
      'zod',
      'recharts',
      'lodash',
      'lodash/uniqBy',
      'lodash/isFunction',
      'lodash/sortBy',
      'lodash/isNil',
      'lodash/throttle',
      'lodash/isObject',
      'lodash/upperFirst',
      'lodash/maxBy',
      'lodash/minBy',
      'lodash/last',
      'lodash/first',
      'lodash/get',
      'lodash/isEqual',
      'lodash/some',
      'lodash/max',
      'lodash/isNaN',
      'lodash/omit',
      'lodash/min',
      'lodash/isNumber',
      'lodash/isString',
      'lodash/range'
    ],
    exclude: [
      'framer-motion',
      'firebase/compat',
      'firebase/analytics',
      'firebase/messaging',
      'firebase/performance'
    ]
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@/components': new URL('./src/components', import.meta.url).pathname,
      '@/hooks': new URL('./src/hooks', import.meta.url).pathname,
      '@/contexts': new URL('./src/contexts', import.meta.url).pathname,
      '@/types': new URL('./src/types', import.meta.url).pathname,
      '@/utils': new URL('./src/utils', import.meta.url).pathname,
      '@/providers': new URL('./src/providers', import.meta.url).pathname,

      // Microservices alias mappings
      '@/microservices': new URL('./src/microservices', import.meta.url).pathname,
      '@/auth-ui': new URL('./src/microservices/auth-ui', import.meta.url).pathname,
      '@/processing-ui': new URL('./src/microservices/processing-ui', import.meta.url).pathname,
      '@/multimedia-ui': new URL('./src/microservices/multimedia-ui', import.meta.url).pathname,
      '@/analytics-ui': new URL('./src/microservices/analytics-ui', import.meta.url).pathname,
      '@/premium-ui': new URL('./src/microservices/premium-ui', import.meta.url).pathname,
      '@/public-profiles-ui': new URL('./src/microservices/public-profiles-ui', import.meta.url).pathname,
      '@/admin-ui': new URL('./src/microservices/admin-ui', import.meta.url).pathname,
      '@/workflow-ui': new URL('./src/microservices/workflow-ui', import.meta.url).pathname,
      '@/payments-ui': new URL('./src/microservices/payments-ui', import.meta.url).pathname,
      '@/core-ui': new URL('./src/microservices/core-ui', import.meta.url).pathname
    }
  },
  // Environment variable prefixes that should be exposed to the client
  envPrefix: ['VITE_']
})
