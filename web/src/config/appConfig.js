/**
 * App Configuration
 * Controls demo mode vs production mode behavior.
 *
 * DEMO MODE: Uses only mock data, no real API calls
 * PRODUCTION MODE: Uses only API data, fails fast, no mocks
 */

import logger from '@/utils/logger';

// Check if this is a TV build (set by webpack DefinePlugin)
// eslint-disable-next-line no-undef
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Set this based on environment or build flag
// TV builds ALWAYS use demo mode since there's no accessible backend
export const APP_MODE = IS_TV_BUILD ? 'demo' : (import.meta.env.VITE_APP_MODE || 'demo');

export const isDemo = APP_MODE === 'demo' || IS_TV_BUILD;
export const isProduction = APP_MODE === 'production' && !IS_TV_BUILD;

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
logger.info(`Bayit+ running in ${APP_MODE.toUpperCase()} mode`, 'appConfig');

export default config;
