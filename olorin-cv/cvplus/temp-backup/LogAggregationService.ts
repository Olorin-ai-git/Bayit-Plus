/**
 * T040: Log aggregation service
 *
 * Aggregates, processes, and analyzes logs from multiple sources.
 * Provides real-time log processing, filtering, and statistical analysis.
 */

import {
  LoggerFactory,
  CorrelationService,
  LogLevel,
  LogDomain,
  LogStream,
  LogStreamManager,
  globalStreamManager,
  AlertRule,
  AlertRuleManager,
  globalAlertManager,
  type Logger,
  type LogEntry
} from '@cvplus/logging';

export interface LogAggregationConfig {
  batchSize: number;
  flushInterval: number; // milliseconds
  retentionPeriod: number; // days
  maxMemoryUsage: number; // bytes
  enableRealTimeProcessing: boolean;
  enableStatisticalAnalysis: boolean;
}

export interface LogStatistics {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByDomain: Record<LogDomain, number>;
  logsByService: Record<string, number>;
  averageProcessingTime: number;
  errorRate: number;
  peakLogsPerSecond: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface LogAggregationResult {
  processed: number;
  filtered: number;
  errors: number;
  duration: number;
  statistics: LogStatistics;
}

export interface LogFilter {
  level?: LogLevel[];
  domain?: LogDomain[];
  service?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  correlationId?: string;
  userId?: string;
  keywords?: string[];
}

const DEFAULT_CONFIG: LogAggregationConfig = {
  batchSize: 1000,
  flushInterval: 10000, // 10 seconds
  retentionPeriod: 30, // 30 days
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  enableRealTimeProcessing: true,
  enableStatisticalAnalysis: true
};

export class LogAggregationService {
  private readonly logger: Logger;
  private readonly config: LogAggregationConfig;
  private readonly streamManager: LogStreamManager;
  private readonly alertManager: AlertRuleManager;
  private readonly logBuffer: LogEntry[] = [];
  private readonly statistics: LogStatistics;
  private flushTimer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(config: Partial<LogAggregationConfig> = {}) {
    this.logger = LoggerFactory.createLogger('@cvplus/log-aggregation');
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.streamManager = globalStreamManager;
    this.alertManager = globalAlertManager;
    this.statistics = this.initializeStatistics();

    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Add log entries to the aggregation pipeline
   */
  async addLogs(logs: LogEntry[]): Promise<void> {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    try {
      for (const log of logs) {
        // Validate log entry
        if (!this.isValidLogEntry(log)) {
          this.logger.warn('Invalid log entry received', {
            event: 'aggregation.log.invalid',
            logId: log.id,
            correlationId
          });
          continue;
        }

        // Add to buffer
        this.logBuffer.push(log);

        // Update real-time statistics
        if (this.config.enableStatisticalAnalysis) {
          this.updateStatistics(log);
        }

        // Trigger real-time processing if enabled
        if (this.config.enableRealTimeProcessing) {
          await this.processLogEntry(log);
        }

        // Check if we need to flush due to buffer size
        if (this.logBuffer.length >= this.config.batchSize) {
          await this.flush();
        }
      }

      this.logger.debug('Logs added to aggregation pipeline', {
        event: 'aggregation.logs.added',
        count: logs.length,
        bufferSize: this.logBuffer.length,
        correlationId
      });

    } catch (error) {
      this.logger.error('Error adding logs to aggregation', {
        event: 'aggregation.logs.error',
        correlationId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  /**
   * Process logs with filtering and aggregation
   */
  async processLogs(filter?: LogFilter): Promise<LogAggregationResult> {
    const startTime = Date.now();
    const correlationId = CorrelationService.getCurrentCorrelationId();

    if (this.isProcessing) {
      throw new Error('Log processing already in progress');
    }

    this.isProcessing = true;

    try {
      this.logger.info('Starting log processing', {
        event: 'aggregation.processing.started',
        bufferSize: this.logBuffer.length,
        filter,
        correlationId
      });

      // Get logs to process
      const logsToProcess = filter ? this.filterLogs(this.logBuffer, filter) : [...this.logBuffer];

      let processed = 0;
      let filtered = 0;
      let errors = 0;

      // Process logs in batches
      const batches = this.createBatches(logsToProcess, this.config.batchSize);

      for (const batch of batches) {
        try {
          const result = await this.processBatch(batch);
          processed += result.processed;
          filtered += result.filtered;
          errors += result.errors;
        } catch (error) {
          this.logger.error('Batch processing error', {
            event: 'aggregation.batch.error',
            batchSize: batch.length,
            correlationId,
            error: {
              name: error.name,
              message: error.message
            }
          });
          errors += batch.length;
        }
      }

      const duration = Date.now() - startTime;
      const result: LogAggregationResult = {
        processed,
        filtered,
        errors,
        duration,
        statistics: { ...this.statistics }
      };

      this.logger.info('Log processing completed', {
        event: 'aggregation.processing.completed',
        ...result,
        correlationId
      });

      return result;

    } catch (error) {
      this.logger.error('Log processing failed', {
        event: 'aggregation.processing.failed',
        correlationId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      });
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get current statistics
   */
  getStatistics(): LogStatistics {
    return { ...this.statistics };
  }

  /**
   * Clear log buffer and reset statistics
   */
  async clear(): Promise<void> {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    this.logBuffer.length = 0;
    Object.assign(this.statistics, this.initializeStatistics());

    this.logger.info('Log aggregation cleared', {
      event: 'aggregation.cleared',
      correlationId
    });
  }

  /**
   * Stop the aggregation service
   */
  async stop(): Promise<void> {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Final flush
    await this.flush();

    this.logger.info('Log aggregation service stopped', {
      event: 'aggregation.stopped',
      correlationId
    });
  }

  private async processLogEntry(log: LogEntry): Promise<void> {
    try {
      // Stream to active log streams
      await this.streamManager.streamLog(log);

      // Check alert rules
      await this.alertManager.checkLogForAlerts(log);

    } catch (error) {
      this.logger.warn('Error processing individual log entry', {
        logId: log.id,
        error: {
          name: error.name,
          message: error.message
        }
      });
    }
  }

  private async processBatch(batch: LogEntry[]): Promise<{ processed: number; filtered: number; errors: number }> {
    let processed = 0;
    let filtered = 0;
    let errors = 0;

    for (const log of batch) {
      try {
        // Apply processing logic
        const shouldProcess = await this.shouldProcessLog(log);

        if (shouldProcess) {
          await this.processLogEntry(log);
          processed++;
        } else {
          filtered++;
        }

      } catch (error) {
        this.logger.warn('Error processing log in batch', {
          logId: log.id,
          error: {
            name: error.name,
            message: error.message
          }
        });
        errors++;
      }
    }

    return { processed, filtered, errors };
  }

  private filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
    return logs.filter(log => {
      // Filter by level
      if (filter.level && !filter.level.includes(log.level)) {
        return false;
      }

      // Filter by domain
      if (filter.domain && !filter.domain.includes(log.domain)) {
        return false;
      }

      // Filter by service
      if (filter.service && !filter.service.includes(log.serviceName)) {
        return false;
      }

      // Filter by time range
      if (filter.timeRange) {
        const logTime = new Date(log.timestamp);
        if (logTime < filter.timeRange.start || logTime > filter.timeRange.end) {
          return false;
        }
      }

      // Filter by correlation ID
      if (filter.correlationId && log.correlationId !== filter.correlationId) {
        return false;
      }

      // Filter by user ID
      if (filter.userId && log.userId !== filter.userId) {
        return false;
      }

      // Filter by keywords
      if (filter.keywords && filter.keywords.length > 0) {
        const searchText = `${log.message} ${JSON.stringify(log.context)}`.toLowerCase();
        const hasKeyword = filter.keywords.some(keyword =>
          searchText.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          return false;
        }
      }

      return true;
    });
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async shouldProcessLog(log: LogEntry): Promise<boolean> {
    // Basic validation
    if (!log.id || !log.timestamp || !log.level || !log.message) {
      return false;
    }

    // Check retention period
    const logAge = Date.now() - new Date(log.timestamp).getTime();
    const maxAge = this.config.retentionPeriod * 24 * 60 * 60 * 1000; // Convert days to ms

    if (logAge > maxAge) {
      return false;
    }

    return true;
  }

  private isValidLogEntry(log: LogEntry): boolean {
    return !!(
      log &&
      log.id &&
      log.timestamp &&
      log.level &&
      log.message &&
      log.serviceName
    );
  }

  private updateStatistics(log: LogEntry): void {
    this.statistics.totalLogs++;

    // Update by level
    this.statistics.logsByLevel[log.level] = (this.statistics.logsByLevel[log.level] || 0) + 1;

    // Update by domain
    this.statistics.logsByDomain[log.domain] = (this.statistics.logsByDomain[log.domain] || 0) + 1;

    // Update by service
    this.statistics.logsByService[log.serviceName] = (this.statistics.logsByService[log.serviceName] || 0) + 1;

    // Update error rate
    const errorLogs = (this.statistics.logsByLevel[LogLevel.ERROR] || 0) +
                      (this.statistics.logsByLevel[LogLevel.FATAL] || 0);
    this.statistics.errorRate = (errorLogs / this.statistics.totalLogs) * 100;

    // Update time range
    const logTime = new Date(log.timestamp);
    if (!this.statistics.timeRange.start || logTime < this.statistics.timeRange.start) {
      this.statistics.timeRange.start = logTime;
    }
    if (!this.statistics.timeRange.end || logTime > this.statistics.timeRange.end) {
      this.statistics.timeRange.end = logTime;
    }
  }

  private initializeStatistics(): LogStatistics {
    return {
      totalLogs: 0,
      logsByLevel: {} as Record<LogLevel, number>,
      logsByDomain: {} as Record<LogDomain, number>,
      logsByService: {},
      averageProcessingTime: 0,
      errorRate: 0,
      peakLogsPerSecond: 0,
      timeRange: {
        start: new Date(),
        end: new Date()
      }
    };
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flush();
      }
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const correlationId = CorrelationService.getCurrentCorrelationId();
    const logsToFlush = [...this.logBuffer];
    this.logBuffer.length = 0; // Clear buffer

    try {
      await this.processLogs();

      this.logger.debug('Log buffer flushed', {
        event: 'aggregation.flushed',
        count: logsToFlush.length,
        correlationId
      });

    } catch (error) {
      this.logger.error('Error flushing log buffer', {
        event: 'aggregation.flush.error',
        count: logsToFlush.length,
        correlationId,
        error: {
          name: error.name,
          message: error.message
        }
      });

      // Put logs back in buffer if flush failed
      this.logBuffer.unshift(...logsToFlush);
    }
  }
}

/**
 * Global log aggregation service instance
 */
export const globalLogAggregationService = new LogAggregationService();

/**
 * Factory function to create aggregation service with custom config
 */
export function createLogAggregationService(config?: Partial<LogAggregationConfig>): LogAggregationService {
  return new LogAggregationService(config);
}

export default LogAggregationService;