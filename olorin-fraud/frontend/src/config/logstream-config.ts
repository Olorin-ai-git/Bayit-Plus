/**
 * Log Streaming Configuration Schema
 * Feature: 021-live-merged-logstream
 *
 * Configuration for live merged log streaming with Zod validation.
 * All configuration values from environment variables following SYSTEM MANDATE.
 */

import { z } from 'zod';

/**
 * Log level enumeration
 */
export const LogLevelSchema = z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

/**
 * Log source enumeration
 */
export const LogSourceSchema = z.enum(['frontend', 'backend']);
export type LogSource = z.infer<typeof LogSourceSchema>;

/**
 * SSE configuration schema
 */
const SSEConfigSchema = z.object({
  heartbeatIntervalSeconds: z.number().int().positive().max(60),
  connectionTimeoutSeconds: z.number().int().positive().max(3600),
  retryIntervalMs: z.number().int().positive().max(30000),
  maxReconnectAttempts: z.number().int().positive().max(10),
  exponentialBackoffBase: z.number().positive().max(5)
});

/**
 * Polling fallback configuration schema
 */
const PollingConfigSchema = z.object({
  defaultIntervalMs: z.number().int().positive().max(30000),
  backoffMultiplier: z.number().positive().max(3),
  maxIntervalMs: z.number().int().positive().max(60000)
});

/**
 * Virtualization configuration schema
 */
const VirtualizationConfigSchema = z.object({
  itemHeight: z.number().int().positive(),
  overscanCount: z.number().int().nonnegative(),
  maxRenderedItems: z.number().int().positive()
});

/**
 * Filter configuration schema
 */
const FilterConfigSchema = z.object({
  searchDebounceMs: z.number().int().nonnegative().max(2000),
  defaultMinLevel: LogLevelSchema.optional()
});

/**
 * UI configuration schema
 */
const UIConfigSchema = z.object({
  autoscrollEnabled: z.boolean(),
  pauseBufferSize: z.number().int().positive(),
  maxDisplayedLogs: z.number().int().positive(),
  colorCodedLevels: z.boolean()
});

/**
 * Complete log stream configuration schema
 */
export const LogStreamConfigSchema = z.object({
  // Feature flag
  enabled: z.boolean(),

  // Sub-configurations
  sse: SSEConfigSchema,
  polling: PollingConfigSchema,
  virtualization: VirtualizationConfigSchema,
  filter: FilterConfigSchema,
  ui: UIConfigSchema,

  // API endpoints (built from base URL + paths)
  streamEndpointPath: z.string().startsWith('/'),
  pollingEndpointPath: z.string().startsWith('/'),
  clientLogsEndpointPath: z.string().startsWith('/')
});

export type LogStreamConfig = z.infer<typeof LogStreamConfigSchema>;

/**
 * Load and validate log stream configuration
 * Fails fast if required variables are missing or invalid
 * @returns Validated log stream configuration
 * @throws Error if configuration is invalid
 */
