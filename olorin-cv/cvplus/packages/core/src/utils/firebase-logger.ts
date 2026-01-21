/**
 * Firebase Functions Logger Utilities
 * 
 * Centralized logging configuration and utilities for Firebase Functions.
 * Consolidates logging patterns and provides structured logging capabilities.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { logger as firebaseLogger } from 'firebase-functions';

/**
 * Log levels supported by Firebase Functions
  */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log entry interface
  */
export interface LogEntry {
  message: string;
  level: LogLevel;
  functionName?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: Error | string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

/**
 * Performance tracking interface
  */
export interface PerformanceLog {
  operation: string;
  duration: number;
  functionName?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Logger configuration
  */
export interface LoggerConfig {
  /** Default log level  */
  defaultLevel: LogLevel;
  /** Include timestamps in logs  */
  includeTimestamp: boolean;
  /** Maximum metadata size (in characters)  */
  maxMetadataSize: number;
  /** Sanitize sensitive data  */
  sanitizeData: boolean;
  /** Additional context to include in all logs  */
  globalContext?: Record<string, any>;
}

/**
 * Default logger configuration
  */
const DEFAULT_CONFIG: LoggerConfig = {
  defaultLevel: 'info',
  includeTimestamp: true,
  maxMetadataSize: 1000,
  sanitizeData: true,
  globalContext: {}
};

/**
 * Current logger configuration
  */
let loggerConfig: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * Sensitive data keys to sanitize
  */
const SENSITIVE_KEYS = [
  'password', 'token', 'apiKey', 'secret', 'authorization', 
  'auth', 'credential', 'key', 'privateKey', 'passphrase',
  'ssn', 'socialSecurityNumber', 'creditCard', 'bankAccount'
];

/**
 * Configure the logger
 * 
 * @param config - Logger configuration options
  */
export function configureLogger(config: Partial<LoggerConfig>): void {
  loggerConfig = { ...loggerConfig, ...config };
}

/**
 * Sanitizes sensitive data from log entries
 * 
 * @param data - Data to sanitize
 * @returns Sanitized data object
  */
function sanitizeLogData(data: any): any {
  if (!loggerConfig.sanitizeData) {
    return data;
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Truncates metadata to maximum allowed size
 * 
 * @param metadata - Metadata object
 * @returns Truncated metadata
  */
function truncateMetadata(metadata: any): any {
  const jsonString = JSON.stringify(metadata);
  
  if (jsonString.length <= loggerConfig.maxMetadataSize) {
    return metadata;
  }

  return {
    ...metadata,
    _truncated: true,
    _originalSize: jsonString.length,
    _maxSize: loggerConfig.maxMetadataSize
  };
}

/**
 * Formats log entry for Firebase Functions logger
 * 
 * @param entry - Log entry to format
 * @returns Formatted log entry
  */
function formatLogEntry(entry: LogEntry): [string, any?] {
  const { message, level: _level, ...restEntry } = entry;
  
  // Build log context
  const context = {
    ...loggerConfig.globalContext,
    ...(restEntry.timestamp && { timestamp: restEntry.timestamp }),
    ...(restEntry.functionName && { functionName: restEntry.functionName }),
    ...(restEntry.userId && { userId: restEntry.userId.substring(0, 8) + '***' }),
    ...(restEntry.requestId && { requestId: restEntry.requestId }),
    ...(restEntry.duration && { duration: `${restEntry.duration}ms` }),
    ...(restEntry.metadata && { metadata: restEntry.metadata }),
    ...(restEntry.error && { 
      error: restEntry.error instanceof Error 
        ? { message: restEntry.error.message, stack: restEntry.error.stack }
        : restEntry.error 
    })
  };

  // Sanitize and truncate context
  const sanitizedContext = sanitizeLogData(context);
  const finalContext = truncateMetadata(sanitizedContext);

  return [message, finalContext];
}

/**
 * Enhanced Firebase logger with structured logging
  */
export class CVPlusLogger {
  private functionName?: string;
  
  constructor(functionName?: string) {
    this.functionName = functionName;
  }

  /**
   * Debug level logging
    */
  debug(message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      message,
      level: 'debug',
      functionName: this.functionName,
      timestamp: loggerConfig.includeTimestamp ? new Date().toISOString() : undefined,
      metadata
    };

    const [logMessage, logContext] = formatLogEntry(entry);
    firebaseLogger.debug(logMessage, logContext);
  }

  /**
   * Info level logging
    */
  info(message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      message,
      level: 'info',
      functionName: this.functionName,
      timestamp: loggerConfig.includeTimestamp ? new Date().toISOString() : undefined,
      metadata
    };

    const [logMessage, logContext] = formatLogEntry(entry);
    firebaseLogger.info(logMessage, logContext);
  }

  /**
   * Warning level logging
    */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      message,
      level: 'warn',
      functionName: this.functionName,
      timestamp: loggerConfig.includeTimestamp ? new Date().toISOString() : undefined,
      metadata
    };

