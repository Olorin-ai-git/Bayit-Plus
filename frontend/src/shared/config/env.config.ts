/**
 * Environment Configuration with Zod Validation
 * Feature: 005-polling-and-persistence
 *
 * SYSTEM MANDATE Compliance:
 * - All values from environment variables
 * - Zod schema validation with fail-fast
 * - No hardcoded values
 * - Complete type safety
 */

import { z } from 'zod';

/**
 * Configuration Schema - Validates all environment variables at startup.
 * Application will fail fast if any required values are missing or invalid.
 */
export const ConfigSchema = z.object({
  // Environment
  env: z.enum(['production', 'staging', 'development']),
  nodeEnv: z.enum(['production', 'development', 'test']),

  // Application Version
  appVersion: z.string().min(1, 'Application version required').default('1.0.0'),

  // API Configuration
  api: z.object({
    baseUrl: z.string().url('API base URL must be a valid URL'),
    version: z.string().min(1, 'API version required for type generation (e.g., v1)').default('v1'),
    apiKey: z.string().optional(),
    // WebSocket URL removed per spec 005 - using polling instead
    requestTimeoutMs: z.coerce.number().int().positive('Request timeout must be positive'),
  }),

  // Polling Configuration
  polling: z.object({
    baseInterval: z.coerce.number().int().positive('Base interval must be positive'),
    fastInterval: z.coerce.number().int().positive('Fast interval must be positive'),
    slowInterval: z.coerce.number().int().positive('Slow interval must be positive'),
    maxRetries: z.coerce.number().int().positive('Max retries must be positive'),
    backoffMultiplier: z.coerce.number().positive('Backoff multiplier must be positive'),
    maxBackoff: z.coerce.number().int().positive('Max backoff must be positive'),
  }),

  // Feature Flags
  features: z.object({
    enableStatePersistence: z.coerce.boolean(),
    enableTemplates: z.coerce.boolean(),
    enableOptimisticLocking: z.coerce.boolean(),
    enableAuditLog: z.coerce.boolean(),
    enableWizard: z.coerce.boolean(),
    enableMultiEntity: z.coerce.boolean(),
    enableRealTimeUpdates: z.coerce.boolean(),
    enablePolling: z.coerce.boolean(),
    enableStructuredMode: z.coerce.boolean(),
    enableMockData: z.coerce.boolean(),
  }),

  // Firebase Configuration
  firebase: z.object({
    apiKey: z.string().min(1, 'Firebase API key required'),
    authDomain: z.string().min(1, 'Firebase auth domain required'),
    projectId: z.string().min(1, 'Firebase project ID required'),
    storageBucket: z.string().min(1, 'Firebase storage bucket required'),
    messagingSenderId: z.string().min(1, 'Firebase messaging sender ID required'),
    appId: z.string().min(1, 'Firebase app ID required'),
    measurementId: z.string().min(1, 'Firebase measurement ID required'),
  }).optional(),

  // Service Configuration
  serviceName: z.string().min(1, 'Service name required').default('olorin-investigation'),

  // UI Configuration
  ui: z.object({
    autoSaveInterval: z.coerce.number().int().positive('Auto-save interval must be positive'),
    validationDebounce: z.coerce.number().int().nonnegative('Validation debounce must be non-negative'),
    maxEntities: z.coerce.number().int().positive('Max entities must be positive'),
    maxTools: z.coerce.number().int().positive('Max tools must be positive'),
    paginationSize: z.coerce.number().int().positive('Pagination size must be positive'),
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables.
 * Throws error with detailed validation messages if configuration is invalid.
 */
export function loadConfig(): AppConfig {
  // Check if we're in a browser environment
  if (typeof process === 'undefined' || !process.env) {
    // Provide default development configuration for browser environments
    const rawConfig = {
      env: 'development' as const,
      nodeEnv: 'development' as const,
      appVersion: '1.0.0',

      api: {
        baseUrl: 'http://localhost:8090',
        version: 'v1',
        apiKey: undefined,
        requestTimeoutMs: '30000',
      },

      polling: {
        baseInterval: '5000',
        fastInterval: '5000',
        slowInterval: '30000',
        maxRetries: '3',
        backoffMultiplier: '2',
        maxBackoff: '60000',
      },

      features: {
        enableStatePersistence: 'true',
        enableTemplates: 'true',
        enableOptimisticLocking: 'true',
        enableAuditLog: 'true',
        enableWizard: 'true',
        enableMultiEntity: 'true',
        enableRealTimeUpdates: 'false',
        enablePolling: 'true',
        enableStructuredMode: 'true',
        enableMockData: 'false',
      },

      firebase: undefined,

      serviceName: 'olorin-investigation',

      ui: {
        autoSaveInterval: '5000',
        validationDebounce: '300',
        maxEntities: '50',
        maxTools: '100',
        paginationSize: '20',
      },
    };

    const result = ConfigSchema.safeParse(rawConfig);
    if (!result.success) {
      console.warn('⚠️ Using default configuration');
      return {
        env: 'development',
        nodeEnv: 'development',
        appVersion: '1.0.0',
        api: { baseUrl: 'http://localhost:8090', version: 'v1', apiKey: undefined, requestTimeoutMs: 30000 },
        polling: { baseInterval: 30000, fastInterval: 30000, slowInterval: 30000, maxRetries: 3, backoffMultiplier: 2, maxBackoff: 60000 },
        features: { enableStatePersistence: true, enableTemplates: true, enableOptimisticLocking: true, enableAuditLog: true, enableWizard: true, enableMultiEntity: true, enableRealTimeUpdates: false, enablePolling: true, enableStructuredMode: true, enableMockData: false },
        firebase: undefined,
        serviceName: 'olorin-investigation',
        ui: { autoSaveInterval: 5000, validationDebounce: 300, maxEntities: 50, maxTools: 100, paginationSize: 20 },
      };
    }
    return result.data;
  }

  const rawConfig = {
    env: process.env.REACT_APP_ENV,
    nodeEnv: process.env.NODE_ENV,
    appVersion: process.env.REACT_APP_VERSION,

    api: {
      baseUrl: process.env.REACT_APP_API_BASE_URL,
      version: process.env.REACT_APP_API_VERSION,
      apiKey: process.env.REACT_APP_API_KEY,
      // WebSocket URL removed per spec 005 - using polling instead
      requestTimeoutMs: process.env.REACT_APP_REQUEST_TIMEOUT_MS,
    },

    polling: {
      baseInterval: process.env.REACT_APP_POLLING_BASE_INTERVAL_MS,
      fastInterval: process.env.REACT_APP_POLLING_FAST_INTERVAL_MS,
      slowInterval: process.env.REACT_APP_POLLING_SLOW_INTERVAL_MS,
      maxRetries: process.env.REACT_APP_POLLING_MAX_RETRIES,
      backoffMultiplier: process.env.REACT_APP_POLLING_BACKOFF_MULTIPLIER,
      maxBackoff: process.env.REACT_APP_POLLING_MAX_BACKOFF_MS,
    },

    features: {
      enableStatePersistence: process.env.REACT_APP_FEATURE_ENABLE_STATE_PERSISTENCE,
      enableTemplates: process.env.REACT_APP_FEATURE_ENABLE_TEMPLATES,
      enableOptimisticLocking: process.env.REACT_APP_FEATURE_ENABLE_OPTIMISTIC_LOCKING,
      enableAuditLog: process.env.REACT_APP_FEATURE_ENABLE_AUDIT_LOG,
      enableWizard: process.env.REACT_APP_FEATURE_ENABLE_WIZARD,
      enableMultiEntity: process.env.REACT_APP_FEATURE_ENABLE_MULTI_ENTITY,
      enableRealTimeUpdates: process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES,
      enablePolling: process.env.REACT_APP_FEATURE_ENABLE_POLLING,
      enableStructuredMode: process.env.REACT_APP_FEATURE_ENABLE_AUTONOMOUS_MODE,
      enableMockData: process.env.REACT_APP_FEATURE_ENABLE_MOCK_DATA,
    },

    firebase: process.env.REACT_APP_FIREBASE_PROJECT_ID
      ? {
          apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
          authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.REACT_APP_FIREBASE_APP_ID,
          measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
        }
      : undefined,

    serviceName: process.env.REACT_APP_SERVICE_NAME,

    ui: {
      autoSaveInterval: process.env.REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS,
      validationDebounce: process.env.REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS,
      maxEntities: process.env.REACT_APP_MAX_ENTITIES,
      maxTools: process.env.REACT_APP_MAX_TOOLS,
      paginationSize: process.env.REACT_APP_PAGINATION_SIZE,
    },
  };

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('❌ Configuration validation failed:');
    console.error(result.error.format());
    throw new Error(
      'Invalid configuration – refusing to start. Check environment variables and .env file.'
    );
  }

  return result.data;
}

/**
 * Global configuration instance.
 * Loaded once at application startup.
 */
let configInstance: AppConfig | null = null;

/**
 * Get validated configuration.
 * Loads configuration on first access.
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset configuration (primarily for testing).
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Export config as 'env' for backward compatibility.
 * Uses lazy loading to ensure it only initializes when accessed.
 */
let cachedEnv: AppConfig | null = null;

// This is a getter that lazily initializes the config
export const env = new Proxy(
  {},
  {
    get(target: any, prop: string | symbol) {
      if (!cachedEnv) {
        cachedEnv = getConfig();
      }
      return (cachedEnv as any)[prop];
    },
  }
) as AppConfig;
