// @ts-ignore - Export conflicts/**
 * Multimedia Logger Utility
 * 
 * Centralized logging for multimedia services with structured logging,
 * log levels, and performance tracking capabilities.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: string;
  timestamp: Date;
  data?: any;
  performanceMetrics?: {
    duration?: number;
    memoryUsage?: number;
    operationType?: string;
  };
}

/**
 * Logger class for multimedia services
 */
export class Logger {
  private readonly context: string;
  private readonly logLevel: LogLevel;
  private readonly enableConsoleOutput: boolean;
  private readonly enableFileOutput: boolean;
  private readonly logEntries: LogEntry[] = [];

  constructor(
    context: string,
    options: {
      logLevel?: LogLevel;
      enableConsoleOutput?: boolean;
      enableFileOutput?: boolean;
      maxLogEntries?: number;
    } = {}
  ) {
    this.context = context;
    this.logLevel = options.logLevel ?? LogLevel.INFO;
    this.enableConsoleOutput = options.enableConsoleOutput ?? true;
    this.enableFileOutput = options.enableFileOutput ?? false;
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log info message
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log error message
   */
  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log with performance metrics
   */
  public performance(
    message: string,
    operationType: string,
    duration: number,
    data?: any
  ): void {
    const performanceMetrics = {
      duration,
      memoryUsage: this.getMemoryUsage(),
      operationType
    };

    this.log(LogLevel.INFO, message, data, performanceMetrics);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: any,
    performanceMetrics?: any
  ): void {
    if (level < this.logLevel) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      context: this.context,
      timestamp: new Date(),
      data,
      performanceMetrics
    };

    // Store log entry
    this.logEntries.push(logEntry);

    // Output to console if enabled
    if (this.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }

    // Output to file if enabled
    if (this.enableFileOutput) {
      this.outputToFile(logEntry);
    }

    // Trim log entries if needed
    if (this.logEntries.length > 1000) {
      this.logEntries.splice(0, 100); // Remove oldest 100 entries
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] ${levelName} [${entry.context}]`;

    const logMethod = this.getConsoleMethod(entry.level);
    
    if (entry.data || entry.performanceMetrics) {
      logMethod(`${prefix} ${entry.message}`, {
        data: entry.data,
        performance: entry.performanceMetrics
      });
    } else {
      logMethod(`${prefix} ${entry.message}`);
    }
  }

  /**
   * Output log entry to file (placeholder)
   */
  private outputToFile(entry: LogEntry): void {
    // File output implementation would go here
    // For now, this is a placeholder
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): Function {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Get recent log entries
   */
  public getRecentLogs(count: number = 50): LogEntry[] {
    return this.logEntries.slice(-count);
  }

  /**
   * Get logs by level
   */
  public getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level);
  }

  /**
   * Get error logs
   */
  public getErrorLogs(): LogEntry[] {
    return this.getLogsByLevel(LogLevel.ERROR);
  }

  /**
   * Clear log entries
   */
  public clearLogs(): void {
    this.logEntries.length = 0;
  }

  /**
   * Export logs as JSON
   */
  public exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }
}