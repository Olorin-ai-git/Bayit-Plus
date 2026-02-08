/**
 * App Configuration
 * Controls production mode behavior.
 */

import logger from '../utils/logger';

// Set this based on environment or build flag
export const APP_MODE: 'development' | 'production' = 'production';

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
  },
};

// Log mode on startup
logger.info(`Bayit+ TV running in ${APP_MODE.toUpperCase()} mode`, 'AppConfig');

export default config;
