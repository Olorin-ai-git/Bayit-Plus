import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Bayit+ Documentation',
  description: 'Complete documentation for the Bayit+ streaming platform',
  base: '/docs/',
  srcDir: '../docs',
  outDir: '.vitepress/dist',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#0a0a0a' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'Bayit+ Documentation' }],
    // Plausible Analytics (privacy-friendly)
    ['script', {
      defer: '',
      'data-domain': 'docs.bayitplus.com',
      src: 'https://plausible.io/js/script.js'
    }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Bayit+ Docs',

    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Guides',
        items: [
          { text: 'Getting Started', link: '/guides/STARTUP_GUIDE' },
          { text: 'Web Development', link: '/guides/WEB_DEVELOPMENT_GUIDE' },
          { text: 'Mobile Development', link: '/guides/MOBILE_DEVELOPMENT_GUIDE' },
          { text: 'tvOS Development', link: '/guides/TVOS_DEVELOPMENT_GUIDE' },
          { text: 'Troubleshooting', link: '/guides/TROUBLESHOOTING' },
          { text: 'i18n Guide', link: '/guides/I18N_COMPLETE_GUIDE' },
        ]
      },
      {
        text: 'API',
        items: [
          { text: 'API Overview', link: '/api/API_OVERVIEW' },
          { text: 'AI Features API', link: '/api/AI_API_REFERENCE' },
          { text: 'Channel Chat API', link: '/api/CHANNEL_CHAT_API' },
          { text: 'Catch-Up API', link: '/api/CATCH_UP_API' },
          { text: 'Voice API', link: '/api/VOICE_API_REFERENCE' },
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'System Overview', link: '/architecture/SYSTEM_OVERVIEW' },
          { text: 'Database Schema', link: '/technical/DATABASE_SCHEMA_REFERENCE' },
          { text: 'Shared Components', link: '/technical/SHARED_COMPONENTS_REFERENCE' },
        ]
      },
      {
        text: 'Features',
        items: [
          { text: 'AI Features Overview', link: '/features/AI_FEATURES_OVERVIEW' },
          { text: 'Subtitle System Enhancements', link: '/features/SUBTITLE_SYSTEM_ENHANCEMENTS' },
          { text: 'Live Translation', link: '/features/LIVE_TRANSLATION_EXPANSION' },
        ]
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Secrets Management', link: '/deployment/SECRETS_MANAGEMENT' },
          { text: 'Firebase Deployment', link: '/deployment/FIREBASE_DEPLOYMENT' },
          { text: 'LLM Configuration', link: '/deployment/LLM_CONFIGURATION' },
        ]
      },
      {
        text: 'Design',
        items: [
          { text: 'WCAG AA Color Tokens', link: '/design/COLOR_TOKENS_WCAG' },
        ]
      },
    ],

    sidebar: {
      '/guides/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Startup Guide', link: '/guides/STARTUP_GUIDE' },
            { text: 'Installation Guide', link: '/guides/INSTALLATION_GUIDE' },
            { text: 'Deployment Guide', link: '/guides/DEPLOYMENT_GUIDE' },
          ]
        },
        {
          text: 'Development Guides',
          items: [
            { text: 'Web Development', link: '/guides/WEB_DEVELOPMENT_GUIDE' },
            { text: 'Mobile Development', link: '/guides/MOBILE_DEVELOPMENT_GUIDE' },
            { text: 'tvOS Development', link: '/guides/TVOS_DEVELOPMENT_GUIDE' },
          ]
        },
        {
          text: 'AI Integration',
          items: [
            { text: 'Web AI Integration', link: '/guides/AI_INTEGRATION_WEB' },
            { text: 'Mobile AI Integration', link: '/guides/AI_INTEGRATION_MOBILE' },
            { text: 'tvOS AI Integration', link: '/guides/AI_INTEGRATION_TVOS' },
            { text: 'AI Troubleshooting', link: '/guides/AI_TROUBLESHOOTING' },
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'i18n Complete Guide', link: '/guides/I18N_COMPLETE_GUIDE' },
            { text: 'Beta 500 User Manual', link: '/guides/BETA_500_USER_MANUAL' },
          ]
        },
        {
          text: 'Support',
          items: [
            { text: 'Troubleshooting', link: '/guides/TROUBLESHOOTING' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Documentation',
          items: [
            { text: 'API Overview', link: '/api/API_OVERVIEW' },
            { text: 'AI Features API', link: '/api/AI_API_REFERENCE' },
            { text: 'Voice API', link: '/api/VOICE_API_REFERENCE' },
          ]
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Unified Voice Architecture', link: '/architecture/UNIFIED_VOICE_ARCHITECTURE' },
            { text: 'Olorin Ecosystem Analysis', link: '/architecture/OLORIN_ECOSYSTEM_ARCHITECTURE_ANALYSIS' },
          ]
        },
      ],
      '/technical/': [
        {
          text: 'Technical Reference',
          items: [
            { text: 'Database Schema', link: '/technical/DATABASE_SCHEMA_REFERENCE' },
            { text: 'Shared Components', link: '/technical/SHARED_COMPONENTS_REFERENCE' },
          ]
        },
      ],
      '/testing/': [
        {
          text: 'Testing',
          items: [
            { text: 'Testing Strategy', link: '/testing/TESTING_STRATEGY' },
          ]
        },
      ],
      '/deployment/': [
        {
          text: 'Deployment Guides',
          items: [
            { text: 'Secrets Management', link: '/deployment/SECRETS_MANAGEMENT' },
            { text: 'Firebase Deployment', link: '/deployment/FIREBASE_DEPLOYMENT' },
            { text: 'LLM Configuration', link: '/deployment/LLM_CONFIGURATION' },
          ]
        },
        {
          text: 'GCloud Secrets Configuration',
          items: [
            { text: 'API Configuration', link: '/deployment/GCLOUD_SECRETS_API_CONFIGURATION' },
            { text: 'Beta 500 Configuration', link: '/deployment/GCLOUD_SECRETS_BETA_500' },
            { text: 'Payment Flow', link: '/deployment/GCLOUD_SECRETS_PAYMENT_FLOW' },
          ]
        },
      ],
      '/features/': [
        {
          text: 'Platform Features',
          items: [
            { text: 'AI Features Overview', link: '/features/AI_FEATURES_OVERVIEW' },
            { text: 'Subtitle System Enhancements', link: '/features/SUBTITLE_SYSTEM_ENHANCEMENTS' },
            { text: 'Live Translation Expansion', link: '/features/LIVE_TRANSLATION_EXPANSION' },
            { text: 'Subscription Gate', link: '/features/SUBSCRIPTION_GATE_IMPLEMENTATION' },
          ]
        },
      ],
      '/design/': [
        {
          text: 'Design System',
          items: [
            { text: 'WCAG AA Color Tokens', link: '/design/COLOR_TOKENS_WCAG' },
          ]
        },
      ],
    },

    search: {
      provider: 'local',
      options: {
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: {
              title: 4,
              text: 2,
              titles: 1
            }
          }
        }
      }
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/bayit-plus' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Bayit+'
    },

    editLink: {
      pattern: 'https://github.com/bayit-plus/docs/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  },

  markdown: {
    theme: 'github-dark',
    lineNumbers: true,
    config: (md) => {
      // Custom markdown-it plugins can be added here
    }
  },

  vite: {
    server: {
      port: 5173
    },
    build: {
      chunkSizeWarningLimit: 1000
    }
  }
})
