/**
 * Minimal logger for glass-components package.
 * Wraps console methods with context prefix for consistent logging.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const createLogger = () => ({
  debug: (message: string, context?: string, data?: unknown): void => {
    if (isDev) {
      const prefix = context ? `[${context}]` : '';
      console.debug(`${prefix} ${message}`, data || '');
    }
  },
  info: (message: string, context?: string, data?: unknown): void => {
    if (isDev) {
      const prefix = context ? `[${context}]` : '';
      console.info(`${prefix} ${message}`, data || '');
    }
  },
  warn: (message: string, context?: string, data?: unknown): void => {
    const prefix = context ? `[${context}]` : '';
    console.warn(`${prefix} ${message}`, data || '');
  },
  error: (message: string, context?: string, error?: unknown): void => {
    const prefix = context ? `[${context}]` : '';
    console.error(`${prefix} ${message}`, error || '');
  },
  scope: (defaultContext: string) => ({
    debug: (message: string, data?: unknown) => createLogger().debug(message, defaultContext, data),
    info: (message: string, data?: unknown) => createLogger().info(message, defaultContext, data),
    warn: (message: string, data?: unknown) => createLogger().warn(message, defaultContext, data),
    error: (message: string, error?: unknown) => createLogger().error(message, defaultContext, error),
  }),
});

export const logger = createLogger();
export default logger;
