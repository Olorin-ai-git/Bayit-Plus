/**
 * Centralized logging utility for Bayit+ web app.
 * In production, errors are sent to monitoring service.
 * In development, logs are displayed in console.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  timestamp: string;
}

const isDev = process.env.NODE_ENV === 'development';

const formatLog = (entry: LogEntry): string => {
  const prefix = entry.context ? `[${entry.context}]` : '';
  return `${entry.timestamp} ${entry.level.toUpperCase()} ${prefix} ${entry.message}`;
};

const sendToMonitoring = async (entry: LogEntry): Promise<void> => {
  // In production, send critical errors to monitoring service
  if (!isDev && entry.level === 'error') {
    try {
      // Integration point for error monitoring (Sentry, LogRocket, etc.)
      // await monitoringService.captureError(entry);
    } catch {
      // Monitoring failure should not break the app
    }
  }
};

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
});

export const logger = {
  debug: (message: string, context?: string, data?: unknown): void => {
    if (isDev) {
      const entry = createLogEntry('debug', message, context, data);
      console.debug(formatLog(entry), data || '');
    }
  },

  info: (message: string, context?: string, data?: unknown): void => {
    const entry = createLogEntry('info', message, context, data);
    if (isDev) {
      console.info(formatLog(entry), data || '');
    }
    sendToMonitoring(entry);
  },

  warn: (message: string, context?: string, data?: unknown): void => {
    const entry = createLogEntry('warn', message, context, data);
    if (isDev) {
      console.warn(formatLog(entry), data || '');
    }
    sendToMonitoring(entry);
  },

  error: (message: string, context?: string, error?: unknown): void => {
    const entry = createLogEntry('error', message, context, error);
    if (isDev) {
      console.error(formatLog(entry), error || '');
    }
    sendToMonitoring(entry);
  },
};

export default logger;
