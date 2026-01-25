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

// Single source of truth: .env file (VITE_APP_MODE)
// TV builds use demo mode
// Vite exposes env vars through import.meta.env
const getEnvMode = () => {
  // Check if import.meta.env is available (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_APP_MODE || import.meta.env.MODE || 'development';
  }
  // Fallback for non-Vite environments
  return 'development';
};

export const APP_MODE = IS_TV_BUILD ? 'demo' : getEnvMode();

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
if (APP_MODE && typeof APP_MODE === 'string') {
  logger.info(`Bayit+ running in ${APP_MODE.toUpperCase()} mode`, 'appConfig');
} else {
  logger.warn('APP_MODE is not set, defaulting to development mode', 'appConfig');
}

export default config;
