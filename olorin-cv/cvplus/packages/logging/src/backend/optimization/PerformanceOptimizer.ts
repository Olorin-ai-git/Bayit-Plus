/**
 * T056: Performance optimization tools in packages/logging/src/backend/optimization/PerformanceOptimizer.ts
 *
 * Advanced performance optimization utilities for the logging system including
 * batch processing, memory management, connection pooling, and intelligent caching.
  */

import { LogLevel, LogDomain } from '../types';
import { LogEntry } from '../models/LogEntry';
import { BaseLogger } from '../core/BaseLogger';
import { EventEmitter } from 'events';

interface OptimizationConfig {
  // Batch processing
  batchSize: number;
  batchTimeout: number; // milliseconds
  maxBatchSize: number;

  // Memory management
  maxMemoryUsage: number; // bytes
  memoryCheckInterval: number; // milliseconds
  gcThreshold: number; // percentage

  // Connection pooling
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;

  // Caching
  cacheEnabled: boolean;
  cacheSize: number;
  cacheTtl: number; // milliseconds

  // Performance monitoring
  enableMetrics: boolean;
  metricsInterval: number; // milliseconds
  slowQueryThreshold: number; // milliseconds
}

interface PerformanceMetrics {
  // Throughput metrics
  logsProcessed: number;
  logsPerSecond: number;
  batchesProcessed: number;
  averageBatchSize: number;

  // Timing metrics
  averageProcessingTime: number;
  slowQueries: number;
  timeouts: number;

  // Memory metrics
  memoryUsage: number;
  maxMemoryUsage: number;
  gcRuns: number;

  // Connection metrics
  activeConnections: number;
  failedConnections: number;
  connectionPoolUtilization: number;

  // Cache metrics
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;

  // Error metrics
  errors: number;
  retries: number;
  errorRate: number;
}

interface BatchProcessor {
  id: string;
  logs: LogEntry[];
  startTime: number;
  timeout?: NodeJS.Timeout;
  resolve?: (value: any) => void;
  reject?: (error: any) => void;
}

export class PerformanceOptimizer extends EventEmitter {
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;
  private batchProcessors: Map<string, BatchProcessor> = new Map();
  private connectionPool: Set<any> = new Set();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private logger: BaseLogger;

  // Timers
  private metricsTimer?: NodeJS.Timeout;
  private memoryTimer?: NodeJS.Timeout;
  private cacheCleanupTimer?: NodeJS.Timeout;

  // Performance tracking
  private startTime: number = Date.now();
  private lastGcTime: number = Date.now();
  private processedCount: number = 0;

  constructor(config: Partial<OptimizationConfig> = {}) {
    super();

    this.config = {
      batchSize: 100,
      batchTimeout: 5000, // 5 seconds
      maxBatchSize: 1000,
      maxMemoryUsage: 512 * 1024 * 1024, // 512MB
      memoryCheckInterval: 30000, // 30 seconds
      gcThreshold: 80, // 80%
      maxConnections: 10,
      connectionTimeout: 10000,
      idleTimeout: 60000,
      cacheEnabled: true,
      cacheSize: 10000,
      cacheTtl: 300000, // 5 minutes
      enableMetrics: true,
      metricsInterval: 60000, // 1 minute
      slowQueryThreshold: 1000, // 1 second
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.logger = new BaseLogger('performance-optimizer');

    this.initializeOptimization();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      logsProcessed: 0,
      logsPerSecond: 0,
      batchesProcessed: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      slowQueries: 0,
      timeouts: 0,
      memoryUsage: 0,
      maxMemoryUsage: 0,
      gcRuns: 0,
      activeConnections: 0,
      failedConnections: 0,
      connectionPoolUtilization: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      errors: 0,
      retries: 0,
      errorRate: 0
    };
  }

  private initializeOptimization(): void {
    // Start performance monitoring
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }

    // Start memory monitoring
    this.startMemoryMonitoring();

    // Start cache cleanup
    if (this.config.cacheEnabled) {
      this.startCacheCleanup();
    }

