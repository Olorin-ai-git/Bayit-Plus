/**
 * Console Logger Utilities
 * Feature: 021-live-merged-logstream
 *
 * Helper functions for console log capture and formatting.
 * Extracted from console-logger.ts to maintain 200-line limit.
 *
 * Author: Gil Klainert
 * Date: 2025-11-12
 * Spec: /specs/021-live-merged-logstream/research.md
 */

/**
 * Format console arguments into message string
 *
 * Converts various argument types to string format:
 * - Strings: pass through
 * - Errors: format as "Name: Message"
 * - Objects: JSON.stringify
 * - Other: String()
 *
 * @param args - Console method arguments
 * @returns Formatted message string (max 10000 chars)
 */
export function formatConsoleMessage(args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}`;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ')
    .slice(0, 10000);
}

/**
 * Extract context data from console arguments
 *
 * Extracts structured context from arguments:
 * - Error objects: { error: { name, message, stack } }
 * - Regular objects: merged into context
 *
 * @param args - Console method arguments
 * @returns Context object with extracted data
 */
export function extractConsoleContext(args: any[]): Record<string, any> {
  const context: Record<string, any> = {};

  for (const arg of args) {
    if (arg instanceof Error) {
      context.error = {
        name: arg.name,
        message: arg.message,
        stack: arg.stack
      };
    } else if (typeof arg === 'object' && arg !== null) {
      Object.assign(context, arg);
    }
  }

  return context;
}

/**
 * Check if log level should be captured based on filtering
 *
 * Compares log level against minimum level using numeric comparison:
 * DEBUG=0, INFO=1, WARN=2, ERROR=3
 *
 * @param level - Log level to check
 * @param minLevel - Minimum level to capture (undefined = capture all)
 * @returns True if should capture, false otherwise
 */
export function shouldCaptureLogLevel(
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  minLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
): boolean {
  if (!minLevel) {
    return true;
  }

  const levels: Record<string, number> = {
    'DEBUG': 0,
    'INFO': 1,
    'WARN': 2,
    'ERROR': 3
  };

  return levels[level] >= levels[minLevel];
}
