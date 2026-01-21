// Main exports from logging package
export { LoggerFactory } from './backend/LoggerFactory';
export { LogLevel, LogDomain, AlertSeverity, AuditAction } from './backend/types/index';
export { PiiRedaction } from './backend/PiiRedaction';
export type {
  ILogger,
  LogEntry,
  LogMetadata,
  LogSource,
  ErrorInfo,
  PerformanceInfo,
  UserContext,
  CorrelationContext
} from './backend/types/index';

// Import for convenience exports
import { LoggerFactory } from './backend/LoggerFactory';

// Initialize factory and create default logger
LoggerFactory.initialize();
export const createLogger = (serviceName: string) => LoggerFactory.createLogger(serviceName);
export const getLogger = (serviceName: string = 'default') => LoggerFactory.createLogger(serviceName);

// Default logger export for convenience
export const logger = getLogger('default');