    this.logger.info('Performance optimizer initialized', {
      config: this.config,
      event: 'PERF_OPTIMIZER_INIT'
    });
  }

  /**
   * Optimize log batch processing
    */
  async processBatch(logs: LogEntry[], options: {
    priority?: 'low' | 'normal' | 'high';
    timeout?: number;
    callback?: (results: any) => void;
  } = {}): Promise<any> {
    const startTime = Date.now();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Validate batch size
      if (logs.length > this.config.maxBatchSize) {
        throw new Error(`Batch size ${logs.length} exceeds maximum ${this.config.maxBatchSize}`);
      }

      // Create batch processor
      const processor: BatchProcessor = {
        id: batchId,
        logs: [...logs],
        startTime
      };

      // Set up timeout
      const timeout = options.timeout || this.config.batchTimeout;
      processor.timeout = setTimeout(() => {
        this.handleBatchTimeout(batchId);
      }, timeout);

      this.batchProcessors.set(batchId, processor);

      // Process based on priority
      const result = await this.executeBatch(processor, options.priority || 'normal');

      // Update metrics
      this.updateBatchMetrics(processor, startTime);

      // Clean up
      this.cleanupBatch(batchId);

      return result;

    } catch (error) {
      this.metrics.errors++;
      this.logger.error('Batch processing failed', {
        batchId,
        batchSize: logs.length,
        event: 'BATCH_PROCESS_ERROR',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });

      this.cleanupBatch(batchId);
      throw error;
    }
  }

  private async executeBatch(processor: BatchProcessor, priority: 'low' | 'normal' | 'high'): Promise<any> {
    const { logs } = processor;

    // Optimize logs by grouping similar entries
    const optimizedLogs = this.optimizeLogs(logs);

    // Process in parallel chunks for high priority
    if (priority === 'high' && optimizedLogs.length > 50) {
      return this.processParallel(optimizedLogs);
    }

    // Standard sequential processing
    return this.processSequential(optimizedLogs);
  }

  private optimizeLogs(logs: LogEntry[]): LogEntry[] {
    // Group by level and component for more efficient processing
    const grouped = new Map<string, LogEntry[]>();

    logs.forEach(log => {
      const sourceStr = typeof log.source === 'object' ? log.source?.package || log.source?.module || 'unknown' : 'default';
      const key = `${log.level}-${log.service || sourceStr}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(log);
    });

    // Flatten back with similar logs grouped together
    const optimized: LogEntry[] = [];
    grouped.forEach(groupLogs => {
      optimized.push(...groupLogs);
    });

    return optimized;
  }

  private async processParallel(logs: LogEntry[]): Promise<any> {
    const chunkSize = Math.ceil(logs.length / 4); // Process in 4 parallel chunks
    const chunks: LogEntry[][] = [];

    for (let i = 0; i < logs.length; i += chunkSize) {
      chunks.push(logs.slice(i, i + chunkSize));
    }

    const promises = chunks.map(chunk => this.processChunk(chunk));
    return Promise.all(promises);
  }

  private async processSequential(logs: LogEntry[]): Promise<any> {
    return this.processChunk(logs);
  }

  private async processChunk(logs: LogEntry[]): Promise<any> {
    const results: any[] = [];

    for (const log of logs) {
      try {
        const result = await this.processLog(log);
        results.push(result);
        this.processedCount++;
      } catch (error) {
        this.metrics.errors++;
        results.push({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return results;
  }

  private async processLog(log: LogEntry): Promise<any> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = this.getFromCache(log);
        if (cached) {
          this.metrics.cacheHits++;
          return cached;
        }
        this.metrics.cacheMisses++;
      }

      // Simulate log processing (replace with actual logic)
      await this.simulateProcessing(log);

      const result = {
        id: log.id,
        processed: true,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      if (this.config.cacheEnabled) {
        this.setCache(log, result);
      }

      // Check for slow queries
      const processingTime = Date.now() - startTime;
      if (processingTime > this.config.slowQueryThreshold) {
        this.metrics.slowQueries++;
        this.logger.warn('Slow log processing detected', {
          processingTime,
          threshold: this.config.slowQueryThreshold,
          logLevel: log.level,
          event: 'SLOW_PROCESSING'
        });
      }

      return result;

    } catch (error) {
      throw error;
    }
  }

  private async simulateProcessing(log: LogEntry): Promise<void> {
    // Simulate different processing times based on log level
    const processingTime = {
      [LogLevel.DEBUG]: 10,
      [LogLevel.INFO]: 20,
      [LogLevel.WARN]: 30,
      [LogLevel.ERROR]: 50,
      [LogLevel.FATAL]: 100
    }[log.level] || 20;

    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  /**
   * Cache management
    */
  private getFromCache(log: LogEntry): any | null {
    const key = this.getCacheKey(log);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.config.cacheTtl) {
      return cached.data;
    }

    // Remove expired entry
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  private setCache(log: LogEntry, data: any): void {
    const key = this.getCacheKey(log);

    // Check cache size limit
    if (this.cache.size >= this.config.cacheSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private getCacheKey(log: LogEntry): string {
    const sourceStr = typeof log.source === 'object' ? log.source?.package || log.source?.module || 'unknown' : 'default';
    return `${log.level}-${log.message.substring(0, 50)}-${log.service || sourceStr}`;
  }

  /**
   * Memory management
    */
  private startMemoryMonitoring(): void {
    this.memoryTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.memoryCheckInterval);
  }

  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const currentUsage = memUsage.heapUsed;

    this.metrics.memoryUsage = currentUsage;
    this.metrics.maxMemoryUsage = Math.max(this.metrics.maxMemoryUsage, currentUsage);

    const usagePercentage = (currentUsage / this.config.maxMemoryUsage) * 100;

    if (usagePercentage > this.config.gcThreshold) {
      this.triggerGarbageCollection();
    }

    this.emit('memoryStatus', {
      current: currentUsage,
      max: this.config.maxMemoryUsage,
      percentage: usagePercentage
    });
  }

  private triggerGarbageCollection(): void {
    try {
      if (global.gc) {
        global.gc();
        this.metrics.gcRuns++;
        this.lastGcTime = Date.now();

        this.logger.info('Garbage collection triggered', {
          memoryBefore: this.metrics.memoryUsage,
          memoryAfter: process.memoryUsage().heapUsed,
          event: 'GC_TRIGGERED'
        });
      }
    } catch (error) {
      this.logger.warn('Failed to trigger garbage collection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        event: 'GC_FAILED'
      });
    }
  }

  /**
   * Performance metrics collection
    */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.updatePerformanceMetrics();
    }, this.config.metricsInterval);
  }

  private updatePerformanceMetrics(): void {
    const now = Date.now();
    const timeDiff = (now - this.startTime) / 1000; // seconds

    // Update throughput metrics
    this.metrics.logsProcessed = this.processedCount;
    this.metrics.logsPerSecond = this.processedCount / timeDiff;

    // Update cache hit rate
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = totalCacheRequests > 0
      ? (this.metrics.cacheHits / totalCacheRequests) * 100
      : 0;

    // Update error rate
    this.metrics.errorRate = this.metrics.logsProcessed > 0
      ? (this.metrics.errors / this.metrics.logsProcessed) * 100
      : 0;

    // Update connection pool utilization
    this.metrics.connectionPoolUtilization = (this.metrics.activeConnections / this.config.maxConnections) * 100;

    this.emit('metricsUpdate', this.metrics);
  }

  private updateBatchMetrics(processor: BatchProcessor, startTime: number): void {
    const processingTime = Date.now() - startTime;

    this.metrics.batchesProcessed++;
    this.metrics.averageBatchSize = (
      (this.metrics.averageBatchSize * (this.metrics.batchesProcessed - 1) + processor.logs.length)
      / this.metrics.batchesProcessed
    );

    this.metrics.averageProcessingTime = (
      (this.metrics.averageProcessingTime * (this.metrics.batchesProcessed - 1) + processingTime)
      / this.metrics.batchesProcessed
    );
  }

  private handleBatchTimeout(batchId: string): void {
    const processor = this.batchProcessors.get(batchId);
    if (processor) {
      this.metrics.timeouts++;
      this.logger.warn('Batch processing timeout', {
        batchId,
        batchSize: processor.logs.length,
        timeout: this.config.batchTimeout,
        event: 'BATCH_TIMEOUT'
      });

      if (processor.reject) {
        processor.reject(new Error('Batch processing timeout'));
      }

      this.cleanupBatch(batchId);
    }
  }

  private cleanupBatch(batchId: string): void {
    const processor = this.batchProcessors.get(batchId);
    if (processor && processor.timeout) {
      clearTimeout(processor.timeout);
    }
    this.batchProcessors.delete(batchId);
  }

  private startCacheCleanup(): void {
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupExpiredCache();
    }, this.config.cacheTtl / 2); // Clean up twice per TTL period
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.config.cacheTtl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug('Cache cleanup completed', {
        cleanedEntries: cleanedCount,
        remainingEntries: this.cache.size,
        event: 'CACHE_CLEANUP'
      });
    }
  }

  /**
   * Get current performance metrics
    */
  getMetrics(): PerformanceMetrics {
    this.updatePerformanceMetrics();
    return { ...this.metrics };
  }

  /**
   * Get optimization recommendations
    */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.errorRate > 5) {
      recommendations.push('High error rate detected - investigate log processing issues');
    }

    if (metrics.cacheHitRate < 80) {
      recommendations.push('Low cache hit rate - consider increasing cache size or TTL');
    }

    if (metrics.averageProcessingTime > 1000) {
      recommendations.push('High average processing time - optimize log processing logic');
    }

    if (metrics.connectionPoolUtilization > 90) {
      recommendations.push('High connection pool utilization - consider increasing max connections');
    }

    if (metrics.slowQueries > metrics.logsProcessed * 0.1) {
      recommendations.push('Many slow queries detected - optimize processing algorithms');
    }

    if (this.metrics.memoryUsage > this.config.maxMemoryUsage * 0.8) {
      recommendations.push('High memory usage - consider reducing batch sizes or enabling GC');
    }

    return recommendations;
  }

  /**
   * Update optimization configuration
    */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    this.logger.info('Optimization config updated', {
      oldConfig,
      newConfig: this.config,
      event: 'CONFIG_UPDATE'
    });

    this.emit('configUpdated', this.config);
  }

  /**
   * Cleanup and shutdown
    */
  shutdown(): void {
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.memoryTimer) clearInterval(this.memoryTimer);
    if (this.cacheCleanupTimer) clearInterval(this.cacheCleanupTimer);

    // Clear all batches
    for (const [batchId] of this.batchProcessors) {
      this.cleanupBatch(batchId);
    }

    this.cache.clear();
    this.connectionPool.clear();

    this.logger.info('Performance optimizer shut down', {
      finalMetrics: this.getMetrics(),
      event: 'PERF_OPTIMIZER_SHUTDOWN'
    });

    this.emit('shutdown');
  }
}

export default PerformanceOptimizer;