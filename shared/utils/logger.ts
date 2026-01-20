/**
 * Centralized logging utility for Bayit+ applications.
 * Features:
 * - Structured logging with correlation IDs for request tracing
 * - Sentry integration for error tracking in production
 * - Environment-aware log levels
 * - Scoped loggers for per-module context
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
  correlationId?: string;
}

interface SentryLike {
  captureException: (error: unknown, options?: { extra?: Record<string, unknown> }) => void;
  captureMessage: (message: string, options?: { level?: string; extra?: Record<string, unknown> }) => void;
  setTag: (key: string, value: string) => void;
}

// Global state for Sentry instance and correlation ID
let sentryInstance: SentryLike | null = null;
let currentCorrelationId: string | null = null;

// Environment detection
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const logLevel = (typeof process !== 'undefined' && process.env?.VITE_LOG_LEVEL) || 'info';

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Initialize Sentry for the logger.
 * Call this once during app initialization with your Sentry instance.
 */
export const initLoggerSentry = (sentry: SentryLike): void => {
  sentryInstance = sentry;
};

/**
 * Set the current correlation ID for request tracing.
 * This ID will be included in all subsequent log entries.
 */
export const setCorrelationId = (id: string | null): void => {
  currentCorrelationId = id;
  if (sentryInstance && id) {
    sentryInstance.setTag('correlation_id', id);
  }
};

/**
 * Get the current correlation ID.
 */
export const getCorrelationId = (): string | null => currentCorrelationId;

/**
 * Generate a new correlation ID.
 */
export const generateCorrelationId = (): string => {
  // Use crypto.randomUUID if available (modern browsers/Node 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Check if a log level should be output based on configured level.
 */
const shouldLog = (level: LogLevel): boolean => {
  const configuredLevel = LOG_LEVELS[logLevel as LogLevel] ?? LOG_LEVELS.info;
  return LOG_LEVELS[level] >= configuredLevel;
};

/**
 * Format a log entry for console output.
 */
const formatLog = (entry: LogEntry): string => {
  const prefix = entry.context ? `[${entry.context}]` : '';
  const correlationPrefix = entry.correlationId ? `[${entry.correlationId.slice(0, 8)}]` : '';
  return `${entry.timestamp} ${entry.level.toUpperCase()} ${correlationPrefix}${prefix} ${entry.message}`;
};

/**
 * Send log entry to Sentry if configured.
 */
const sendToSentry = (entry: LogEntry): void => {
  if (!sentryInstance || isDev) {
    return;
  }

  const extra: Record<string, unknown> = {
    context: entry.context,
    correlationId: entry.correlationId,
  };

  if (entry.data) {
    extra.data = entry.data;
  }

  if (entry.level === 'error' && entry.data instanceof Error) {
    sentryInstance.captureException(entry.data, { extra });
  } else if (entry.level === 'error' || entry.level === 'warn') {
    sentryInstance.captureMessage(entry.message, {
      level: entry.level,
      extra,
    });
  }
};

/**
 * Create a log entry with current state.
 */
const createLogEntry = (
  level: LogLevel,
  message: string,
  context?: string,
  data?: unknown
): LogEntry => ({
  level,
  message,
  context,
  data,
  timestamp: new Date().toISOString(),
  correlationId: currentCorrelationId || undefined,
});

/**
 * Main logger object with standard logging methods.
 */
export const logger = {
  debug: (message: string, context?: string, data?: unknown): void => {
    if (!shouldLog('debug')) return;
    const entry = createLogEntry('debug', message, context, data);
    if (isDev) {
      console.debug(formatLog(entry), data || '');
    }
  },

  info: (message: string, context?: string, data?: unknown): void => {
    if (!shouldLog('info')) return;
    const entry = createLogEntry('info', message, context, data);
    if (isDev) {
      console.info(formatLog(entry), data || '');
    }
    sendToSentry(entry);
  },

  warn: (message: string, context?: string, data?: unknown): void => {
    if (!shouldLog('warn')) return;
    const entry = createLogEntry('warn', message, context, data);
    if (isDev) {
      console.warn(formatLog(entry), data || '');
    }
    sendToSentry(entry);
  },

  error: (message: string, context?: string, error?: unknown): void => {
    if (!shouldLog('error')) return;
    const entry = createLogEntry('error', message, context, error);
    if (isDev) {
      console.error(formatLog(entry), error || '');
    }
    sendToSentry(entry);
  },

  /**
   * Create a scoped logger with a fixed context.
   * Useful for per-module logging.
   */
  scope: (defaultContext: string) => ({
    debug: (message: string, data?: unknown) => logger.debug(message, defaultContext, data),
    info: (message: string, data?: unknown) => logger.info(message, defaultContext, data),
    warn: (message: string, data?: unknown) => logger.warn(message, defaultContext, data),
    error: (message: string, error?: unknown) => logger.error(message, defaultContext, error),
  }),
};

export default logger;
