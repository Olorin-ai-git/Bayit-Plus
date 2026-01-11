/**
 * Mobile App Configuration
 * Extends shared config pattern with mobile-specific settings
 */

// Get app mode from environment or default to production
const APP_MODE: 'demo' | 'production' = (process.env.APP_MODE as 'demo' | 'production') || 'production';

export const isDemo = APP_MODE === 'demo';
export const isProduction = APP_MODE === 'production';

export const config = {
  mode: APP_MODE,
  isDemo,
  isProduction,

  api: {
    enabled: !isDemo,
    failFast: isProduction,
    timeout: isProduction ? 5000 : 30000,
  },

  mock: {
    enabled: isDemo,
    delay: isDemo ? 300 : 0,
  },

  features: {
    morningRitual: true,
    trendingTopics: true,
    interactiveSubtitles: true,
    watchParty: true,
    dualClock: true,
    aiChapters: true,
    hebronicsVoice: true,
    // Mobile-specific features
    pipWidgets: true,
    voiceCommands: true,
    wakeWord: true,
    proactiveAI: true,
    sharePlay: true,
    carPlay: true,
    homeScreenWidgets: true,
    siriShortcuts: true,
  },

  // Mobile-specific settings
  mobile: {
    maxConcurrentWidgets: 2,
    widgetEdgeSnapping: true,
    hapticFeedback: true,
    backgroundAudio: true,
    pictureInPicture: true,
  },

  // Voice settings
  voice: {
    enabled: true,
    wakeWordEnabled: true,
    alwaysOnListening: false, // User-configurable
    languages: ['he', 'en', 'es'],
    defaultLanguage: 'he',
  },
};

export default config;
