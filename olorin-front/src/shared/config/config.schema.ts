/**
 * Application Configuration Schema
 * Feature: 004-new-olorin-frontend
 *
 * Complete application configuration with Zod validation.
 * All configuration values from environment variables.
 */

import { z } from 'zod';

/**
 * Application configuration schema
 */
export const ConfigSchema = z.object({
  env: z.enum(['production', 'staging', 'development']),
  apiBaseUrl: z.string().url(),
  wsBaseUrl: z.string().url(),
  frontendPort: z.coerce.number().int().positive(),
  features: z.object({
    enableRag: z.boolean(),
    enableRealTimeUpdates: z.boolean(),
    enableMicroservices: z.boolean(),
    enableWizard: z.boolean(),
    enableTemplates: z.boolean(),
    enableMultiEntity: z.boolean(),
    enableLlmInsights: z.boolean(),
    enableRelationshipGraph: z.boolean()
  }),
  ui: z.object({
    paginationSize: z.coerce.number().int().positive(),
    requestTimeoutMs: z.coerce.number().int().positive()
  }),
  wizard: z.object({
    maxEntities: z.coerce.number().int().positive(),
    maxTools: z.coerce.number().int().positive(),
    defaultRiskThreshold: z.coerce.number().min(0).max(100),
    defaultCorrelationMode: z.enum(['AND', 'OR']),
    defaultExecutionMode: z.enum(['parallel', 'sequential']),
    autoSaveIntervalMs: z.coerce.number().int().positive(),
    validationDebounceMs: z.coerce.number().int().positive(),
    progressUpdateIntervalMs: z.coerce.number().int().positive()
  })
});

export type AppConfig = z.infer<typeof ConfigSchema>;

/**
 * Load and validate application configuration
 * Fails fast if required variables are missing or invalid
 * @returns Validated application configuration
 * @throws Error if configuration is invalid
 */
export function loadConfig(): AppConfig {
  const config = {
    env: process.env.REACT_APP_ENV as 'production' | 'staging' | 'development',
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
    wsBaseUrl: process.env.REACT_APP_WS_URL, // Using REACT_APP_WS_URL from webpack config
    frontendPort: process.env.REACT_APP_FRONTEND_PORT,
    features: {
      enableRag: process.env.REACT_APP_FEATURE_ENABLE_RAG === 'true',
      enableRealTimeUpdates: process.env.REACT_APP_FEATURE_ENABLE_REAL_TIME_UPDATES === 'true',
      enableMicroservices: process.env.REACT_APP_FEATURE_ENABLE_MICROSERVICES === 'true',
      enableWizard: process.env.REACT_APP_FEATURE_ENABLE_WIZARD === 'true',
      enableTemplates: process.env.REACT_APP_FEATURE_ENABLE_TEMPLATES === 'true',
      enableMultiEntity: process.env.REACT_APP_FEATURE_ENABLE_MULTI_ENTITY === 'true',
      enableLlmInsights: process.env.REACT_APP_FEATURE_ENABLE_LLM_INSIGHTS === 'true',
      enableRelationshipGraph: process.env.REACT_APP_FEATURE_ENABLE_RELATIONSHIP_GRAPH === 'true'
    },
    ui: {
      paginationSize: process.env.REACT_APP_PAGINATION_SIZE,
      requestTimeoutMs: process.env.REACT_APP_REQUEST_TIMEOUT_MS
    },
    wizard: {
      maxEntities: process.env.REACT_APP_MAX_ENTITIES,
      maxTools: process.env.REACT_APP_MAX_TOOLS,
      defaultRiskThreshold: process.env.REACT_APP_DEFAULT_RISK_THRESHOLD,
      defaultCorrelationMode: process.env.REACT_APP_DEFAULT_CORRELATION_MODE,
      defaultExecutionMode: process.env.REACT_APP_DEFAULT_EXECUTION_MODE,
      autoSaveIntervalMs: process.env.REACT_APP_WIZARD_AUTO_SAVE_INTERVAL_MS,
      validationDebounceMs: process.env.REACT_APP_WIZARD_VALIDATION_DEBOUNCE_MS,
      progressUpdateIntervalMs: process.env.REACT_APP_WIZARD_PROGRESS_UPDATE_INTERVAL_MS
    }
  };

  const parsed = ConfigSchema.safeParse(config);

  if (!parsed.success) {
    console.error('Configuration validation failed:');
    console.error(parsed.error.format());
    throw new Error(
      'Invalid configuration – refusing to start. ' +
      'Please check all REACT_APP_* environment variables.'
    );
  }

  return parsed.data;
}
