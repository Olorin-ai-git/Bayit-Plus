/**
 * T022: LoggerFactory implementation
 * CVPlus Logging System - Logger Factory for Service Management
  */

import {
  LoggerConfig,
  LoggerFactoryConfig,
  LogLevel,
  DEFAULT_FACTORY_CONFIG,
  ILogger
} from './types/index';
import { BaseLogger } from './core/BaseLogger';

export class LoggerFactory {
  private static loggers: Map<string, BaseLogger> = new Map();
  private static config: Required<LoggerFactoryConfig> = DEFAULT_FACTORY_CONFIG;
  private static initialized = false;

  /**
   * Initialize the factory with global configuration
    */
  static initialize(config: Partial<LoggerFactoryConfig> = {}): void {
    LoggerFactory.config = { ...DEFAULT_FACTORY_CONFIG, ...config };
    LoggerFactory.initialized = true;
  }

  /**
   * Create or retrieve a logger for a service
    */
  static createLogger(serviceName: string, config: Partial<LoggerConfig> = {}): BaseLogger {
    // Ensure factory is initialized
    if (!LoggerFactory.initialized) {
      LoggerFactory.initialize();
    }

    // Return existing logger if found
    if (LoggerFactory.loggers.has(serviceName)) {
      return LoggerFactory.loggers.get(serviceName)!;
    }

    // Merge service config with factory defaults
    const mergedConfig: Partial<LoggerConfig> = {
      level: LoggerFactory.config.defaultLevel,
      enableConsole: true,
      enableFile: false,
      enableFirebase: false,
      redactPII: LoggerFactory.config.enablePIIRedaction,
      metadata: { ...LoggerFactory.config.globalContext },
      ...config
    };

    // Create new logger
    const logger = new BaseLogger(serviceName, mergedConfig);

    // Store for future retrieval
    LoggerFactory.loggers.set(serviceName, logger);

    return logger;
  }

  /**
   * Get existing logger by service name
    */
  static getLogger(serviceName: string): BaseLogger {
    const logger = LoggerFactory.loggers.get(serviceName);
    if (!logger) {
      throw new Error(`Logger not found for service: ${serviceName}`);
    }
    return logger;
  }

  /**
   * Check if logger exists for service
    */
  static hasLogger(serviceName: string): boolean {
    return LoggerFactory.loggers.has(serviceName);
  }

  /**
   * Get all registered loggers
    */
  static getAllLoggers(): Record<string, BaseLogger> {
    const result: Record<string, BaseLogger> = {};
    LoggerFactory.loggers.forEach((logger, serviceName) => {
      result[serviceName] = logger;
    });
    return result;
  }

  /**
   * Update log level for specific logger
    */
  static updateLogLevel(serviceName: string, level: LogLevel): void;
  static updateLogLevel(level: LogLevel): void;
  static updateLogLevel(serviceNameOrLevel: string | LogLevel, level?: LogLevel): void {
    if (typeof serviceNameOrLevel === 'string' && level) {
      // Update specific logger
      const logger = LoggerFactory.loggers.get(serviceNameOrLevel);
      if (logger) {
        logger.setLevel(level);
      }
    } else if (typeof serviceNameOrLevel === 'string' && !level) {
      // Update all loggers
      const newLevel = serviceNameOrLevel as LogLevel;
      LoggerFactory.loggers.forEach(logger => {
        logger.setLevel(newLevel);
      });
      LoggerFactory.config.defaultLevel = newLevel;
    }
  }

  /**
   * Remove logger for service
    */
  static removeLogger(serviceName: string): boolean {
    const logger = LoggerFactory.loggers.get(serviceName);
    if (logger) {
      logger.destroy();
      LoggerFactory.loggers.delete(serviceName);
      return true;
    }
    return false;
  }

  /**
   * Clear all loggers
    */
  static reset(): void {
    LoggerFactory.loggers.forEach(logger => {
      logger.destroy();
    });
    LoggerFactory.loggers.clear();
  }

