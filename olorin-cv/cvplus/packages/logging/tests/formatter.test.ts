/**
 * T008: Log formatting test in packages/core/src/logging/__tests__/formatter.test.ts
 * CRITICAL: This test MUST FAIL before implementation
  */

import { LogFormatter } from '../LogFormatter';
import { LogLevel, LogEntry } from '../types';

describe('LogFormatter', () => {
  describe('formatLogEntry', () => {
    it('should format basic log entry', () => {
      const logEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Test log message',
        correlationId: 'test-123',
        domain: 'system',
        package: '@cvplus/core',
        context: {}
      };

      const formatted = LogFormatter.formatLogEntry(logEntry);

      expect(formatted).toMatchObject({
        '@timestamp': '2023-12-01T10:00:00.000Z',
        level: 'info',
        message: 'Test log message',
        correlationId: 'test-123',
        domain: 'system',
        package: '@cvplus/core',
        context: {}
      });
    });

    it('should format log entry with context data', () => {
      const logEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.ERROR,
        message: 'Error occurred',
        correlationId: 'error-456',
        domain: 'security',
        package: '@cvplus/auth',
        context: {
          userId: '12345',
          action: 'login',
          ip: '192.168.1.1'
        }
      };

      const formatted = LogFormatter.formatLogEntry(logEntry);

      expect(formatted.context).toMatchObject({
        userId: '12345',
        action: 'login',
        ip: '192.168.1.1'
      });
      expect(formatted.level).toBe('error');
      expect(formatted.domain).toBe('security');
    });

    it('should format log entry with error details', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\\n    at test.js:1:1';

      const logEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.ERROR,
        message: 'Unhandled error',
        correlationId: 'error-789',
        domain: 'system',
        package: '@cvplus/core',
        context: {},
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      };

      const formatted = LogFormatter.formatLogEntry(logEntry);

      expect(formatted.error).toMatchObject({
        name: 'Error',
        message: 'Test error message',
        stack: expect.stringContaining('Error: Test error message')
      });
    });

    it('should format log entry with performance metrics', () => {
      const logEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Operation completed',
        correlationId: 'perf-101',
        domain: 'performance',
        package: '@cvplus/cv-processing',
        context: {},
        performance: {
          duration: 1250,
          memoryUsage: 45678912,
          cpuUsage: 12.5
        }
      };

      const formatted = LogFormatter.formatLogEntry(logEntry);

      expect(formatted.performance).toMatchObject({
        duration: 1250,
        memoryUsage: 45678912,
        cpuUsage: 12.5
      });
    });
  });

  describe('formatForConsole', () => {
    it('should format log entry for console output', () => {
      const logEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Console test message',
        correlationId: 'console-123',
        domain: 'system',
        package: '@cvplus/core',
        context: { userId: '456' }
      };

      const formatted = LogFormatter.formatForConsole(logEntry);

      expect(formatted).toContain('[2023-12-01T10:00:00.000Z]');
      expect(formatted).toContain('[INFO]');
      expect(formatted).toContain('[system]');
      expect(formatted).toContain('[console-123]');
      expect(formatted).toContain('Console test message');
      expect(formatted).toContain('userId: 456');
    });

    it('should colorize log levels for console', () => {
      const infoEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.INFO,
        message: 'Info message',
        correlationId: 'info-123',
        domain: 'system',
        package: '@cvplus/core',
        context: {}
      };

      const errorEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.ERROR,
        message: 'Error message',
        correlationId: 'error-123',
        domain: 'system',
        package: '@cvplus/core',
        context: {}
      };

      const infoFormatted = LogFormatter.formatForConsole(infoEntry);
      const errorFormatted = LogFormatter.formatForConsole(errorEntry);

      // Check that different log levels have different formatting
      expect(infoFormatted).not.toBe(errorFormatted);
      expect(infoFormatted).toContain('[INFO]');
      expect(errorFormatted).toContain('[ERROR]');
    });
  });

  describe('formatForFile', () => {
    it('should format log entry for file output as JSON', () => {
      const logEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.WARN,
        message: 'File test message',
        correlationId: 'file-123',
        domain: 'business',
        package: '@cvplus/premium',
        context: { feature: 'billing' }
      };

      const formatted = LogFormatter.formatForFile(logEntry);
      const parsed = JSON.parse(formatted);

      expect(parsed).toMatchObject({
        '@timestamp': '2023-12-01T10:00:00.000Z',
        level: 'warn',
        message: 'File test message',
        correlationId: 'file-123',
        domain: 'business',
        package: '@cvplus/premium',
        context: { feature: 'billing' }
      });
    });

    it('should produce valid JSON for file logging', () => {
      const logEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.DEBUG,
        message: 'Debug with "quotes" and \\backslashes',
        correlationId: 'debug-456',
        domain: 'system',
        package: '@cvplus/core',
        context: {
          data: 'value with "nested quotes"'
        }
      };

      const formatted = LogFormatter.formatForFile(logEntry);

      expect(() => {
        JSON.parse(formatted);
      }).not.toThrow();
    });
  });

  describe('formatForFirebase', () => {
    it('should format log entry for Firebase Cloud Logging', () => {
      const logEntry: LogEntry = {
        timestamp: '2023-12-01T10:00:00.000Z',
        level: LogLevel.ERROR,
        message: 'Firebase logging test',
        correlationId: 'firebase-789',
        domain: 'security',
        package: '@cvplus/auth',
        context: { sessionId: 'session-123' }
      };

      const formatted = LogFormatter.formatForFirebase(logEntry);

      expect(formatted).toMatchObject({
        timestamp: '2023-12-01T10:00:00.000Z',
        severity: 'ERROR', // Firebase uses 'severity' instead of 'level'
        message: 'Firebase logging test',
        labels: {
          correlationId: 'firebase-789',
          domain: 'security',
          package: '@cvplus/auth'
        },
        jsonPayload: {
          context: { sessionId: 'session-123' }
        }
      });
    });

    it('should map log levels to Firebase severity levels', () => {
      const levels = [
        { input: LogLevel.DEBUG, expected: 'DEBUG' },
        { input: LogLevel.INFO, expected: 'INFO' },
        { input: LogLevel.WARN, expected: 'WARNING' },
        { input: LogLevel.ERROR, expected: 'ERROR' },
        { input: LogLevel.FATAL, expected: 'CRITICAL' }
      ];

      levels.forEach(({ input, expected }) => {
        const logEntry: LogEntry = {
          timestamp: '2023-12-01T10:00:00.000Z',
          level: input,
          message: 'Test message',
          correlationId: 'test-123',
          domain: 'system',
          package: '@cvplus/core',
          context: {}
        };

        const formatted = LogFormatter.formatForFirebase(logEntry);
        expect(formatted.severity).toBe(expected);
      });
    });
  });

  describe('sanitizeMessage', () => {
    it('should remove control characters from message', () => {
      const message = 'Test message\\n\\t\\r with control chars';
      const sanitized = LogFormatter.sanitizeMessage(message);

      expect(sanitized).toBe('Test message    with control chars');
    });

    it('should limit message length', () => {
      const longMessage = 'a'.repeat(10000);
      const sanitized = LogFormatter.sanitizeMessage(longMessage, 100);

      expect(sanitized.length).toBeLessThanOrEqual(100);
      expect(sanitized).toMatch(/a+\\.\\.\\.$/);
    });

    it('should preserve short messages', () => {
      const message = 'Short message';
      const sanitized = LogFormatter.sanitizeMessage(message);

      expect(sanitized).toBe(message);
    });
  });
});