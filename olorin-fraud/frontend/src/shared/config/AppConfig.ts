/**
 * Application Configuration
 *
 * Configuration loader with Zod validation following SYSTEM MANDATE compliance.
 * All values loaded from environment variables with fail-fast validation.
 */

import { z } from 'zod';

/**
 * Environment schema
 */
const EnvironmentSchema = z.enum(['production', 'staging', 'development', 'test']);

/**
 * Features configuration schema
 */
const FeaturesConfigSchema = z.object({
  enableRag: z.boolean(),
  enableRealTimeUpdates: z.boolean(),
  enableMicroservices: z.boolean(),
  enableWizard: z.boolean(),
  enableTemplates: z.boolean(),
  enableMultiEntity: z.boolean()
});

/**
 * UI configuration schema
 */
const UIConfigSchema = z.object({
  paginationSize: z.number().int().positive(),
  requestTimeoutMs: z.number().int().positive(),
  maxEntities: z.number().int().positive(),
  maxTools: z.number().int().positive()
});

/**
 * Wizard configuration schema
 */
const WizardConfigSchema = z.object({
  autoSaveIntervalMs: z.number().int().positive(),
  validationDebounceMs: z.number().int().positive(),
  progressUpdateIntervalMs: z.number().int().positive(),
  defaultRiskThreshold: z.number().int().min(0).max(100),
  defaultCorrelationMode: z.enum(['AND', 'OR']),
  defaultExecutionMode: z.enum(['parallel', 'sequential'])
});

/**
 * Event bus configuration schema
 */
const EventBusConfigSchema = z.object({
  maxQueueSize: z.number().int().positive(),
  enableLogging: z.boolean()
});

/**
 * Complete application configuration schema
 */
const AppConfigSchema = z.object({
  env: EnvironmentSchema,
  apiBaseUrl: z.string().url(),
  wsBaseUrl: z.string().url(),
  frontendPort: z.number().int().positive(),
  features: FeaturesConfigSchema,
  ui: UIConfigSchema,
  wizard: WizardConfigSchema,
  eventBus: EventBusConfigSchema
});

/**
 * Application configuration type
 */
export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Load and validate application configuration
 */
export function loadConfig(): AppConfig {
  const rawConfig = {
    env: process.env.REACT_APP_ENV || 'development',
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
    wsBaseUrl: process.env.REACT_APP_WS_BASE_URL,
    frontendPort: parseInt(process.env.REACT_APP_FRONTEND_PORT || '3000', 10),
    features: {
      enableRag: process.env.REACT_APP_FEATURE_ENABLE_RAG === 'true',
      enableRealTimeUpdates: process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES === 'true',
      enableMicroservices: process.env.REACT_APP_FEATURE_ENABLE_MICROSERVICES === 'true',
      enableWizard: process.env.REACT_APP_FEATURE_ENABLE_WIZARD === 'true',
      enableTemplates: process.env.REACT_APP_FEATURE_ENABLE_TEMPLATES === 'true',
      enableMultiEntity: process.env.REACT_APP_FEATURE_ENABLE_MULTI_ENTITY === 'true'
    },
    ui: {
      paginationSize: parseInt(process.env.REACT_APP_PAGINATION_SIZE || '20', 10),
      requestTimeoutMs: parseInt(process.env.REACT_APP_REQUEST_TIMEOUT_MS || '30000', 10),
      maxEntities: parseInt(process.env.REACT_APP_MAX_ENTITIES || '10', 10),
      maxTools: parseInt(process.env.REACT_APP_MAX_TOOLS || '20', 10)
    },
    wizard: {
      autoSaveIntervalMs: parseInt(process.env.REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS || '30000', 10),
      validationDebounceMs: parseInt(process.env.REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS || '500', 10),
      progressUpdateIntervalMs: parseInt(process.env.REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS || '5000', 10),
      defaultRiskThreshold: parseInt(process.env.REACT_APP_DEFAULT_RISK_THRESHOLD || '50', 10),
      defaultCorrelationMode: (process.env.REACT_APP_DEFAULT_CORRELATION_MODE || 'OR') as 'AND' | 'OR',
      defaultExecutionMode: (process.env.REACT_APP_DEFAULT_EXECUTION_MODE || 'parallel') as 'parallel' | 'sequential'
    },
    eventBus: {
      maxQueueSize: parseInt(process.env.REACT_APP_EVENT_BUS_MAX_QUEUE_SIZE || '1000', 10),
      enableLogging: process.env.REACT_APP_EVENT_BUS_ENABLE_LOGGING === 'true'
    }
  };

  const parsed = AppConfigSchema.safeParse(rawConfig);

  if (!parsed.success) {
    const errors = parsed.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
    console.error('[Config] Validation failed:');
    console.error(errors);
    throw new Error(`Invalid configuration – refusing to start.\n${errors}`);
  }

  return parsed.data;
}

/**
 * Global configuration instance
 */
let globalConfig: AppConfig | null = null;

/**
 * Get or load global configuration
 */
export function getConfig(): AppConfig {
  if (!globalConfig) {
    globalConfig = loadConfig();
  }
  return globalConfig;
}

/**
 * Reset global configuration (for testing)
 */
export function resetConfig(): void {
  globalConfig = null;
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  const config = getConfig();
  return config.features[feature];
}

/**
 * Get API endpoint URL
 */
export function getApiUrl(path: string): string {
  const config = getConfig();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.apiBaseUrl}${cleanPath}`;
}

/**
 * Get WebSocket URL
 */
export function getWsUrl(path?: string): string {
  const config = getConfig();
  if (!path) return config.wsBaseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${config.wsBaseUrl}${cleanPath}`;
}
