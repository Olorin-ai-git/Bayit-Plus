import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Bayit+ Documentation",
  description: "Complete documentation for the Bayit+ streaming platform",
  base: "/",
  srcDir: "../docs",
  srcExclude: ["**/templates/**", "**/implementation/**", "**/reviews/**"],
  ignoreDeadLinks: true,
  outDir: ".vitepress/dist",

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    ["meta", { name: "theme-color", content: "#0a0a0a" }],
    ["meta", { name: "og:type", content: "website" }],
    ["meta", { name: "og:locale", content: "en" }],
    ["meta", { name: "og:site_name", content: "Bayit+ Documentation" }],
    // Plausible Analytics (privacy-friendly)
    [
      "script",
      {
        defer: "",
        "data-domain": "docs.bayitplus.com",
        src: "https://plausible.io/js/script.js",
      },
    ],
  ],

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "Bayit+ Docs",

    nav: [
      { text: "Home", link: "/" },
      {
        text: "Guides",
        items: [
          { text: "Getting Started", link: "/guides/STARTUP_GUIDE" },
          { text: "Web Development", link: "/guides/WEB_DEVELOPMENT_GUIDE" },
          {
            text: "Mobile Web App (m.bayit.tv)",
            link: "/guides/MOBILE_WEB_APP_GUIDE",
          },
          {
            text: "Mobile Development",
            link: "/guides/MOBILE_DEVELOPMENT_GUIDE",
          },
          { text: "tvOS Development", link: "/guides/TVOS_DEVELOPMENT_GUIDE" },
          { text: "Zeh Ani User Guide", link: "/guides/ZEH_ANI_USER_GUIDE" },
          {
            text: "Family Controls",
            link: "/guides/FAMILY_CONTROLS_USER_GUIDE",
          },
          { text: "Troubleshooting", link: "/guides/TROUBLESHOOTING" },
          { text: "i18n Guide", link: "/guides/I18N_COMPLETE_GUIDE" },
        ],
      },
      {
        text: "API",
        items: [
          { text: "API Overview", link: "/api/API_OVERVIEW" },
          { text: "Authentication API", link: "/api/AUTH_API_REFERENCE" },
          { text: "Content & Search API", link: "/api/CONTENT_API_REFERENCE" },
          { text: "User Management API", link: "/api/USER_API_REFERENCE" },
          { text: "Media & Live TV API", link: "/api/MEDIA_API_REFERENCE" },
          { text: "Social & Gaming API", link: "/api/SOCIAL_API_REFERENCE" },
          {
            text: "Features & Cultural API",
            link: "/api/FEATURES_API_REFERENCE",
          },
          { text: "Beta 500 API", link: "/api/BETA_API_REFERENCE" },
          { text: "WebSocket API", link: "/api/WEBSOCKET_API_REFERENCE" },
          { text: "AI Features API", link: "/api/AI_API_REFERENCE" },
          { text: "Channel Chat API", link: "/api/CHANNEL_CHAT_API" },
          { text: "Catch-Up API", link: "/api/CATCH_UP_API" },
          { text: "Voice API", link: "/api/VOICE_API_REFERENCE" },
        ],
      },
      {
        text: "Architecture",
        items: [
          { text: "System Overview", link: "/architecture/SYSTEM_OVERVIEW" },
          {
            text: "Database Schema",
            link: "/technical/DATABASE_SCHEMA_REFERENCE",
          },
          {
            text: "Shared Components",
            link: "/technical/SHARED_COMPONENTS_REFERENCE",
          },
        ],
      },
      {
        text: "Features",
        items: [
          {
            text: "AI Features Overview",
            link: "/features/AI_FEATURES_OVERVIEW",
          },
          {
            text: "VOD Avatar Interaction",
            link: "/features/VOD_AVATAR_INTERACTION",
          },
          { text: "Pause & Ask", link: "/features/PAUSE_AND_ASK" },
          {
            text: "Subtitle System Enhancements",
            link: "/features/SUBTITLE_SYSTEM_ENHANCEMENTS",
          },
          {
            text: "Live Translation",
            link: "/features/LIVE_TRANSLATION_EXPANSION",
          },
        ],
      },
      {
        text: "Deployment",
        items: [
          {
            text: "Secrets Management",
            link: "/deployment/SECRETS_MANAGEMENT",
          },
          {
            text: "Firebase Deployment",
            link: "/deployment/FIREBASE_DEPLOYMENT",
          },
          { text: "LLM Configuration", link: "/deployment/LLM_CONFIGURATION" },
        ],
      },
      {
        text: "Marketing",
        items: [
          { text: "Zeh Ani One-Pager", link: "/marketing/ZEH_ANI_ONE_PAGER" },
          {
            text: "Beta 500 Storytelling",
            link: "/marketing/BETA_500_STORYTELLING",
          },
          {
            text: "tvOS Marketing Assets",
            link: "/marketing/BAYIT_PLUS_TVOS_MARKETING_ASSETS",
          },
          {
            text: "Visual Assets Specs",
            link: "/marketing/VISUAL_ASSETS_SPECIFICATIONS",
          },
        ],
      },
      {
        text: "Design",
        items: [
          { text: "WCAG AA Color Tokens", link: "/design/COLOR_TOKENS_WCAG" },
        ],
      },
      {
        text: "Downloads",
        link: "/downloads/USER_GUIDE_DOWNLOADS",
      },
    ],

    sidebar: {
      "/guides/": [
        {
          text: "Getting Started",
          items: [
            { text: "Startup Guide", link: "/guides/STARTUP_GUIDE" },
            { text: "Installation Guide", link: "/guides/INSTALLATION_GUIDE" },
            { text: "Deployment Guide", link: "/guides/DEPLOYMENT_GUIDE" },
          ],
        },
        {
          text: "Development Guides",
          items: [
            { text: "Web Development", link: "/guides/WEB_DEVELOPMENT_GUIDE" },
            {
              text: "Mobile Web App (m.bayit.tv)",
              link: "/guides/MOBILE_WEB_APP_GUIDE",
            },
            {
              text: "Mobile Development (Native)",
              link: "/guides/MOBILE_DEVELOPMENT_GUIDE",
            },
            {
              text: "tvOS Development",
              link: "/guides/TVOS_DEVELOPMENT_GUIDE",
            },
          ],
        },
        {
          text: "Operations",
          items: [
            {
              text: "Regenerate Interaction Videos",
              link: "/guides/REGENERATE_INTERACTION_VIDEOS",
            },
          ],
        },
        {
          text: "AI Integration",
          items: [
            { text: "Web AI Integration", link: "/guides/AI_INTEGRATION_WEB" },
            {
              text: "Mobile AI Integration",
              link: "/guides/AI_INTEGRATION_MOBILE",
            },
            {
              text: "tvOS AI Integration",
              link: "/guides/AI_INTEGRATION_TVOS",
            },
            { text: "AI Troubleshooting", link: "/guides/AI_TROUBLESHOOTING" },
          ],
        },
        {
          text: "User Guides",
          items: [
            { text: "Zeh Ani (It's Me)", link: "/guides/ZEH_ANI_USER_GUIDE" },
            {
              text: "Family Controls",
              link: "/guides/FAMILY_CONTROLS_USER_GUIDE",
            },
            {
              text: "Beta 500 User Manual",
              link: "/guides/BETA_500_USER_MANUAL",
            },
            {
              text: "i18n Complete Guide",
              link: "/guides/I18N_COMPLETE_GUIDE",
            },
          ],
        },
        {
          text: "Printable Guides (PDF)",
          items: [
            { text: "All Downloads", link: "/downloads/USER_GUIDE_DOWNLOADS" },
            {
              text: "Zeh Ani Guide",
              link: "/downloads/Bayit_Plus_Zeh_Ani_Guide.pdf",
            },
            {
              text: "Family Controls",
              link: "/downloads/Bayit_Plus_Family_Controls_Guide.pdf",
            },
            {
              text: "Beta 500 Manual",
              link: "/downloads/Bayit_Plus_Beta_500_Manual.pdf",
            },
            {
              text: "i18n Guide",
              link: "/downloads/Bayit_Plus_i18n_Guide.pdf",
            },
            {
              text: "Parent & Family (Combined)",
              link: "/downloads/Bayit_Plus_Parent_Family_Guides.pdf",
            },
          ],
        },
        {
          text: "Support",
          items: [
            { text: "Troubleshooting", link: "/guides/TROUBLESHOOTING" },
            {
              text: "Troubleshooting Bayit+",
              link: "/guides/TROUBLESHOOTING_BAYIT",
            },
          ],
        },
      ],
      "/api/": [
        {
          text: "API Overview",
          items: [{ text: "API Overview", link: "/api/API_OVERVIEW" }],
        },
        {
          text: "Endpoint Reference",
          items: [
            {
              text: "Authentication & Security",
              link: "/api/AUTH_API_REFERENCE",
            },
            { text: "Content & Search", link: "/api/CONTENT_API_REFERENCE" },
            { text: "User Management", link: "/api/USER_API_REFERENCE" },
            { text: "Media & Live TV", link: "/api/MEDIA_API_REFERENCE" },
            { text: "Social & Gaming", link: "/api/SOCIAL_API_REFERENCE" },
            {
              text: "Features & Cultural",
              link: "/api/FEATURES_API_REFERENCE",
            },
            { text: "Beta 500 Program", link: "/api/BETA_API_REFERENCE" },
            { text: "WebSocket API", link: "/api/WEBSOCKET_API_REFERENCE" },
          ],
        },
        {
          text: "Feature-Specific APIs",
          items: [
            { text: "AI Features API", link: "/api/AI_API_REFERENCE" },
            { text: "Channel Chat API", link: "/api/CHANNEL_CHAT_API" },
            { text: "Catch-Up API", link: "/api/CATCH_UP_API" },
            { text: "Voice API", link: "/api/VOICE_API_REFERENCE" },
            { text: "Family Controls API", link: "/api/FAMILY_CONTROLS_API" },
          ],
        },
      ],
      "/architecture/": [
        {
          text: "Architecture",
          items: [
            {
              text: "Unified Voice Architecture",
              link: "/architecture/UNIFIED_VOICE_ARCHITECTURE",
            },
            {
              text: "Olorin Ecosystem Analysis",
              link: "/architecture/OLORIN_ECOSYSTEM_ARCHITECTURE_ANALYSIS",
            },
          ],
        },
      ],
      "/technical/": [
        {
          text: "Technical Reference",
          items: [
            {
              text: "Database Schema",
              link: "/technical/DATABASE_SCHEMA_REFERENCE",
            },
            {
              text: "Shared Components",
              link: "/technical/SHARED_COMPONENTS_REFERENCE",
            },
          ],
        },
      ],
      "/testing/": [
        {
          text: "Testing",
          items: [
            { text: "Testing Strategy", link: "/testing/TESTING_STRATEGY" },
          ],
        },
      ],
      "/deployment/": [
        {
          text: "Deployment Guides",
          items: [
            {
              text: "Secrets Management",
              link: "/deployment/SECRETS_MANAGEMENT",
            },
            {
              text: "Firebase Deployment",
              link: "/deployment/FIREBASE_DEPLOYMENT",
            },
            {
              text: "LLM Configuration",
              link: "/deployment/LLM_CONFIGURATION",
            },
          ],
        },
        {
          text: "GCloud Secrets Configuration",
          items: [
            {
              text: "API Configuration",
              link: "/deployment/GCLOUD_SECRETS_API_CONFIGURATION",
            },
            {
              text: "Beta 500 Configuration",
              link: "/deployment/GCLOUD_SECRETS_BETA_500",
            },
            {
              text: "Payment Flow",
              link: "/deployment/GCLOUD_SECRETS_PAYMENT_FLOW",
            },
          ],
        },
      ],
      "/features/": [
        {
          text: "AI & Avatar",
          items: [
            {
              text: "AI Features Overview",
              link: "/features/AI_FEATURES_OVERVIEW",
            },
            {
              text: "VOD Avatar Interaction",
              link: "/features/VOD_AVATAR_INTERACTION",
            },
            {
              text: "Pause & Ask",
              link: "/features/PAUSE_AND_ASK",
            },
            {
              text: "Regenerate Interaction Videos",
              link: "/guides/REGENERATE_INTERACTION_VIDEOS",
            },
          ],
        },
        {
          text: "Platform Features",
          items: [
            {
              text: "Subtitle System Enhancements",
              link: "/features/SUBTITLE_SYSTEM_ENHANCEMENTS",
            },
            {
              text: "Live Translation Expansion",
              link: "/features/LIVE_TRANSLATION_EXPANSION",
            },
            {
              text: "Subscription Gate",
              link: "/features/SUBSCRIPTION_GATE_IMPLEMENTATION",
            },
          ],
        },
      ],
      "/marketing/": [
        {
          text: "Product Marketing",
          items: [
            { text: "Zeh Ani One-Pager", link: "/marketing/ZEH_ANI_ONE_PAGER" },
            {
              text: "Beta 500 Storytelling",
              link: "/marketing/BETA_500_STORYTELLING",
            },
          ],
        },
        {
          text: "Marketing Assets",
          items: [
            {
              text: "tvOS Marketing Assets",
              link: "/marketing/BAYIT_PLUS_TVOS_MARKETING_ASSETS",
            },
            {
              text: "Visual Assets Specs",
              link: "/marketing/VISUAL_ASSETS_SPECIFICATIONS",
            },
          ],
        },
      ],
      "/design/": [
        {
          text: "Design System",
          items: [
            { text: "WCAG AA Color Tokens", link: "/design/COLOR_TOKENS_WCAG" },
          ],
        },
      ],
      "/downloads/": [
        {
          text: "Printable User Guides",
          items: [
            { text: "All Downloads", link: "/downloads/USER_GUIDE_DOWNLOADS" },
          ],
        },
        {
          text: "Individual Guides",
          items: [
            {
              text: "Zeh Ani Guide (8 pages)",
              link: "/downloads/Bayit_Plus_Zeh_Ani_Guide.pdf",
            },
            {
              text: "Family Controls (14 pages)",
              link: "/downloads/Bayit_Plus_Family_Controls_Guide.pdf",
            },
            {
              text: "Beta 500 Manual (21 pages)",
              link: "/downloads/Bayit_Plus_Beta_500_Manual.pdf",
            },
            {
              text: "i18n Guide (14 pages)",
              link: "/downloads/Bayit_Plus_i18n_Guide.pdf",
            },
          ],
        },
        {
          text: "Combined Guides",
          items: [
            {
              text: "Parent & Family (22 pages)",
              link: "/downloads/Bayit_Plus_Parent_Family_Guides.pdf",
            },
          ],
        },
      ],
    },

    search: {
      provider: "local",
      options: {
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: {
              title: 4,
              text: 2,
              titles: 1,
            },
          },
        },
      },
    },

    socialLinks: [{ icon: "github", link: "https://github.com/bayit-plus" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Bayit+",
    },

    editLink: {
      pattern: "https://github.com/bayit-plus/docs/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    lastUpdated: {
      text: "Updated at",
      formatOptions: {
        dateStyle: "short",
        timeStyle: "short",
      },
    },
  },

  markdown: {
    theme: "github-dark",
    lineNumbers: true,
    config: (md) => {
      // Custom markdown-it plugins can be added here
    },
  },

  vite: {
    server: {
      port: 5173,
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        external: ["vue", "vue/server-renderer"],
      },
    },
  },
});
