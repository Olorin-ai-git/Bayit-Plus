import * as admin from 'firebase-admin';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  functionName?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  sessionId?: string;
  correlationId?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    memory?: number;
    cpu?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Structured logger class
  */
export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.minLevel = minLevel;
  }

  /**
   * Create child logger with additional context
    */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      { ...this.context, ...additionalContext },
      this.minLevel
    );
  }

  /**
   * Set minimum log level
    */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Log error message
    */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, { error, metadata });
  }

  /**
   * Log warning message
    */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, { metadata });
  }

  /**
   * Log info message
    */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, { metadata });
  }

  /**
   * Log debug message
    */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, { metadata });
  }

  /**
   * Log trace message
    */
  trace(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, { metadata });
  }

  /**
   * Log with performance metrics
    */
  performance(
    message: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const performance = {
      duration,
      memory: process.memoryUsage().heapUsed,
      cpu: process.cpuUsage().user
    };

    this.log(LogLevel.INFO, message, { performance, metadata });
  }

  /**
   * Log API request
    */
  apiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    userId?: string
  ): void {
    this.info('API Request', {
      method,
      endpoint,
      statusCode,
      duration,
      userId,
      type: 'api_request'
    });
  }

  /**
   * Log user action
    */
  userAction(
    action: string,
    userId: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, any>
  ): void {
    this.info('User Action', {
      action,
      userId,
      entityType,
      entityId,
      type: 'user_action',
      ...metadata
    });
  }

  /**
   * Log system event
    */
  systemEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>
  ): void {
    const level = severity === 'critical' || severity === 'high'
      ? LogLevel.ERROR
      : severity === 'medium'
        ? LogLevel.WARN
        : LogLevel.INFO;

    this.log(level, `System Event: ${event}`, {
      metadata: {
        severity,
        type: 'system_event',
        ...metadata
      }
    });
  }

  /**
   * Core logging method
    */
  private log(
    level: LogLevel,
    message: string,
    options: {
      error?: Error;
      performance?: { duration: number; memory?: number; cpu?: number };
      metadata?: Record<string, any>;
    } = {}
  ): void {
    if (level > this.minLevel) return;

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context
    };

    if (options.error) {
      logEntry.error = {
        name: options.error.name,
        message: options.error.message,
        stack: options.error.stack
      };
    }

    if (options.performance) {
      logEntry.performance = options.performance;
    }

    if (options.metadata) {
      logEntry.metadata = options.metadata;
    }

    // Output to console with structured format
    this.outputToConsole(logEntry);

    // Store in Firestore for persistent logging (async, don't await)
    if (level <= LogLevel.WARN || this.shouldPersistLog(logEntry)) {
      this.persistToFirestore(logEntry).catch(error => {
        logger.error('Failed to persist log to Firestore:', error);
      });
    }
  }

  /**
   * Output log to console with proper formatting
    */
  private outputToConsole(entry: LogEntry): void {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
    const levelName = levelNames[entry.level];
    const timestamp = entry.timestamp.toISOString();

    const logData = {
      timestamp,
      level: levelName,
      message: entry.message,
      context: entry.context,
      ...(entry.error && { error: entry.error }),
      ...(entry.performance && { performance: entry.performance }),
      ...(entry.metadata && { metadata: entry.metadata })
    };

    if (entry.level === LogLevel.ERROR) {
      logger.error(JSON.stringify(logData, null, 2));
    } else if (entry.level === LogLevel.WARN) {
      logger.warn(JSON.stringify(logData, null, 2));
    } else {
      logger.info(JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Persist log entry to Firestore
    */
  private async persistToFirestore(entry: LogEntry): Promise<void> {
    try {
      const firestore = admin.firestore();

      // Determine collection based on log level and type
      let collection = 'logs';

      if (entry.level === LogLevel.ERROR) {
        collection = 'error_logs';
      } else if (entry.metadata?.type === 'api_request') {
        collection = 'api_logs';
      } else if (entry.metadata?.type === 'user_action') {
        collection = 'user_action_logs';
      } else if (entry.metadata?.type === 'system_event') {
        collection = 'system_logs';
      }

      const logDoc = {
        level: entry.level,
        levelName: ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'][entry.level],
        message: entry.message,
        timestamp: admin.firestore.Timestamp.fromDate(entry.timestamp),
        context: entry.context,
        ...(entry.error && { error: entry.error }),
        ...(entry.performance && { performance: entry.performance }),
        ...(entry.metadata && { metadata: entry.metadata }),
        environment: process.env.NODE_ENV || 'production'
      };

      await firestore.collection(collection).add(logDoc);

    } catch (error) {
      logger.error('Failed to persist log to Firestore:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Determine if log should be persisted based on context
    */
  private shouldPersistLog(entry: LogEntry): boolean {
    // Always persist errors
    if (entry.level === LogLevel.ERROR) return true;

    // Persist API requests
    if (entry.metadata?.type === 'api_request') return true;

    // Persist user actions
    if (entry.metadata?.type === 'user_action') return true;

    // Persist system events
    if (entry.metadata?.type === 'system_event') return true;

    // Persist performance logs over threshold
    if (entry.performance && entry.performance.duration > 1000) return true;

    // Don't persist debug/trace in production
    if (process.env.NODE_ENV === 'production' && entry.level >= LogLevel.DEBUG) {
      return false;
    }

    return false;
  }
}

/**
 * Global logger instance
  */
export const logger = new Logger(
  {
    service: 'cvplus-functions',
    version: process.env.FUNCTIONS_VERSION || '1.0.0'
  },
  process.env.LOG_LEVEL
    ? parseInt(process.env.LOG_LEVEL)
    : process.env.NODE_ENV === 'production'
      ? LogLevel.INFO
      : LogLevel.DEBUG
);

/**
 * Create logger for specific function
  */
export function createFunctionLogger(functionName: string, context: LogContext = {}): Logger {
  return logger.child({
    functionName,
    ...context
  });
}

/**
 * Create logger for API request
  */
export function createRequestLogger(
  requestId: string,
  method: string,
  endpoint: string,
  context: LogContext = {}
): Logger {
  return logger.child({
    requestId,
    method,
    endpoint,
    ...context
  });
}

/**
 * Performance timing decorator
  */
export function withTiming<T>(
  operation: () => Promise<T>,
  operationName: string,
  logger: Logger
): Promise<T> {
  const startTime = Date.now();

  return operation().then(
    result => {
      const duration = Date.now() - startTime;
      logger.performance(`${operationName} completed`, duration);
      return result;
    },
    error => {
      const duration = Date.now() - startTime;
      logger.performance(`${operationName} failed`, duration, { error: error.message });
      throw error;
    }
  );
}

/**
 * Log cleanup function for scheduled cleanup
  */
export async function cleanupLogs(): Promise<void> {
  try {
    const firestore = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Define retention periods for different log types
    const retentionPeriods = {
      error_logs: 90, // 90 days
      api_logs: 30, // 30 days
      user_action_logs: 60, // 60 days
      system_logs: 30, // 30 days
      logs: 7 // 7 days for general logs
    };

    for (const [collection, days] of Object.entries(retentionPeriods)) {
      const cutoffDate = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - (days * 24 * 60 * 60 * 1000)
      );

      const query = firestore
        .collection(collection)
        .where('timestamp', '<', cutoffDate)
        .limit(100);

      const snapshot = await query.get();

      if (!snapshot.empty) {
        const batch = firestore.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        logger.info(`Cleaned up ${snapshot.docs.length} old logs from ${collection}`);
      }
    }

    logger.info('Log cleanup completed');

  } catch (error) {
    logger.error('Log cleanup failed', error as Error);
    throw error;
  }
}

/**
 * Log aggregation for analytics
  */
export async function aggregateLogs(
  startDate: Date,
  endDate: Date
): Promise<{
  errorCount: number;
  warnCount: number;
  apiRequestCount: number;
  userActionCount: number;
  averageResponseTime: number;
  topErrors: Array<{ message: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}> {
  try {
    const firestore = admin.firestore();
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    // Get error count
    const errorQuery = await firestore
      .collection('error_logs')
      .where('timestamp', '>=', startTimestamp)
      .where('timestamp', '<=', endTimestamp)
      .get();

    // Get API request logs
    const apiQuery = await firestore
      .collection('api_logs')
      .where('timestamp', '>=', startTimestamp)
      .where('timestamp', '<=', endTimestamp)
      .get();

    // Calculate statistics
    let totalResponseTime = 0;
    let responseCount = 0;
    const errorMessages: Record<string, number> = {};
    const endpoints: Record<string, number> = {};

    apiQuery.docs.forEach(doc => {
      const data = doc.data();
      if (data.performance?.duration) {
        totalResponseTime += data.performance.duration;
        responseCount++;
      }
      if (data.metadata?.endpoint) {
        endpoints[data.metadata.endpoint] = (endpoints[data.metadata.endpoint] || 0) + 1;
      }
    });

    errorQuery.docs.forEach(doc => {
      const data = doc.data();
      if (data.message) {
        errorMessages[data.message] = (errorMessages[data.message] || 0) + 1;
      }
    });

    // Get top errors and endpoints
    const topErrors = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    const topEndpoints = Object.entries(endpoints)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    return {
      errorCount: errorQuery.size,
      warnCount: 0, // Would need separate query for warnings
      apiRequestCount: apiQuery.size,
      userActionCount: 0, // Would need separate query for user actions
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      topErrors,
      topEndpoints
    };

  } catch (error) {
    logger.error('Log aggregation failed', error as Error);
    throw error;
  }
}

/**
 * Export logs for external analysis
  */
export async function exportLogs(
  collection: string,
  startDate: Date,
  endDate: Date,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  try {
    const firestore = admin.firestore();
    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    const query = await firestore
      .collection(collection)
      .where('timestamp', '>=', startTimestamp)
      .where('timestamp', '<=', endTimestamp)
      .orderBy('timestamp', 'desc')
      .limit(10000) // Limit to prevent memory issues
      .get();

    const logs = query.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate().toISOString()
    }));

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // Convert to CSV
      if (logs.length === 0) return '';

      const headers = Object.keys(logs[0] || {});
      const csvRows = [
        headers.join(','),
        ...logs.map(log =>
          headers.map(header => {
            const value = log[header as keyof typeof log];
            return typeof value === 'object' ? JSON.stringify(value) : String(value);
          }).join(',')
        )
      ];

      return csvRows.join('\n');
    }

  } catch (error) {
    logger.error('Log export failed', error as Error);
    throw error;
  }
}