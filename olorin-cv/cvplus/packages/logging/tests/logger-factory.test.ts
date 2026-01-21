/**
 * T005: Logger factory test in packages/core/src/logging/__tests__/logger-factory.test.ts
 * CRITICAL: This test MUST FAIL before implementation
  */

import { LoggerFactory } from '../LoggerFactory';
import { LogLevel } from '../types';

describe('LoggerFactory', () => {
  beforeEach(() => {
    // Clear any existing loggers before each test
    LoggerFactory.reset();
  });

  afterEach(() => {
    LoggerFactory.reset();
  });

  describe('createLogger', () => {
    it('should create a Winston logger with proper configuration', () => {
      const logger = LoggerFactory.createLogger('test-service');

      expect(logger).toBeDefined();
      expect(logger.level).toBe('info'); // Default log level
      expect(logger.format).toBeDefined();
      expect(logger.transports).toBeDefined();
      expect(logger.transports).toHaveLength(2); // Console + File
    });

    it('should create logger with custom configuration', () => {
      const config = {
        level: LogLevel.DEBUG,
        service: 'custom-service',
        environment: 'test'
      };

      const logger = LoggerFactory.createLogger('custom-service', config);

      expect(logger.level).toBe('debug');
      expect(logger.defaultMeta).toMatchObject({
        service: 'custom-service',
        environment: 'test'
      });
    });

    it('should return same logger instance for same service name', () => {
      const logger1 = LoggerFactory.createLogger('same-service');
      const logger2 = LoggerFactory.createLogger('same-service');

      expect(logger1).toBe(logger2);
    });

    it('should create different loggers for different service names', () => {
      const logger1 = LoggerFactory.createLogger('service-1');
      const logger2 = LoggerFactory.createLogger('service-2');

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('getLogger', () => {
    it('should return existing logger if found', () => {
      const createdLogger = LoggerFactory.createLogger('existing-service');
      const retrievedLogger = LoggerFactory.getLogger('existing-service');

      expect(retrievedLogger).toBe(createdLogger);
    });

    it('should throw error if logger not found', () => {
      expect(() => {
        LoggerFactory.getLogger('non-existent-service');
      }).toThrow('Logger not found for service: non-existent-service');
    });
  });

  describe('getAllLoggers', () => {
    it('should return all created loggers', () => {
      LoggerFactory.createLogger('service-1');
      LoggerFactory.createLogger('service-2');
      LoggerFactory.createLogger('service-3');

      const allLoggers = LoggerFactory.getAllLoggers();

      expect(Object.keys(allLoggers)).toHaveLength(3);
      expect(allLoggers).toHaveProperty('service-1');
      expect(allLoggers).toHaveProperty('service-2');
      expect(allLoggers).toHaveProperty('service-3');
    });
  });

  describe('updateLogLevel', () => {
    it('should update log level for specific logger', () => {
      LoggerFactory.createLogger('test-service');

      LoggerFactory.updateLogLevel('test-service', LogLevel.ERROR);
      const logger = LoggerFactory.getLogger('test-service');

      expect(logger.level).toBe('error');
    });

    it('should update log level for all loggers', () => {
      LoggerFactory.createLogger('service-1');
      LoggerFactory.createLogger('service-2');

      LoggerFactory.updateLogLevel(LogLevel.WARN);

      const logger1 = LoggerFactory.getLogger('service-1');
      const logger2 = LoggerFactory.getLogger('service-2');

      expect(logger1.level).toBe('warn');
      expect(logger2.level).toBe('warn');
    });
  });

  describe('reset', () => {
    it('should clear all loggers', () => {
      LoggerFactory.createLogger('service-1');
      LoggerFactory.createLogger('service-2');

      expect(Object.keys(LoggerFactory.getAllLoggers())).toHaveLength(2);

      LoggerFactory.reset();

      expect(Object.keys(LoggerFactory.getAllLoggers())).toHaveLength(0);
    });
  });
});