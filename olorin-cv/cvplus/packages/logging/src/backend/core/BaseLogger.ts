/**
 * T021: Base logger implementation - Browser-compatible version
 * CVPlus Logging System - Core Logger Implementation
  */

import {
  ILogger,
  LogEntry,
  LogLevel,
  LogDomain,
  LoggerConfig,
  UserContext,
  PerformanceInfo,
  ErrorInfo,
  DEFAULT_LOGGER_CONFIG
} from '../types/index';
import { correlationManager, getCurrentCorrelationId, generateCorrelationId } from '../utils/correlation';
import { defaultFormatter } from '../utils/formatters';

// Browser-compatible Winston-like interface
interface SimpleLogger {
  log: (level: string | Record<string, any>, message?: string, meta?: Record<string, any>) => void;
  error: (message: string | Record<string, any>, meta?: Record<string, any>) => void;
  warn: (message: string | Record<string, any>, meta?: Record<string, any>) => void;
  info: (message: string | Record<string, any>, meta?: Record<string, any>) => void;
  debug: (message: string | Record<string, any>, meta?: Record<string, any>) => void;
  configure?: (config: Record<string, any>) => void;
  transports?: any[];
  level?: string;
  destroy?: () => void;
}

export class BaseLogger implements ILogger {
  protected winston: SimpleLogger;
  protected config: Required<LoggerConfig>;
  protected userContext: UserContext = {};
  protected contextOverrides: Record<string, any> = {};
  protected logEntries: LogEntry[] = [];
  private maxLogEntries: number = 1000;

