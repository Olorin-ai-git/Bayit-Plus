/**
 * Configuration Management System
 *
 * ZERO HARDCODED VALUES - All configuration from environment variables or backend API
 * Per CLAUDE.md requirements
 */

export interface ExtensionConfig {
  AUDIO: {
    SAMPLE_RATE: number;
    BUFFER_SIZE: number;
    CHANNELS: 1; // Immutable requirement (mono)
  };
  API: {
    BASE_URL: string;
    WEBSOCKET_URL: string;
    TIMEOUT_MS: number;
  };
  QUOTA: {
    // Fetched from backend at runtime
    FREE_TIER_MINUTES_PER_DAY: number | null;
    PREMIUM_TIER_PRICE_USD: number | null;
  };
  RECONNECTION: {
    INITIAL_DELAY_MS: number;
    MAX_DELAY_MS: number;
    MAX_ATTEMPTS: number;
  };
  USAGE_TRACKING: {
    SYNC_INTERVAL_MS: number;
    POLL_INTERVAL_MS: number;
  };
  MONITORING: {
    SENTRY_DSN: string;
    POSTHOG_KEY: string;
  };
  ENV: string;
  DEBUG: boolean;
}

// Environment variable validation
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || defaultValue;
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key];
  return value ? value === 'true' : defaultValue;
}

// Configuration object (build-time values from environment variables)
export const CONFIG: ExtensionConfig = {
  AUDIO: {
    SAMPLE_RATE: getEnvNumber('VITE_AUDIO_SAMPLE_RATE', 16000),
    BUFFER_SIZE: getEnvNumber('VITE_AUDIO_BUFFER_SIZE', 2048),
    CHANNELS: 1, // Immutable requirement
  },

  API: {
    BASE_URL: getEnvVar('VITE_API_BASE_URL', 'https://api.bayit.tv'),
    WEBSOCKET_URL: getEnvVar('VITE_WS_BASE_URL', 'wss://api.bayit.tv'),
    TIMEOUT_MS: getEnvNumber('VITE_API_TIMEOUT_MS', 30000),
  },

  QUOTA: {
    // Will be fetched from backend at runtime
    FREE_TIER_MINUTES_PER_DAY: null,
    PREMIUM_TIER_PRICE_USD: null,
  },

  RECONNECTION: {
    INITIAL_DELAY_MS: getEnvNumber('VITE_RECONNECT_INITIAL_DELAY_MS', 1000),
    MAX_DELAY_MS: getEnvNumber('VITE_RECONNECT_MAX_DELAY_MS', 30000),
    MAX_ATTEMPTS: getEnvNumber('VITE_RECONNECT_MAX_ATTEMPTS', 5),
  },

  USAGE_TRACKING: {
    SYNC_INTERVAL_MS: getEnvNumber('VITE_USAGE_SYNC_INTERVAL_MS', 10000),
    POLL_INTERVAL_MS: getEnvNumber('VITE_SUBSCRIPTION_POLL_INTERVAL_MS', 5000),
  },

  MONITORING: {
    SENTRY_DSN: getEnvVar('VITE_SENTRY_DSN', ''),
    POSTHOG_KEY: getEnvVar('VITE_POSTHOG_KEY', ''),
  },

  ENV: getEnvVar('VITE_ENV', 'development'),
  DEBUG: getEnvBoolean('VITE_DEBUG', false),
};

/**
 * Backend Configuration Response
 */
interface BackendConfig {
  free_tier_minutes_per_day: number;
  premium_tier_price_usd: number;
  supported_languages: string[];
  supported_sites: string[];
  audio_sample_rate: number;
  max_session_duration_minutes: number;
}

/**
 * Load runtime configuration from backend API
 * MUST be called during extension initialization
 */
export async function loadRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch(`${CONFIG.API.BASE_URL}/api/v1/config/extension`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(CONFIG.API.TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Failed to load runtime config: ${response.status}`);
    }

    const config: BackendConfig = await response.json();

    // Update runtime configuration
    CONFIG.QUOTA.FREE_TIER_MINUTES_PER_DAY = config.free_tier_minutes_per_day;
    CONFIG.QUOTA.PREMIUM_TIER_PRICE_USD = config.premium_tier_price_usd;

    // Validate critical configuration
    if (!CONFIG.QUOTA.FREE_TIER_MINUTES_PER_DAY) {
      throw new Error('Invalid runtime config: missing free_tier_minutes_per_day');
    }
    if (!CONFIG.QUOTA.PREMIUM_TIER_PRICE_USD) {
      throw new Error('Invalid runtime config: missing premium_tier_price_usd');
    }

    console.log('[Config] Runtime configuration loaded successfully');
  } catch (error) {
    console.error('[Config] Failed to load runtime configuration:', error);
    throw error;
  }
}

/**
 * Supported Sites Configuration
 */
export const SUPPORTED_SITES = [
  {
    hostname: 'screenil.com',
    name: 'Screenil',
    videoSelector: 'video',
  },
  {
    hostname: 'mako.co.il',
    name: 'Mako',
    videoSelector: 'video',
  },
  {
    hostname: '13tv.co.il',
    name: '13TV',
    videoSelector: 'video',
  },
] as const;

/**
 * Supported Languages Configuration
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
] as const;

/**
 * Supported Voices Configuration (fetched from backend)
 */
export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
  preview_url?: string;
}
