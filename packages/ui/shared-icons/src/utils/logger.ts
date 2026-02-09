/**
 * Minimal logger for shared-icons package.
 */

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const logger = {
  warn: (message: string, context?: string, data?: unknown): void => {
    const prefix = context ? `[${context}]` : '';
    console.warn(`${prefix} ${message}`, data || '');
  },
  error: (message: string, context?: string, error?: unknown): void => {
    const prefix = context ? `[${context}]` : '';
    console.error(`${prefix} ${message}`, error || '');
  },
};

export default logger;
