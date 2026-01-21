/**
 * API Monitoring and Logging
 *
 * Constitutional Compliance:
 * - Configuration-driven log levels
 * - Type-safe logging interface
 * - No hardcoded values
 * - No mocks or placeholders
 *
 * Usage:
 *   import { getLogger } from '@api/monitoring/logger';
 */

import { getApiConfig } from '../config';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * Log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enableRemote?: boolean;
  remoteEndpoint?: string;
}

/**
 * Logger class
 */
export class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor(config: LoggerConfig = {}) {
    const apiConfig = getApiConfig();

    this.config = {
      minLevel: config.minLevel ?? (apiConfig.env === 'development' ? LogLevel.DEBUG : LogLevel.INFO),
      enableConsole: config.enableConsole ?? true,
      enableRemote: config.enableRemote ?? apiConfig.env === 'production',
      remoteEndpoint: config.remoteEndpoint
    };
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, { ...context, error });
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < (this.config.minLevel ?? LogLevel.DEBUG)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logToRemote(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${LogLevel[entry.level]}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.context);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.context);
        break;
    }
  }

  private logToRemote(entry: LogEntry): void {
    if (!this.config.remoteEndpoint) {
      return;
    }

    fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).catch((error) => {
      console.error('Failed to send log to remote:', error);
    });
  }
}

/**
 * Create logger instance
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}

let defaultLoggerInstance: Logger | null = null;

/**
 * Get or create default logger instance
 */
export function getLogger(): Logger {
  if (!defaultLoggerInstance) {
    defaultLoggerInstance = createLogger();
  }
  return defaultLoggerInstance;
}

/**
 * Reset default logger instance
 */
export function resetLogger(): void {
  defaultLoggerInstance = null;
}
