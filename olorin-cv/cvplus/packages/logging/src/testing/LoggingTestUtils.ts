/**
 * Advanced testing utilities for the CVPlus logging system
 * Provides comprehensive test helpers, mocks, and validation tools
  */

import { EventEmitter } from 'events';
import { logger } from '@cvplus/core';
import { LogLevel, LogMetadata, CorrelationContext } from '../backend/types/index';
import { LogEntry } from '../backend/models/LogEntry';

/**
 * Mock log entry generator for testing
  */
export class MockLogGenerator {
  private sequenceNumber: number = 0;
  private baseTimestamp: Date = new Date();

  constructor(private options: {
    serviceName?: string;
    baseCorrelationId?: string;
    userIdPrefix?: string;
  } = {}) {}

  /**
   * Generate a single mock log entry
    */
  generateLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
    this.sequenceNumber++;

    const entryData = {
      id: `mock-${this.sequenceNumber}-${Date.now()}`,
      timestamp: new Date(this.baseTimestamp.getTime() + this.sequenceNumber * 1000),
      level: this.randomLogLevel(),
      message: this.generateMessage(),
      service: this.options.serviceName || this.randomService(),
      correlationId: this.options.baseCorrelationId || this.generateCorrelationId(),
      userId: this.generateUserId(),
      metadata: this.generateMetadata(),
      context: this.generateContext(),
      tags: this.generateTags(),
      source: {
        file: this.generateFilename(),
        line: Math.floor(Math.random() * 1000) + 1,
        function: this.generateFunctionName()
      },
      performance: {
        duration: Math.floor(Math.random() * 1000),
        memoryUsage: Math.floor(Math.random() * 100) * 1024 * 1024
      },
      ...overrides
    };