    const [logMessage, logContext] = formatLogEntry(entry);
    firebaseLogger.warn(logMessage, logContext);
  }

  /**
   * Error level logging
    */
  error(message: string, error?: Error | string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      message,
      level: 'error',
      functionName: this.functionName,
      timestamp: loggerConfig.includeTimestamp ? new Date().toISOString() : undefined,
      error,
      metadata
    };

    const [logMessage, logContext] = formatLogEntry(entry);
    firebaseLogger.error(logMessage, logContext);
  }

  /**
   * Log performance metrics
    */
  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      performanceLog: true,
      ...metadata
    });
  }

  /**
   * Log function start
    */
  functionStart(functionName?: string, requestData?: Record<string, any>): void {
    this.info(`Function started: ${functionName || this.functionName}`, {
      event: 'function_start',
      requestData: sanitizeLogData(requestData)
    });
  }

  /**
   * Log function completion
    */
  functionEnd(functionName?: string, duration?: number, metadata?: Record<string, any>): void {
    this.info(`Function completed: ${functionName || this.functionName}`, {
      event: 'function_end',
      ...(duration && { duration: `${duration}ms` }),
      ...metadata
    });
  }

  /**
   * Log authentication events
    */
  auth(event: 'success' | 'failure' | 'attempt', userId?: string, metadata?: Record<string, any>): void {
    const level = event === 'failure' ? 'warn' : 'info';
    const message = `Authentication ${event}${userId ? ` for user ${userId.substring(0, 8)}***` : ''}`;
    
    this[level](message, {
      event: 'authentication',
      authEvent: event,
      userId: userId?.substring(0, 8) + '***',
      ...metadata
    });
  }

  /**
   * Log business logic events
    */
  business(event: string, metadata?: Record<string, any>): void {
    this.info(`Business event: ${event}`, {
      event: 'business_logic',
      businessEvent: event,
      ...metadata
    });
  }

  /**
   * Log external API calls
    */
  externalApi(
    service: string, 
    operation: string, 
    duration?: number, 
    success?: boolean, 
    metadata?: Record<string, any>
  ): void {
    const level = success === false ? 'warn' : 'info';
    const message = `External API: ${service}.${operation}`;
    
    this[level](message, {
      event: 'external_api',
      service,
      operation,
      success,
      ...(duration && { duration: `${duration}ms` }),
      ...metadata
    });
  }
}

/**
 * Creates a logger instance for a specific function
 * 
 * @param functionName - Name of the Firebase Function
 * @returns Logger instance
  */
export function createLogger(functionName: string): CVPlusLogger {
  return new CVPlusLogger(functionName);
}

/**
 * Default logger instance
  */
export const logger = new CVPlusLogger();

/**
 * Quick logging functions for common patterns
  */
export const quickLog = {
  /**
   * Log function execution with automatic timing
    */
  withTiming: async <T>(
    operation: string,
    fn: () => Promise<T>,
    loggerInstance: CVPlusLogger = logger
  ): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      loggerInstance.performance(operation, duration, { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      loggerInstance.error(`${operation} failed`, error as Error, { duration });
      throw error;
    }
  },

  /**
   * Log user action
    */
  userAction: (action: string, userId: string, metadata?: Record<string, any>): void => {
    logger.info(`User action: ${action}`, {
      event: 'user_action',
      action,
      userId: userId.substring(0, 8) + '***',
      ...metadata
    });
  },

  /**
   * Log security event
    */
  security: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>): void => {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    const securityMetadata = {
      event: 'security',
      securityEvent: event,
      severity,
      ...metadata
    };
    
    if (level === 'error') {
      logger.error(`Security event: ${event}`, undefined, securityMetadata);
    } else {
      logger.warn(`Security event: ${event}`, securityMetadata);
    }
  }
};

/**
 * Legacy compatibility - direct Firebase logger re-export
 * For gradual migration from existing logging
  */
export { firebaseLogger };