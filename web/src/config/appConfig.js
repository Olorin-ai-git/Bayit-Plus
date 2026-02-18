/**
 * App Configuration
 * Controls production mode behavior.
 */

import logger from '@/utils/logger';

// Single source of truth: .env file (VITE_APP_MODE)
// Vite exposes env vars through import.meta.env
const getEnvMode = () => {
  // Check if import.meta.env is available (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_APP_MODE || import.meta.env.MODE || 'development';
  }
  // Fallback for non-Vite environments
  return 'development';
};

export const APP_MODE = getEnvMode();

export const isProduction = APP_MODE === 'production';

// App version from build-time env
const getVersion = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_APP_VERSION || '1.0.0';
  }
  return '1.0.0';
};

// Strict mode settings
export const config = {
  mode: APP_MODE,
  isProduction,
  version: getVersion(),

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

  // External links
  links: {
    termsOfService: 'https://bayit.tv/terms',
    privacyPolicy: 'https://bayit.tv/privacy',
    openSource: 'https://bayit.tv/licenses',
    helpCenter: 'https://bayit.tv/help',
    feedback: 'https://bayit.tv/feedback',
    website: 'https://bayit.tv',
  },
};

// Log mode on startup
if (APP_MODE && typeof APP_MODE === 'string') {
  logger.info(`Bayit+ running in ${APP_MODE.toUpperCase()} mode`, 'appConfig');
} else {
  logger.warn('APP_MODE is not set, defaulting to development mode', 'appConfig');
}

export default config;