    return new LogEntry(entryData);
  }

  /**
   * Generate multiple log entries
    */
  generateLogEntries(count: number, baseOverrides: Partial<LogEntry> = {}): LogEntry[] {
    return Array.from({ length: count }, () => this.generateLogEntry(baseOverrides));
  }

  /**
   * Generate log entries with specific patterns for testing
    */
  generatePatternedLogs(patterns: {
    errorBurst?: { count: number; timeSpanMs: number };
    serviceLoad?: { service: string; requestsPerSecond: number; durationSeconds: number };
    userJourney?: { userId: string; steps: string[]; delayBetweenStepsMs: number };
    performanceDegradation?: { baseResponseTime: number; degradationFactor: number; count: number };
  }): LogEntry[] {
    const logs: LogEntry[] = [];

    if (patterns.errorBurst) {
      const { count, timeSpanMs } = patterns.errorBurst;
      const interval = timeSpanMs / count;

      for (let i = 0; i < count; i++) {
        logs.push(this.generateLogEntry({
          level: LogLevel.ERROR,
          timestamp: new Date(this.baseTimestamp.getTime() + i * interval),
          message: `Error burst event ${i + 1}`,
          metadata: { errorType: 'BurstPattern', sequenceNumber: i + 1 }
        }));
      }
    }

    if (patterns.serviceLoad) {
      const { service, requestsPerSecond, durationSeconds } = patterns.serviceLoad;
      const totalRequests = requestsPerSecond * durationSeconds;
      const interval = 1000 / requestsPerSecond;

      for (let i = 0; i < totalRequests; i++) {
        logs.push(this.generateLogEntry({
          service,
          timestamp: new Date(this.baseTimestamp.getTime() + i * interval),
          message: `Processing request ${i + 1}`,
          metadata: { requestId: `req-${i + 1}`, loadTest: true }
        }));
      }
    }

    if (patterns.userJourney) {
      const { userId, steps, delayBetweenStepsMs } = patterns.userJourney;
      const correlationId = this.generateCorrelationId();

      steps.forEach((step, index) => {
        logs.push(this.generateLogEntry({
          userId,
          correlationId,
          timestamp: new Date(this.baseTimestamp.getTime() + index * delayBetweenStepsMs),
          message: step,
          metadata: { journeyStep: index + 1, totalSteps: steps.length }
        }));
      });
    }

    if (patterns.performanceDegradation) {
      const { baseResponseTime, degradationFactor, count } = patterns.performanceDegradation;

      for (let i = 0; i < count; i++) {
        const responseTime = baseResponseTime + (i * degradationFactor);
        logs.push(this.generateLogEntry({
          level: responseTime > 2000 ? LogLevel.WARN : LogLevel.INFO,
          message: `Request completed in ${responseTime}ms`,
          metadata: { responseTime, degradationIndex: i },
          performance: { duration: responseTime }
        }));
      }
    }

    return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private randomLogLevel(): LogLevel {
    const levels: LogLevel[] = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const weights = [0.1, 0.2, 0.5, 0.15, 0.05]; // Realistic distribution
    const random = Math.random();
    let cumulativeWeight = 0;

    for (let i = 0; i < levels.length; i++) {
      cumulativeWeight += weights[i];
      if (random <= cumulativeWeight) {
        return levels[i];
      }
    }

    return LogLevel.INFO;
  }

  private randomService(): string {
    const services = ['auth', 'cv-processing', 'multimedia', 'premium', 'analytics', 'public-profiles'];
    return services[Math.floor(Math.random() * services.length)];
  }

  private generateMessage(): string {
    const messages = [
      'User authentication successful',
      'CV processing initiated',
      'Database query executed',
      'File upload completed',
      'Cache miss occurred',
      'API request processed',
      'Background job started',
      'Validation failed',
      'Connection established',
      'Resource cleanup completed'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private generateCorrelationId(): string {
    return `corr-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserId(): string {
    const prefix = this.options.userIdPrefix || 'user';
    return `${prefix}-${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateMetadata(): LogMetadata {
    return {
      environment: 'test',
      version: '1.0.0',
      region: 'us-east-1',
      requestId: `req-${Math.random().toString(36).substr(2, 8)}`
    };
  }

  private generateContext(): CorrelationContext {
    return {
      correlationId: this.generateCorrelationId(),
      parentId: `span-${Math.random().toString(36).substr(2, 8)}`,
      traceId: `trace-${Math.random().toString(36).substr(2, 12)}`,
      userId: this.generateUserId(),
      sessionId: `session-${Math.random().toString(36).substr(2, 10)}`
    };
  }

  private generateTags(): string[] {
    const allTags = ['production', 'staging', 'critical', 'performance', 'security', 'user-action', 'system', 'cache'];
    const count = Math.floor(Math.random() * 3) + 1;
    return allTags.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  private generateFilename(): string {
    const files = [
      'AuthService.ts',
      'CVProcessor.ts',
      'DatabaseManager.ts',
      'FileUpload.ts',
      'UserManager.ts',
      'ApiController.ts'
    ];
    return files[Math.floor(Math.random() * files.length)];
  }

  private generateFunctionName(): string {
    const functions = [
      'authenticate',
      'processCV',
      'uploadFile',
      'validateInput',
      'handleRequest',
      'executeQuery',
      'transformData'
    ];
    return functions[Math.floor(Math.random() * functions.length)];
  }
}

/**
 * Mock logger implementation for testing
  */
export class MockLogger extends EventEmitter {
  private logs: LogEntry[] = [];
  private config: {
    enableConsole: boolean;
    enableStorage: boolean;
    minimumLevel: LogLevel;
  };

  constructor(config: Partial<typeof MockLogger.prototype.config> = {}) {
    super();
    this.config = {
      enableConsole: true,
      enableStorage: true,
      minimumLevel: LogLevel.DEBUG,
      ...config
    };
  }

  log(level: LogLevel, message: string, metadata?: LogMetadata, context?: CorrelationContext): void {
    const entryData = {
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      timestamp: new Date(),
      level,
      message,
      service: 'test-service',
      correlationId: context?.correlationId || 'test-correlation',
      userId: context?.userId,
      metadata: metadata || {},
      context,
      tags: [],
      source: {
        file: 'MockLogger.ts',
        line: 1,
        function: 'log'
      }
    };

    const entry = new LogEntry(entryData);
    this.logs.push(entry);
    this.emit('log', entry);

    if (this.config.enableConsole) {
      logger.info(`[${level.toUpperCase()}] ${message}`, metadata);
    }
  }

  info(message: string, metadata?: LogMetadata, context?: CorrelationContext): void {
    this.log(LogLevel.INFO, message, metadata, context);
  }

  warn(message: string, metadata?: LogMetadata, context?: CorrelationContext): void {
    this.log(LogLevel.WARN, message, metadata, context);
  }

  error(message: string, metadata?: LogMetadata, context?: CorrelationContext): void {
    this.log(LogLevel.ERROR, message, metadata, context);
  }

  debug(message: string, metadata?: LogMetadata, context?: CorrelationContext): void {
    this.log(LogLevel.DEBUG, message, metadata, context);
  }

  trace(message: string, metadata?: LogMetadata, context?: CorrelationContext): void {
    this.log(LogLevel.DEBUG, message, metadata, context);
  }

  // Test utilities
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByService(service: string): LogEntry[] {
    return this.logs.filter(log => log.service === service);
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLogCount(): number {
    return this.logs.length;
  }

  hasLogWithMessage(message: string): boolean {
    return this.logs.some(log => log.message.includes(message));
  }
}

/**
 * Test assertion utilities for logging
  */
export class LoggingTestAssertions {
  /**
   * Assert that a logger has logged a specific message
    */
  static assertHasLogWithMessage(logger: MockLogger, expectedMessage: string, level?: LogLevel): void {
    const logs = level ? logger.getLogsByLevel(level) : logger.getLogs();
    const hasMessage = logs.some(log => log.message.includes(expectedMessage));

    if (!hasMessage) {
      throw new Error(
        `Expected log message "${expectedMessage}" ${level ? `at level ${level}` : ''} not found. ` +
        `Available logs: ${logs.map(l => `[${l.level}] ${l.message}`).join(', ')}`
      );
    }
  }

  /**
   * Assert log count
    */
  static assertLogCount(logger: MockLogger, expectedCount: number, level?: LogLevel): void {
    const actualCount = level ? logger.getLogsByLevel(level).length : logger.getLogCount();

    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} logs${level ? ` at level ${level}` : ''}, but got ${actualCount}`
      );
    }
  }

  /**
   * Assert that logs are properly correlated
    */
  static assertLogsAreCorrelated(logs: LogEntry[], correlationId: string): void {
    const correlatedLogs = logs.filter(log => log.correlationId === correlationId);

    if (correlatedLogs.length === 0) {
      throw new Error(`No logs found with correlation ID: ${correlationId}`);
    }

    if (correlatedLogs.length !== logs.length) {
      throw new Error(
        `Expected all ${logs.length} logs to have correlation ID ${correlationId}, ` +
        `but only ${correlatedLogs.length} matched`
      );
    }
  }

  /**
   * Assert log performance metrics
    */
  static assertLogPerformance(logs: LogEntry[], maxDuration: number): void {
    const slowLogs = logs.filter(log =>
      log.performance?.duration && log.performance.duration > maxDuration
    );

    if (slowLogs.length > 0) {
      throw new Error(
        `Found ${slowLogs.length} logs with duration > ${maxDuration}ms: ` +
        slowLogs.map(log => `${log.id} (${log.performance?.duration}ms)`).join(', ')
      );
    }
  }

  /**
   * Assert PII redaction
    */
  static assertPIIRedacted(logs: LogEntry[], piiPatterns: RegExp[]): void {
    const logsWithPII: Array<{ log: LogEntry; pattern: RegExp; match: string }> = [];

    logs.forEach(log => {
      const fullLogText = JSON.stringify(log);
      piiPatterns.forEach(pattern => {
        const match = fullLogText.match(pattern);
        if (match) {
          logsWithPII.push({ log, pattern, match: match[0] });
        }
      });
    });

    if (logsWithPII.length > 0) {
      throw new Error(
        `Found ${logsWithPII.length} logs with unredacted PII: ` +
        logsWithPII.map(item =>
          `Log ${item.log.id} contains "${item.match}" (pattern: ${item.pattern})`
        ).join(', ')
      );
    }
  }
}

/**
 * Performance testing utilities for logging
  */
export class LoggingPerformanceTests {
  /**
   * Test logging performance under load
    */
  static async testLoggingThroughput(
    logger: MockLogger,
    messageCount: number,
    concurrency: number = 1
  ): Promise<{
    totalTime: number;
    averageTimePerLog: number;
    logsPerSecond: number;
    memoryUsed: number;
  }> {
    const initialMemory = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    const batches = Math.ceil(messageCount / concurrency);
    const promises: Promise<void>[] = [];

    for (let batch = 0; batch < batches; batch++) {
      const batchPromises = Array.from({ length: concurrency }, (_, i) => {
        const logIndex = batch * concurrency + i;
        if (logIndex >= messageCount) return Promise.resolve();

        return Promise.resolve().then(() => {
          logger.info(`Performance test message ${logIndex}`, {
            batchNumber: batch,
            logIndex,
            timestamp: Date.now()
          });
        });
      });

      promises.push(...batchPromises);
    }

    await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const finalMemory = process.memoryUsage().heapUsed;

    return {
      totalTime,
      averageTimePerLog: totalTime / messageCount,
      logsPerSecond: messageCount / (totalTime / 1000),
      memoryUsed: finalMemory - initialMemory
    };
  }

  /**
   * Test memory usage during sustained logging
    */
  static async testMemoryUsage(
    logger: MockLogger,
    durationMs: number,
    logsPerSecond: number
  ): Promise<{
    peakMemoryUsage: number;
    averageMemoryUsage: number;
    memoryGrowthRate: number;
    totalLogs: number;
  }> {
    const memorySnapshots: number[] = [];
    const interval = 1000 / logsPerSecond;
    let logCount = 0;

    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;

    return new Promise((resolve) => {
      const logTimer = setInterval(() => {
        logger.info(`Memory test log ${logCount++}`, {
          timestamp: Date.now(),
          memoryUsage: process.memoryUsage().heapUsed
        });
      }, interval);

      const memoryTimer = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed);
      }, 100);

      setTimeout(() => {
        clearInterval(logTimer);
        clearInterval(memoryTimer);

        const peakMemory = Math.max(...memorySnapshots);
        const averageMemory = memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length;
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryGrowth = (finalMemory - initialMemory) / durationMs;

        resolve({
          peakMemoryUsage: peakMemory,
          averageMemoryUsage: averageMemory,
          memoryGrowthRate: memoryGrowth,
          totalLogs: logCount
        });
      }, durationMs);
    });
  }
}

/**
 * Integration test helpers
  */
export class LoggingIntegrationTestHelpers {
  /**
   * Create a complete test scenario with multiple services
    */
  static async runMultiServiceScenario(loggers: Record<string, MockLogger>): Promise<{
    correlationId: string;
    logs: LogEntry[];
    duration: number;
  }> {
    const correlationId = `test-${Date.now()}`;
    const context: CorrelationContext = {
      correlationId,
      traceId: `trace-${correlationId}`,
      userId: 'test-user-123',
      sessionId: 'test-session-456'
    };

    const startTime = Date.now();

    // Simulate a user journey across multiple services
    loggers.auth?.info('User login initiated', { action: 'login_start' }, context);
    await this.delay(50);

    loggers.auth?.info('Authentication successful', { action: 'login_success' }, context);
    await this.delay(100);

    loggers['cv-processing']?.info('CV upload received', { action: 'upload_received' }, context);
    await this.delay(200);

    loggers['cv-processing']?.info('CV processing started', { action: 'processing_start' }, context);
    await this.delay(1000);

    loggers['cv-processing']?.info('CV analysis completed', { action: 'analysis_complete' }, context);
    await this.delay(100);

    loggers.multimedia?.info('Generating podcast', { action: 'podcast_generation' }, context);
    await this.delay(500);

    loggers.premium?.info('Checking subscription status', { action: 'subscription_check' }, context);
    await this.delay(50);

    const endTime = Date.now();

    // Collect all logs with the correlation ID
    const allLogs: LogEntry[] = [];
    Object.values(loggers).forEach(logger => {
      allLogs.push(...logger.getLogs().filter(log => log.correlationId === correlationId));
    });

    return {
      correlationId,
      logs: allLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      duration: endTime - startTime
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export common test patterns
export const CommonTestPatterns = {
  PII_PATTERNS: [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/ // Phone number
  ],

  ERROR_SCENARIOS: [
    'Database connection failed',
    'Authentication token expired',
    'File upload timeout',
    'Memory limit exceeded',
    'Rate limit exceeded',
    'Invalid request format',
    'Service unavailable'
  ],

  PERFORMANCE_THRESHOLDS: {
    maxResponseTime: 1000,
    maxMemoryGrowth: 10 * 1024 * 1024, // 10MB
    minThroughput: 1000 // logs per second
  }
};

export default {
  MockLogGenerator,
  MockLogger,
  LoggingTestAssertions,
  LoggingPerformanceTests,
  LoggingIntegrationTestHelpers,
  CommonTestPatterns
};