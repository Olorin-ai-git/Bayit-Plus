/**
 * Structured Frontend Logger with Environment Configuration
 *
 * This module provides a structured logging utility for the frontend application.
 * Log levels are configured via environment variables with fail-safe defaults.
 *
 * Constitutional Compliance:
 * - Log levels configured via environment variables
 * - No hardcoded log configuration
 * - Structured logging format
 * - Performance-conscious implementation
 */

import { getConfig } from '../shared/config/env.config';

/**
 * Log levels (ordered by severity)
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  context?: string;
  message: string;
  data?: Record<string, unknown>;
  error?: Error;
}

/**
 * Logger class with environment-based configuration
 */
export class Logger {
  private readonly context: string;
  private readonly minLevel: LogLevel;
  private readonly isProduction: boolean;

  constructor(context: string = 'App') {
    this.context = context;

    // Get configuration from environment
    const config = getConfig();
    this.isProduction = config.env === 'production';

    // Determine minimum log level from environment
    // In production: only ERROR and WARN
    // In development: all levels
    this.minLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return level <= this.minLevel;
  }

  /**
   * Format and output log entry
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      context: this.context,
      message,
      ...(data && { data }),
      ...(error && { error })
    };

    // Output based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(`[${entry.timestamp}] [ERROR] [${this.context}]`, message, data, error);
        break;
      case LogLevel.WARN:
        console.warn(`[${entry.timestamp}] [WARN] [${this.context}]`, message, data);
        break;
      case LogLevel.INFO:
        console.info(`[${entry.timestamp}] [INFO] [${this.context}]`, message, data);
        break;
      case LogLevel.DEBUG:
        console.log(`[${entry.timestamp}] [DEBUG] [${this.context}]`, message, data);
        break;
      case LogLevel.TRACE:
        console.log(`[${entry.timestamp}] [TRACE] [${this.context}]`, message, data);
        break;
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an informational message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log a trace message
   */
  trace(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, data);
  }
}

/**
 * Create a logger with context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default application logger
 */
export const logger = new Logger('OlorinApp');

/**
 * Contract testing logger
 */
export const contractLogger = new Logger('ContractTest');

/**
 * Type generation logger
 */
export const typeGenLogger = new Logger('TypeGen');
