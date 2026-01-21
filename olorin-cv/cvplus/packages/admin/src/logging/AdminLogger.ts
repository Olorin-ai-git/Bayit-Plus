/**
 * T036: Admin package logging in packages/admin/src/logging/AdminLogger.ts
 *
 * Specialized logger for admin operations, system monitoring, and configuration events
  */

import { logger, LoggerFactory, LogLevel } from '@cvplus/core';

// Create admin-specific logger instance
const adminLogger: any = LoggerFactory.createLogger('admin', {
  level: LogLevel.INFO
});

// Re-export the admin logger
export { adminLogger };
export default adminLogger;