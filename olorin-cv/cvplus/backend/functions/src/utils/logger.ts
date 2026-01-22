/**
 * Structured Logger Utility
 *
 * Provides consistent logging across the application with structured metadata.
 * Integrates with Google Cloud Logging for production environments.
 */

export interface LogMetadata {
  [key: string]: any;
}

export interface Logger {
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
}

/**
 * Format log entry with timestamp and structured metadata
 */
function formatLogEntry(level: string, message: string, metadata?: LogMetadata): string {
  const timestamp = new Date().toISOString();
  const entry: any = {
    timestamp,
    level,
    message,
  };

  if (metadata) {
    entry.metadata = metadata;
  }

  return JSON.stringify(entry);
}

/**
 * Get logger instance for a specific module
 *
 * @param moduleName - Name of the module (e.g., 'AudioProcessingService')
 * @returns Logger instance
 */
export function getLogger(moduleName: string): Logger {
  return {
    info(message: string, metadata?: LogMetadata): void {
      const logEntry = formatLogEntry('INFO', `[${moduleName}] ${message}`, metadata);
      console.log(logEntry);
    },

    warn(message: string, metadata?: LogMetadata): void {
      const logEntry = formatLogEntry('WARN', `[${moduleName}] ${message}`, metadata);
      console.warn(logEntry);
    },

    error(message: string, metadata?: LogMetadata): void {
      const logEntry = formatLogEntry('ERROR', `[${moduleName}] ${message}`, metadata);
      console.error(logEntry);
    },

    debug(message: string, metadata?: LogMetadata): void {
      const logEntry = formatLogEntry('DEBUG', `[${moduleName}] ${message}`, metadata);
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
        console.debug(logEntry);
      }
    },
  };
}

/**
 * Default logger instance
 */
export const logger = getLogger('Application');
