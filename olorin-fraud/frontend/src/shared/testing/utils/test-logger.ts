export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export class TestLogger {
  private entries: LogEntry[] = [];
  private minLevel: LogLevel = 'INFO';

  constructor(verboseMode: boolean = false) {
    this.minLevel = verboseMode ? 'DEBUG' : 'INFO';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('DEBUG')) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message,
        context,
      };
      this.entries.push(entry);
      console.log(this.formatMessage('DEBUG', message), context || '');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('INFO')) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        context,
      };
      this.entries.push(entry);
      console.log(this.formatMessage('INFO', message), context || '');
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('WARN')) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        context,
      };
      this.entries.push(entry);
      console.warn(this.formatMessage('WARN', message), context || '');
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      context,
    };
    this.entries.push(entry);
    console.error(this.formatMessage('ERROR', message), context || '');
  }

  success(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('INFO')) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        context,
      };
      this.entries.push(entry);
      console.log(`✓ ${this.formatMessage('INFO', message)}`, context || '');
    }
  }

  failure(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      context,
    };
    this.entries.push(entry);
    console.error(`✗ ${this.formatMessage('ERROR', message)}`, context || '');
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getAllLogs(): string {
    return this.entries
      .map((entry) => {
        const contextStr = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
        return `${entry.timestamp} [${entry.level}] ${entry.message}${contextStr}`;
      })
      .join('\n');
  }
}
