/**
 * App Configuration
 * Controls demo mode vs production mode behavior.
 *
 * DEMO MODE: Uses only mock data, no real API calls
 * PRODUCTION MODE: Uses only API data, fails fast, no mocks
 */

// Set this based on environment or build flag
export const APP_MODE = import.meta.env.VITE_APP_MODE || 'demo';

export const isDemo = APP_MODE === 'demo';
export const isProduction = APP_MODE === 'production';

// Strict mode settings
export const config = {
  mode: APP_MODE,
  isDemo,
  isProduction,

  // API settings
  api: {
    // In demo mode, don't make real API calls
    enabled: !isDemo,
    // In production, fail fast on API errors
    failFast: isProduction,
    // Timeout in ms
    timeout: isProduction ? 5000 : 30000,
  },

  // Mock data settings
  mock: {
    // In demo mode, always use mock data
    enabled: isDemo,
    // Simulate network delay in demo mode (ms)
    delay: isDemo ? 300 : 0,
  },

  // Feature flags
  features: {
    morningRitual: true,
    trendingTopics: true,
    interactiveSubtitles: true,
    watchParty: true,
    dualClock: true,
    aiChapters: true,
    hebronicsVoice: true,
  },
};

// Log mode on startup
console.log(`🎬 Bayit+ running in ${APP_MODE.toUpperCase()} mode`);

export default config;
