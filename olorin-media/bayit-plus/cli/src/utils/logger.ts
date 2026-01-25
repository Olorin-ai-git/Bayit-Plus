/**
 * Structured logging utilities for Olorin CLI
 *
 * Uses proper logging system (no console.log in production)
 */

import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = process.env.OLORIN_CLI_LOG_LEVEL?.toUpperCase() || 'INFO';
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', chalk.gray(message), meta);
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', chalk.blue(message), meta);
    }
  }

  success(message: string, meta?: Record<string, any>): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', chalk.green(message), meta);
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', chalk.yellow(message), meta);
    }
  }

  error(message: string, meta?: Record<string, any>): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', chalk.red(message), meta);
    }
  }

  private log(level: string, message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';

    // Structured logging format
    process.stderr.write(`[${timestamp}] ${level}: ${message}${metaStr}\n`);
  }
}

export const logger = new Logger();
