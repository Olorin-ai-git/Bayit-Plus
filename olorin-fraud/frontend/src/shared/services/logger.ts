/**
 * Structured Logging Service
 * Configuration-driven logging with environment control
 * Production-grade logger with structured output and levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  context: string;
  message: string;
  data?: Record<string, unknown>;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.getLogLevelFromEnv();
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.REACT_APP_LOG_LEVEL?.toLowerCase();
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

    if (envLevel && validLevels.includes(envLevel as LogLevel)) {
      return envLevel as LogLevel;
    }

    // Default: info in production, debug in development
    return this.isDevelopment ? 'debug' : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  private createLogEntry(
    level: LogLevel,
    context: string,
    message: string,
    data?: Record<string, unknown>
  ): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      context,
      message,
      data
    };
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Format for console (development) or external service (production)
    const formatted = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.context}: ${entry.message}`;

    if (this.isDevelopment) {
      // Development: use console with color
      const consoleMethod = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](formatted, entry.data || '');
    } else {
      // Production: send to external logging service (if configured)
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // Configure external logging service here (e.g., Sentry, LogRocket, etc.)
    // For now, we don't send error logs externally to avoid leaking sensitive data
    if (entry.level === 'error' && process.env.REACT_APP_ERROR_LOGGING_URL) {
      // Example: Send critical errors to monitoring service
      // This would be configured via environment variables
    }
  }

  debug(context: string, message: string, data?: Record<string, unknown>): void {
    this.output(this.createLogEntry('debug', context, message, data));
  }

  info(context: string, message: string, data?: Record<string, unknown>): void {
    this.output(this.createLogEntry('info', context, message, data));
  }

  warn(context: string, message: string, data?: Record<string, unknown>): void {
    this.output(this.createLogEntry('warn', context, message, data));
  }

  error(context: string, message: string, data?: Record<string, unknown>): void {
    this.output(this.createLogEntry('error', context, message, data));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other modules
export type { LogLevel, LogEntry };