export function loadLogStreamConfig(): LogStreamConfig {
  const rawConfig = {
    enabled: process.env.REACT_APP_LOGSTREAM_ENABLE === 'true',

    sse: {
      heartbeatIntervalSeconds: parseInt(
        process.env.REACT_APP_LOGSTREAM_SSE_HEARTBEAT_INTERVAL_SECONDS || '10',
        10
      ),
      connectionTimeoutSeconds: parseInt(
        process.env.REACT_APP_LOGSTREAM_SSE_CONNECTION_TIMEOUT_SECONDS || '600',
        10
      ),
      retryIntervalMs: parseInt(
        process.env.REACT_APP_LOGSTREAM_SSE_RETRY_INTERVAL_MS || '3000',
        10
      ),
      maxReconnectAttempts: parseInt(
        process.env.REACT_APP_LOGSTREAM_SSE_MAX_RECONNECT_ATTEMPTS || '3',
        10
      ),
      exponentialBackoffBase: parseFloat(
        process.env.REACT_APP_LOGSTREAM_SSE_EXPONENTIAL_BACKOFF_BASE || '2'
      )
    },

    polling: {
      defaultIntervalMs: parseInt(
        process.env.REACT_APP_LOGSTREAM_POLLING_INTERVAL_MS || '5000',
        10
      ),
      backoffMultiplier: parseFloat(
        process.env.REACT_APP_LOGSTREAM_POLLING_BACKOFF_MULTIPLIER || '1.5'
      ),
      maxIntervalMs: parseInt(
        process.env.REACT_APP_LOGSTREAM_POLLING_MAX_INTERVAL_MS || '30000',
        10
      )
    },

    virtualization: {
      itemHeight: parseInt(
        process.env.REACT_APP_LOGSTREAM_ITEM_HEIGHT || '60',
        10
      ),
      overscanCount: parseInt(
        process.env.REACT_APP_LOGSTREAM_OVERSCAN_COUNT || '5',
        10
      ),
      maxRenderedItems: parseInt(
        process.env.REACT_APP_LOGSTREAM_MAX_RENDERED_ITEMS || '10000',
        10
      )
    },

    filter: {
      searchDebounceMs: parseInt(
        process.env.REACT_APP_LOGSTREAM_SEARCH_DEBOUNCE_MS || '500',
        10
      ),
      defaultMinLevel: process.env.REACT_APP_LOGSTREAM_DEFAULT_MIN_LEVEL as LogLevel | undefined
    },

    ui: {
      autoscrollEnabled: process.env.REACT_APP_LOGSTREAM_AUTOSCROLL_ENABLED !== 'false',
      pauseBufferSize: parseInt(
        process.env.REACT_APP_LOGSTREAM_PAUSE_BUFFER_SIZE || '1000',
        10
      ),
      maxDisplayedLogs: parseInt(
        process.env.REACT_APP_LOGSTREAM_MAX_DISPLAYED_LOGS || '10000',
        10
      ),
      colorCodedLevels: process.env.REACT_APP_LOGSTREAM_COLOR_CODED_LEVELS !== 'false'
    },

    streamEndpointPath: process.env.REACT_APP_LOGSTREAM_STREAM_ENDPOINT_PATH || '/investigations/:id/logs/stream',
    pollingEndpointPath: process.env.REACT_APP_LOGSTREAM_POLLING_ENDPOINT_PATH || '/investigations/:id/logs',
    clientLogsEndpointPath: process.env.REACT_APP_LOGSTREAM_CLIENT_LOGS_ENDPOINT_PATH || '/client-logs'
  };

  const parsed = LogStreamConfigSchema.safeParse(rawConfig);

  if (!parsed.success) {
    const errors = parsed.error.errors
      .map((err) => `  ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    console.error('[LogStream Config] Validation failed:');
    console.error(errors);

    throw new Error(
      `Invalid log stream configuration – refusing to start.\n${errors}\n\n` +
      `Please check all REACT_APP_LOGSTREAM_* environment variables.`
    );
  }

  return parsed.data;
}

/**
 * Global configuration instance
 */
let globalLogStreamConfig: LogStreamConfig | null = null;

/**
 * Get or load global log stream configuration
 */
export function getLogStreamConfig(): LogStreamConfig {
  if (!globalLogStreamConfig) {
    globalLogStreamConfig = loadLogStreamConfig();
  }
  return globalLogStreamConfig;
}

/**
 * Reset global configuration (for testing)
 */
export function resetLogStreamConfig(): void {
  globalLogStreamConfig = null;
}

/**
 * Check if log streaming is enabled
 */
export function isLogStreamEnabled(): boolean {
  const config = getLogStreamConfig();
  return config.enabled;
}

/**
 * Get SSE stream endpoint URL for an investigation
 */
export function getStreamEndpoint(investigationId: string, baseUrl: string): string {
  const config = getLogStreamConfig();
  const path = config.streamEndpointPath.replace(':id', investigationId);
  return `${baseUrl}${path}`;
}

/**
 * Get polling endpoint URL for an investigation
 */
export function getPollingEndpoint(investigationId: string, baseUrl: string): string {
  const config = getLogStreamConfig();
  const path = config.pollingEndpointPath.replace(':id', investigationId);
  return `${baseUrl}${path}`;
}

/**
 * Get client logs ingestion endpoint URL
 */
export function getClientLogsEndpoint(baseUrl: string): string {
  const config = getLogStreamConfig();
  return `${baseUrl}${config.clientLogsEndpointPath}`;
}