  constructor(serviceName: string, config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config, service: serviceName };
    this.winston = this.createSimpleLogger();
  }

  /**
   * Create a browser-compatible simple logger (Winston fallback)
    */
  private createSimpleLogger(): SimpleLogger {
    const levelMap = {
      'error': 0,
      'warn': 1,
      'info': 2,
      'debug': 3
    };

    const currentLevel = levelMap[this.config.level as keyof typeof levelMap] ?? 2;

    const formatMessage = (level: string, message: string, meta?: Record<string, any>) => {
      const timestamp = new Date().toISOString();
      const correlationId = getCurrentCorrelationId();
      const corrStr = correlationId ? `[${correlationId.slice(0, 8)}]` : '';
      const metaStr = meta && Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} ${level.toUpperCase()} [${this.config.service}]${corrStr} ${message} ${metaStr}`.trim();
    };

    const logger: SimpleLogger = {
      log: (levelOrObj: string | Record<string, any>, message?: string, meta?: Record<string, any>) => {
        // Handle Winston-style call with object: logger.log({ level: 'error', message: 'msg', ...meta })
        if (typeof levelOrObj === 'object') {
          const { level, message: msg, ...metadata } = levelOrObj;
          if (this.config.enableConsole && levelMap[level as keyof typeof levelMap] <= currentLevel) {
            const formatted = formatMessage(level, msg, metadata);
            if (level === 'error') logger.error(formatted);
            else if (level === 'warn') logger.warn(formatted);
            else logger.info(formatted);
          }
        } else {
          // Handle simple call: logger.log('error', 'msg', metadata)
          const level = levelOrObj as string;
          if (this.config.enableConsole && levelMap[level as keyof typeof levelMap] <= currentLevel) {
            const formatted = formatMessage(level, message || '', meta);
            if (level === 'error') logger.error(formatted);
            else if (level === 'warn') logger.warn(formatted);
            else logger.info(formatted);
          }
        }
      },
      error: (messageOrObj: string | Record<string, any>, meta?: Record<string, any>) => {
        if (typeof messageOrObj === 'object') {
          const { message, ...metadata } = messageOrObj;
          if (this.config.enableConsole) logger.error(formatMessage('error', message, metadata));
        } else {
          if (this.config.enableConsole) logger.error(formatMessage('error', messageOrObj, meta));
        }
      },
      warn: (messageOrObj: string | Record<string, any>, meta?: Record<string, any>) => {
        if (typeof messageOrObj === 'object') {
          const { message, ...metadata } = messageOrObj;
          if (this.config.enableConsole) logger.warn(formatMessage('warn', message, metadata));
        } else {
          if (this.config.enableConsole) logger.warn(formatMessage('warn', messageOrObj, meta));
        }
      },
      info: (messageOrObj: string | Record<string, any>, meta?: Record<string, any>) => {
        if (typeof messageOrObj === 'object') {
          const { message, ...metadata } = messageOrObj;
          if (this.config.enableConsole) logger.info(formatMessage('info', message, metadata));
        } else {
          if (this.config.enableConsole) logger.info(formatMessage('info', messageOrObj, meta));
        }
      },
      debug: (messageOrObj: string | Record<string, any>, meta?: Record<string, any>) => {
        if (typeof messageOrObj === 'object') {
          const { message, ...metadata } = messageOrObj;
          if (this.config.enableConsole) logger.info(formatMessage('debug', message, metadata));
        } else {
          if (this.config.enableConsole) logger.info(formatMessage('debug', messageOrObj, meta));
        }
      },
      configure: (config: Record<string, any>) => {
        // No-op for browser compatibility
      },
      transports: [],
      level: this.config.level,
      destroy: () => {
        // No-op for browser compatibility
      }
    };

    return logger;
  }

  // Dummy createWinstonLogger that returns our simple logger
  private createWinstonLogger(): SimpleLogger {
    return this.createSimpleLogger();
  }

  // Override to use simple logger
  private createWinstonLogger_OLD(): SimpleLogger {
    const transports: any[] = [];

    // Console transport (browser-compatible)
    if (this.config.enableConsole) {
      // Browser doesn't support File transports
    }

    return this.createSimpleLogger();
  }

  // Dummy properties to maintain compatibility
  private getDummyWinstonLogger(): any {
    return this.createSimpleLogger();
  }

  // Keep the old structure for compatibility
  protected _getDefaultMeta(): any {
    return {
      service: this.config.service,
      environment: this.config.environment,
      ...this.getContextualMetadata()
    };
  }

  /**
   * Generate unique log ID
    */
  private generateLogId(): string {
    const timestamp = Date.now();
    return `${this.config.service}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get contextual metadata
    */
  private getContextualMetadata(): Record<string, any> {
    return {
      ...this.config.metadata || {},
      ...this.contextOverrides
    };
  }

  /**
   * Set context for this logger instance
    */
  setContext(context: Record<string, any>): void {
    this.contextOverrides = { ...this.contextOverrides, ...context };
  }

  /**
   * Clear all context overrides
    */
  clearContext(): void {
    this.contextOverrides = {};
  }

  /**
   * Core logging implementation
    */
  log(level: LogLevel, message: string, context: Record<string, any> = {}, error?: Error): string {
    const correlationId = getCurrentCorrelationId() || generateCorrelationId();
    const timestamp = Date.now();
    const id = this.generateLogId();

    // Build complete context
    const fullContext = {
      ...this.getContextualMetadata(),
      ...context,
      ...this.buildUserContext()
    };

    // Build error info if provided
    const errorInfo: ErrorInfo | undefined = error ? {
      message: error.message,
      name: error.name,
      code: (error as any).code,
      stack: error.stack,
      details: (error as any).details
    } : undefined;

    // Create log entry
    const logEntry: LogEntry = {
      id,
      level,
      domain: context.domain || LogDomain.SYSTEM,
      message,
      context: fullContext,
      error: errorInfo,
      performance: context.performance,
      timestamp,
      correlationId,
      service: this.config.service,
      source: context.source
    };

    // Store entry for retrieval
    this.storeLogEntry(logEntry);

    // Log with Winston
    this.winston.log({
      level,
      message,
      ...fullContext,
      correlationId,
      timestamp,
      domain: logEntry.domain,
      error: errorInfo,
      performance: logEntry.performance
    });

    return correlationId;
  }

  /**
   * Error level logging
    */
  error(message: string, context: Record<string, any> = {}, error?: Error): string {
    return this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Warning level logging
    */
  warn(message: string, context: Record<string, any> = {}): string {
    return this.log(LogLevel.WARN, message, context);
  }

  /**
   * Info level logging
    */
  info(message: string, context: Record<string, any> = {}): string {
    return this.log(LogLevel.INFO, message, context);
  }

  /**
   * Debug level logging
    */
  debug(message: string, context: Record<string, any> = {}): string {
    return this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Create logger with additional context
    */
  withContext(context: Record<string, any>): ILogger {
    const newLogger = new BaseLogger(this.config.service, this.config);
    newLogger.contextOverrides = { ...this.contextOverrides, ...context };
    newLogger.userContext = { ...this.userContext };
    return newLogger;
  }

  /**
   * Execute callback with correlation ID
    */
  withCorrelation(correlationId: string, callback: () => string): string {
    return correlationManager.withCorrelation(correlationId, callback);
  }

  /**
   * Set user context for all subsequent logs
    */
  setUserContext(userContext: UserContext): void {
    this.userContext = { ...this.userContext, ...userContext };
  }

  /**
   * Log performance metrics
    */
  performanceMetric(metric: string, value: number, context: Record<string, any> = {}): string {
    const perfContext = {
      ...context,
      domain: LogDomain.PERFORMANCE,
      metric,
      performance: { value, ...context.performance }
    };

    return this.info(`Performance metric: ${metric}`, perfContext);
  }

  /**
   * Log business events
    */
  businessEvent(event: string, context: Record<string, any> = {}): string {
    const businessContext = {
      ...context,
      domain: LogDomain.BUSINESS,
      event
    };

    return this.info(`Business event: ${event}`, businessContext);
  }

  /**
   * Log security events
    */
  securityEvent(event: string, context: Record<string, any> = {}): string {
    const securityContext = {
      ...context,
      domain: LogDomain.SECURITY,
      event
    };

    return this.warn(`Security event: ${event}`, securityContext);
  }

  /**
   * Log audit events
    */
  auditEvent(event: string, context: Record<string, any> = {}): string {
    const auditContext = {
      ...context,
      domain: LogDomain.AUDIT,
      event
    };

    return this.info(`Audit event: ${event}`, auditContext);
  }

  /**
   * Get last log entry
    */
  getLastLogEntry(): LogEntry | null {
    return this.logEntries.length > 0 ? this.logEntries[this.logEntries.length - 1] : null;
  }

  /**
   * Get all stored log entries
    */
  getAllLogEntries(): LogEntry[] {
    return [...this.logEntries];
  }

  /**
   * Clear stored log entries
    */
  clearEntries(): void {
    this.logEntries = [];
  }

  /**
   * Store log entry with size management
    */
  private storeLogEntry(entry: LogEntry): void {
    this.logEntries.push(entry);

    // Maintain max entries limit
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.maxLogEntries);
    }
  }

  /**
   * Build user context for logging
    */
  private buildUserContext(): Record<string, any> {
    const context: Record<string, any> = {};

    if (this.userContext.userId) {
      context.userId = this.userContext.userId;
    }

    if (this.userContext.tier) {
      context.tier = this.userContext.tier;
    }

    if (this.userContext.role) {
      context.role = this.userContext.role;
    }

    if (this.userContext.experimentGroups?.length) {
      context.experimentGroups = this.userContext.experimentGroups;
    }

    // Note: Sensitive data like email and sessionId are excluded from context
    // They will be redacted by the formatter if needed

    return context;
  }

  /**
   * Update logger configuration
    */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.winston.configure) {
      this.winston.configure({
        level: this.config.level,
        transports: this.winston.transports || []
      });
    }
  }

  /**
   * Set log level
    */
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.winston.level = level;
  }

  /**
   * Check if level is enabled
    */
  isLevelEnabled(level: LogLevel): boolean {
    const levels = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 1,
      [LogLevel.INFO]: 2,
      [LogLevel.DEBUG]: 3,
      [LogLevel.FATAL]: 0  // FATAL has same priority as ERROR
    };
    const currentLevel = levels[this.config.level];
    const checkLevel = levels[level];
    return checkLevel <= currentLevel;
  }

  /**
   * Destroy logger and clean up resources
    */
  destroy(): void {
    if (this.winston.destroy) {
      this.winston.destroy();
    }
    this.logEntries = [];
  }
}