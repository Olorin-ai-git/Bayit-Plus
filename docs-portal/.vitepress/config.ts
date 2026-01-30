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
        text: 'Testing',
        items: [
          { text: 'Testing Strategy', link: '/testing/TESTING_STRATEGY' },
          { text: 'CI/CD', link: '/deployment/CI_CD_PIPELINE' },
        ]
      },
    ],

    sidebar: {
      '/guides/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Startup Guide', link: '/guides/STARTUP_GUIDE' },
            { text: 'Contributing', link: '/guides/CONTRIBUTING' },
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
          text: 'Features',
          items: [
            { text: 'i18n Complete Guide', link: '/guides/I18N_COMPLETE_GUIDE' },
            { text: 'Accessibility', link: '/guides/ACCESSIBILITY_GUIDE' },
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
            { text: 'Authentication', link: '/api/AUTHENTICATION' },
          ]
        },
        {
          text: 'Features API',
          items: [
            { text: 'AI Features', link: '/api/AI_API_REFERENCE' },
            { text: 'Channel Chat', link: '/api/CHANNEL_CHAT_API' },
            { text: 'Catch-Up', link: '/api/CATCH_UP_API' },
            { text: 'Voice API', link: '/api/VOICE_API_REFERENCE' },
          ]
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'System Overview', link: '/architecture/SYSTEM_OVERVIEW' },
            { text: 'Component Architecture', link: '/architecture/COMPONENT_ARCHITECTURE' },
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
          text: 'Deployment',
          items: [
            { text: 'Deployment Guide', link: '/deployment/DEPLOYMENT_GUIDE' },
            { text: 'CI/CD Pipeline', link: '/deployment/CI_CD_PIPELINE' },
            { text: 'Secrets Management', link: '/deployment/SECRETS_MANAGEMENT' },
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
