/**
 * Frontend Console Logger
 * Feature: 021-live-merged-logstream
 *
 * Intercepts browser console methods and creates UnifiedLog entries.
 * Buffers logs for backend ingestion with configuration-driven filtering.
 *
 * Author: Gil Klainert
 * Date: 2025-11-12
 * Spec: /specs/021-live-merged-logstream/research.md
 */

import {
  UnifiedLogCreate,
  LogLevel,
  createFrontendLog
} from '../types/unified-log';
import { getLogStreamConfig } from '../../config/logstream-config';
import {
  formatConsoleMessage,
  extractConsoleContext,
  shouldCaptureLogLevel
} from './console-logger-utils';

/**
 * Original console methods (stored before interception)
 */
interface OriginalConsoleMethods {
  log: typeof console.log;
  error: typeof console.error;
  warn: typeof console.warn;
  info: typeof console.info;
  debug: typeof console.debug;
}

/**
 * Console logger configuration
 */
export interface ConsoleLoggerConfig {
  investigationId: string;
  serviceName?: string;
  correlationId?: string;
  minLevel?: LogLevel;
  maxBufferSize?: number;
}

/**
 * Frontend console logger for capturing browser console output
 *
 * Intercepts console methods (log, error, warn, info, debug) and creates
 * UnifiedLog entries that can be sent to backend for merged log streaming.
 */
export class ConsoleLogger {
  private readonly config: ConsoleLoggerConfig;
  private readonly buffer: UnifiedLogCreate[] = [];
  private readonly original: OriginalConsoleMethods;
  private isIntercepting = false;
  private sequenceCounter = 0;

  constructor(config: ConsoleLoggerConfig) {
    this.config = {
      serviceName: 'react-app',
      minLevel: 'INFO',
      maxBufferSize: getLogStreamConfig().ui.pauseBufferSize,
      ...config
    };

    this.original = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console)
    };
  }

  /**
   * Start intercepting console methods
   */
  start(): void {
    if (this.isIntercepting) {
      return;
    }

    console.log = this.createInterceptor('INFO', this.original.log);
    console.error = this.createInterceptor('ERROR', this.original.error);
    console.warn = this.createInterceptor('WARN', this.original.warn);
    console.info = this.createInterceptor('INFO', this.original.info);
    console.debug = this.createInterceptor('DEBUG', this.original.debug);

    this.isIntercepting = true;
  }

  /**
   * Stop intercepting and restore original console methods
   */
  stop(): void {
    if (!this.isIntercepting) {
      return;
    }

    console.log = this.original.log;
    console.error = this.original.error;
    console.warn = this.original.warn;
    console.info = this.original.info;
    console.debug = this.original.debug;

    this.isIntercepting = false;
  }

  /**
   * Create interceptor function for a console method
   */
  private createInterceptor(
    level: LogLevel,
    originalMethod: Function
  ): (...args: any[]) => void {
    return (...args: any[]) => {
      if (shouldCaptureLogLevel(level, this.config.minLevel)) {
        this.captureLog(level, args);
      }
      originalMethod(...args);
    };
  }

  /**
   * Capture console log and create UnifiedLog entry
   */
  private captureLog(level: LogLevel, args: any[]): void {
    const message = formatConsoleMessage(args);

    if (message.length === 0) {
      return;
    }

    const context = extractConsoleContext(args);

    const logEntry = createFrontendLog({
      level,
      message,
      investigation_id: this.config.investigationId,
      service: this.config.serviceName,
      correlation_id: this.config.correlationId,
      context
    });

    logEntry.seq = this.sequenceCounter++;

    this.addToBuffer(logEntry);
  }

  /**
   * Add log to buffer with size management
   */
  private addToBuffer(logEntry: UnifiedLogCreate): void {
    this.buffer.push(logEntry);

    if (this.buffer.length > (this.config.maxBufferSize || 1000)) {
      this.buffer.shift();
    }
  }

  /**
   * Get all buffered logs and clear buffer
   */
  flushLogs(): UnifiedLogCreate[] {
    return this.buffer.splice(0, this.buffer.length);
  }

  /**
   * Get buffered logs without clearing
   */
  peekLogs(): ReadonlyArray<UnifiedLogCreate> {
    return this.buffer;
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Clear buffer without returning logs
   */
  clearBuffer(): void {
    this.buffer.length = 0;
  }
}

/**
 * Create and configure console logger instance
 */
export function createConsoleLogger(
  config: ConsoleLoggerConfig
): ConsoleLogger {
  return new ConsoleLogger(config);
}
