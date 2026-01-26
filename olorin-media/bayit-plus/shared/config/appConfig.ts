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

// Read from environment variable (NO hardcoded values allowed)
// Webpack DefinePlugin will replace process.env.VITE_APP_MODE at build time
declare const process: any;

// Important: keep this typed as AppMode (not the narrowed literal 'production'),
// otherwise TS can flag comparisons like `APP_MODE === 'demo'` as impossible.
export const APP_MODE = (process.env.VITE_APP_MODE || 'production') as AppMode;

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
    sceneSearch: true,
  },

  // Scene search settings
  sceneSearch: {
    defaultLimit: 20,
    defaultMinScore: 0.5,
    minQueryLength: 2,
  },

  // Media assets - from environment variables with fallback
  // Note: import.meta is not supported by Hermes (React Native), so we only use process.env
  media: {
    // Marty Jr. from Back to the Future Part 2 (plays before widgets intro)
    martyJrBttf2Video: (typeof process !== 'undefined' && process.env.REACT_APP_MARTY_JR_BTTF2_VIDEO_URL)
      || '/assets/video/intro/Marty-Jr.mp4',
    widgetsIntroVideo: (typeof process !== 'undefined' && process.env.REACT_APP_WIDGETS_INTRO_VIDEO_URL)
      || '/media/widgets-intro.mp4',
    olorinAvatarIntro: (typeof process !== 'undefined' && process.env.REACT_APP_OLORIN_AVATAR_INTRO_VIDEO_URL)
      || '/media/olorin-avatar-intro.mp4',
  },
};

// API Base URL - from environment variable or default
// Note: For web (Vite), env vars are injected at build time via define config
export const API_BASE_URL = (typeof process !== 'undefined' && process.env.VITE_API_URL)
  || (typeof process !== 'undefined' && process.env.REACT_APP_API_URL)
  || '/api/v1';

export default config;
