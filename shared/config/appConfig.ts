/**
 * App Configuration
 * Controls production mode behavior.
 */

// Set this based on environment or build flag
// In React Native, we use __DEV__ for development detection
export type AppMode = 'development' | 'production';

// Read from environment variable (NO hardcoded values allowed)
// Webpack DefinePlugin will replace process.env.VITE_APP_MODE at build time
declare const process: any;

export const APP_MODE = (process.env.VITE_APP_MODE || 'production') as AppMode;

export const isProduction = APP_MODE === 'production';

// Strict mode settings
export const config = {
  mode: APP_MODE,
  isProduction,

  // API settings
  api: {
    enabled: true,
    // In production, fail fast on API errors
    failFast: isProduction,
    // Timeout in ms
    timeout: isProduction ? 5000 : 30000,
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
