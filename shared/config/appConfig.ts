/**
 * App Configuration
 * Controls demo mode vs production mode behavior.
 *
 * DEMO MODE: Uses only mock data, no real API calls
 * PRODUCTION MODE: Uses only API data, fails fast, no mocks
 */

// Set this based on environment or build flag
// In React Native, we use __DEV__ for development detection
// You can override with a custom env variable if needed
// DEMO MODE: Use demo/mock data for development without backend
export type AppMode = 'demo' | 'production';

// Important: keep this typed as AppMode (not the narrowed literal 'production'),
// otherwise TS can flag comparisons like `APP_MODE === 'demo'` as impossible.
export const APP_MODE = 'production' as AppMode;

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
console.log(`🎬 Bayit+ TV running in ${APP_MODE.toUpperCase()} mode`);

export default config;