  /**
   * Get factory configuration
    */
  static getConfig(): Required<LoggerFactoryConfig> {
    return { ...LoggerFactory.config };
  }

  /**
   * Update factory configuration
    */
  static updateConfig(newConfig: Partial<LoggerFactoryConfig>): void {
    LoggerFactory.config = { ...LoggerFactory.config, ...newConfig };

    // Apply configuration changes to existing loggers
    if (newConfig.defaultLevel) {
      LoggerFactory.loggers.forEach(logger => {
        logger.setLevel(newConfig.defaultLevel!);
      });
    }
  }

  /**
   * Get logger count
    */
  static getLoggerCount(): number {
    return LoggerFactory.loggers.size;
  }

  /**
   * Get logger names
    */
  static getLoggerNames(): string[] {
    return Array.from(LoggerFactory.loggers.keys());
  }

  /**
   * Create logger with Winston-compatible interface
    */
  static createWinstonLogger(serviceName: string, config: Partial<LoggerConfig> = {}): any {
    const logger = LoggerFactory.createLogger(serviceName, config);
    return (logger as any).winston;
  }

  /**
   * Batch create loggers for multiple services
    */
  static createLoggers(
    services: Array<{ name: string; config?: Partial<LoggerConfig> }>
  ): Record<string, BaseLogger> {
    const result: Record<string, BaseLogger> = {};

    services.forEach(({ name, config = {} }) => {
      result[name] = LoggerFactory.createLogger(name, config);
    });

    return result;
  }

  /**
   * Health check for all loggers
    */
  static healthCheck(): {
    healthy: boolean;
    loggerCount: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let healthy = true;

    try {
      // Check if loggers are responding
      LoggerFactory.loggers.forEach((logger, serviceName) => {
        try {
          // Test if logger can create log entries
          logger.debug('Health check test log', { healthCheck: true });
        } catch (error) {
          issues.push(`Logger ${serviceName} failed health check: ${(error as Error).message}`);
          healthy = false;
        }
      });

      // Check factory state
      if (!LoggerFactory.initialized) {
        issues.push('LoggerFactory not initialized');
        healthy = false;
      }

    } catch (error) {
      issues.push(`Health check failed: ${(error as Error).message}`);
      healthy = false;
    }

    return {
      healthy,
      loggerCount: LoggerFactory.loggers.size,
      issues
    };
  }

  /**
   * Create specialized logger with predefined configuration
    */
  static createSpecializedLogger(
    serviceName: string,
    specialization: 'security' | 'performance' | 'audit' | 'business',
    config: Partial<LoggerConfig> = {}
  ): BaseLogger {
    const specializationConfigs = {
      security: {
        level: LogLevel.WARN,
        enableFile: true,
        filePath: './logs/security.log',
        metadata: { specialization: 'security' }
      },
      performance: {
        level: LogLevel.INFO,
        enableFile: true,
        filePath: './logs/performance.log',
        metadata: { specialization: 'performance' }
      },
      audit: {
        level: LogLevel.INFO,
        enableFile: true,
        filePath: './logs/audit.log',
        metadata: { specialization: 'audit' }
      },
      business: {
        level: LogLevel.INFO,
        enableFile: true,
        filePath: './logs/business.log',
        metadata: { specialization: 'business' }
      }
    };

    const specializationConfig = specializationConfigs[specialization];
    const mergedConfig = { ...specializationConfig, ...config };

    return LoggerFactory.createLogger(`${serviceName}-${specialization}`, mergedConfig);
  }

  /**
   * Graceful shutdown - flush and close all loggers
    */
  static async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    LoggerFactory.loggers.forEach(logger => {
      shutdownPromises.push(
        new Promise<void>((resolve) => {
          try {
            logger.destroy();
            resolve();
          } catch (error) {
            // Log error but continue shutdown
            logger.error(`Error shutting down logger:`, error instanceof Error ? error : new Error(String(error)));
            resolve();
          }
        })
      );
    });

    await Promise.all(shutdownPromises);
    LoggerFactory.loggers.clear();
  }
}