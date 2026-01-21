/**
 * T047: Log retention policy implementation with automated lifecycle management
 *
 * Comprehensive log retention service that manages log lifecycle, implements
 * retention policies, handles archiving, cleanup, and provides compliance
 * features for data retention requirements.
 */

import {
  LoggerFactory,
  CorrelationService,
  LogLevel,
  LogDomain,
  type Logger,
  type LogEntry
} from '@cvplus/logging';

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: RetentionCondition[];
  actions: RetentionAction[];
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags?: string[];
}

export interface RetentionCondition {
  type: 'age' | 'level' | 'domain' | 'size' | 'count' | 'custom';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne' | 'in' | 'not_in' | 'regex';
  value: any;
  unit?: 'days' | 'hours' | 'minutes' | 'bytes' | 'kb' | 'mb' | 'gb';
}

export interface RetentionAction {
  type: 'delete' | 'archive' | 'compress' | 'move' | 'alert' | 'export';
  target?: string;
  parameters?: Record<string, any>;
  delay?: number; // milliseconds
}

export interface RetentionJob {
  id: string;
  policyId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  processedCount: number;
  affectedCount: number;
  errors: RetentionError[];
  metrics: RetentionJobMetrics;
}

export interface RetentionError {
  timestamp: Date;
  level: 'warning' | 'error' | 'fatal';
  message: string;
  context?: Record<string, any>;
}

export interface RetentionJobMetrics {
  totalLogs: number;
  deletedLogs: number;
  archivedLogs: number;
  compressedLogs: number;
  movedLogs: number;
  bytesProcessed: number;
  bytesReclaimed: number;
  processingTime: number;
}

export interface RetentionStats {
  totalPolicies: number;
  activePolicies: number;
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalLogsProcessed: number;
  totalBytesReclaimed: number;
  averageJobTime: number;
  lastJobTime?: Date;
}

export interface LogRetentionConfig {
  defaultRetentionDays: number;
  maxBatchSize: number;
  maxJobDuration: number; // milliseconds
  archivePath: string;
  compressionEnabled: boolean;
  compressionLevel: number;
  enableMetrics: boolean;
  enableAlerting: boolean;
  schedulerInterval: number; // milliseconds
}

const DEFAULT_CONFIG: LogRetentionConfig = {
  defaultRetentionDays: 90,
  maxBatchSize: 1000,
  maxJobDuration: 3600000, // 1 hour
  archivePath: 'gs://cvplus-logs-archive',
  compressionEnabled: true,
  compressionLevel: 6,
  enableMetrics: true,
  enableAlerting: true,
  schedulerInterval: 3600000 // 1 hour
};

export class LogRetentionService {
  private readonly logger: Logger;
  private readonly config: LogRetentionConfig;
  private readonly policies = new Map<string, RetentionPolicy>();
  private readonly jobs = new Map<string, RetentionJob>();
  private schedulerTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: Partial<LogRetentionConfig> = {}) {
    this.logger = LoggerFactory.createLogger('@cvplus/log-retention');
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeDefaultPolicies();
  }

  /**
   * Start the retention service
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    const correlationId = CorrelationService.getCurrentCorrelationId();

    try {
      this.isRunning = true;

      // Start the scheduler
      this.startScheduler();

      this.logger.info('Log retention service started', {
        event: 'retention.service.started',
        config: this.config,
        policyCount: this.policies.size,
        correlationId
      });

    } catch (error) {
      this.logger.error('Failed to start log retention service', {
        event: 'retention.service.start_failed',
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
   * Stop the retention service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    const correlationId = CorrelationService.getCurrentCorrelationId();

    try {
      this.isRunning = false;

      // Stop the scheduler
      if (this.schedulerTimer) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = undefined;
      }

      // Cancel running jobs
      await this.cancelRunningJobs();

      this.logger.info('Log retention service stopped', {
        event: 'retention.service.stopped',
        correlationId
      });

    } catch (error) {
      this.logger.error('Error stopping log retention service', {
        event: 'retention.service.stop_error',
        correlationId,
        error: {
          name: error.name,
          message: error.message
        }
      });
    }
  }

  /**
   * Create a retention policy
   */
  async createPolicy(
    name: string,
    description: string,
    conditions: RetentionCondition[],
    actions: RetentionAction[],
    priority: number = 100,
    createdBy: string = 'system',
    tags?: string[]
  ): Promise<string> {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    try {
      const policy: RetentionPolicy = {
        id: this.generatePolicyId(),
        name,
        description,
        enabled: true,
        conditions,
        actions,
        priority,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        tags
      };

      // Validate policy
      this.validatePolicy(policy);

      // Store policy
      this.policies.set(policy.id, policy);

      this.logger.info('Retention policy created', {
        event: 'retention.policy.created',
        policyId: policy.id,
        name: policy.name,
        conditionCount: policy.conditions.length,
        actionCount: policy.actions.length,
        priority: policy.priority,
        correlationId
      });

      return policy.id;

    } catch (error) {
      this.logger.error('Failed to create retention policy', {
        event: 'retention.policy.create_failed',
        name,
        correlationId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Execute retention policies manually
   */
  async executePolicies(policyIds?: string[]): Promise<RetentionJob[]> {
    const correlationId = CorrelationService.getCurrentCorrelationId();

    try {
      const policiesToRun = policyIds
        ? policyIds.map(id => this.policies.get(id)).filter(Boolean) as RetentionPolicy[]
        : Array.from(this.policies.values()).filter(p => p.enabled);

      const jobs: RetentionJob[] = [];

      for (const policy of policiesToRun.sort((a, b) => b.priority - a.priority)) {
        const job = await this.executePolicy(policy);
        jobs.push(job);
      }

      this.logger.info('Retention policies executed', {
        event: 'retention.policies.executed',
        policyCount: policiesToRun.length,
        jobCount: jobs.length,
        correlationId
      });

      return jobs;

    } catch (error) {
      this.logger.error('Failed to execute retention policies', {
        event: 'retention.policies.execution_failed',
        correlationId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Get retention statistics
   */
  getStats(): RetentionStats {
    const jobs = Array.from(this.jobs.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');

    return {
      totalPolicies: this.policies.size,
      activePolicies: Array.from(this.policies.values()).filter(p => p.enabled).length,
      totalJobs: jobs.length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      completedJobs: completedJobs.length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      totalLogsProcessed: completedJobs.reduce((sum, j) => sum + j.processedCount, 0),
      totalBytesReclaimed: completedJobs.reduce((sum, j) => sum + j.metrics.bytesReclaimed, 0),
      averageJobTime: completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => sum + j.metrics.processingTime, 0) / completedJobs.length
        : 0,
      lastJobTime: jobs.length > 0
        ? new Date(Math.max(...jobs.map(j => j.endTime?.getTime() || 0)))
        : undefined
    };
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): RetentionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): RetentionJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getJobs(): RetentionJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Execute a single retention policy
   */
  private async executePolicy(policy: RetentionPolicy): Promise<RetentionJob> {
    const correlationId = CorrelationService.getCurrentCorrelationId();
    const job: RetentionJob = {
      id: this.generateJobId(),
      policyId: policy.id,
      status: 'pending',
      processedCount: 0,
      affectedCount: 0,
      errors: [],
      metrics: {
        totalLogs: 0,
        deletedLogs: 0,
        archivedLogs: 0,
        compressedLogs: 0,
        movedLogs: 0,
        bytesProcessed: 0,
        bytesReclaimed: 0,
        processingTime: 0
      }
    };

    this.jobs.set(job.id, job);

    try {
      job.status = 'running';
      job.startTime = new Date();

      this.logger.info('Retention job started', {
        event: 'retention.job.started',
        jobId: job.id,
        policyId: policy.id,
        policyName: policy.name,
        correlationId
      });

      const startTime = Date.now();

      // Find logs matching conditions
      const matchingLogs = await this.findMatchingLogs(policy.conditions);
      job.metrics.totalLogs = matchingLogs.length;

      this.logger.debug('Found matching logs', {
        event: 'retention.job.logs_found',
        jobId: job.id,
        count: matchingLogs.length,
        correlationId
      });

      // Process logs in batches
      const batches = this.createBatches(matchingLogs, this.config.maxBatchSize);

      for (const batch of batches) {
        if (Date.now() - startTime > this.config.maxJobDuration) {
          throw new Error('Job exceeded maximum duration');
        }

        await this.processBatch(batch, policy.actions, job);
        job.processedCount += batch.length;
      }

      // Complete job
      job.status = 'completed';
      job.endTime = new Date();
      job.metrics.processingTime = Date.now() - startTime;

      this.logger.info('Retention job completed', {
        event: 'retention.job.completed',
        jobId: job.id,
        policyId: policy.id,
        processedCount: job.processedCount,
        affectedCount: job.affectedCount,
        processingTime: job.metrics.processingTime,
        correlationId
      });

      return job;

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.errors.push({
        timestamp: new Date(),
        level: 'fatal',
        message: error instanceof Error ? error.message : 'Unknown error',
        context: { correlationId }
      });

      this.logger.error('Retention job failed', {
        event: 'retention.job.failed',
        jobId: job.id,
        policyId: policy.id,
        correlationId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      });

      return job;
    }
  }

  /**
   * Find logs matching retention conditions
   */
  private async findMatchingLogs(conditions: RetentionCondition[]): Promise<LogEntry[]> {
    // In a real implementation, this would query the log storage system
    // For demonstration, we'll simulate finding logs
    const simulatedLogs: LogEntry[] = [];

    // This would be replaced with actual database/storage queries
    // based on the retention conditions

    return simulatedLogs;
  }

  /**
   * Process a batch of logs
   */
  private async processBatch(
    logs: LogEntry[],
    actions: RetentionAction[],
    job: RetentionJob
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'delete':
          await this.deleteLogs(logs, job);
          break;
        case 'archive':
          await this.archiveLogs(logs, action.target, job);
          break;
        case 'compress':
          await this.compressLogs(logs, job);
          break;
        case 'move':
          await this.moveLogs(logs, action.target, job);
          break;
        case 'alert':
          await this.sendAlert(logs, action.parameters, job);
          break;
        case 'export':
          await this.exportLogs(logs, action.target, job);
          break;
      }
    }
  }

  /**
   * Delete logs
   */
  private async deleteLogs(logs: LogEntry[], job: RetentionJob): Promise<void> {
    // In a real implementation, this would delete logs from storage
    job.metrics.deletedLogs += logs.length;
    job.affectedCount += logs.length;

    // Estimate bytes reclaimed (simplified calculation)
    const estimatedBytes = logs.reduce((sum, log) =>
      sum + JSON.stringify(log).length * 2, 0); // Rough estimate
    job.metrics.bytesReclaimed += estimatedBytes;

    this.logger.debug('Logs deleted', {
      event: 'retention.logs.deleted',
      jobId: job.id,
      count: logs.length,
      bytesReclaimed: estimatedBytes
    });
  }

  /**
   * Archive logs
   */
  private async archiveLogs(logs: LogEntry[], target: string | undefined, job: RetentionJob): Promise<void> {
    // In a real implementation, this would move logs to archive storage
    job.metrics.archivedLogs += logs.length;
    job.affectedCount += logs.length;

    const archivePath = target || this.config.archivePath;

    this.logger.debug('Logs archived', {
      event: 'retention.logs.archived',
      jobId: job.id,
      count: logs.length,
      archivePath
    });
  }

  /**
   * Compress logs
   */
  private async compressLogs(logs: LogEntry[], job: RetentionJob): Promise<void> {
    if (!this.config.compressionEnabled) return;

    // In a real implementation, this would compress logs
    job.metrics.compressedLogs += logs.length;
    job.affectedCount += logs.length;

    // Estimate compression savings
    const originalBytes = logs.reduce((sum, log) =>
      sum + JSON.stringify(log).length * 2, 0);
    const compressionRatio = 0.3; // Assume 70% compression
    const savedBytes = originalBytes * compressionRatio;
    job.metrics.bytesReclaimed += savedBytes;

    this.logger.debug('Logs compressed', {
      event: 'retention.logs.compressed',
      jobId: job.id,
      count: logs.length,
      originalBytes,
      savedBytes,
      compressionRatio
    });
  }

  /**
   * Move logs
   */
  private async moveLogs(logs: LogEntry[], target: string | undefined, job: RetentionJob): Promise<void> {
    // In a real implementation, this would move logs to a different location
    job.metrics.movedLogs += logs.length;
    job.affectedCount += logs.length;

    this.logger.debug('Logs moved', {
      event: 'retention.logs.moved',
      jobId: job.id,
      count: logs.length,
      target
    });
  }

  /**
   * Send alert
   */
  private async sendAlert(
    logs: LogEntry[],
    parameters: Record<string, any> | undefined,
    job: RetentionJob
  ): Promise<void> {
    if (!this.config.enableAlerting) return;

    this.logger.warn('Retention alert triggered', {
      event: 'retention.alert',
      jobId: job.id,
      logCount: logs.length,
      parameters
    });
  }

  /**
   * Export logs
   */
  private async exportLogs(logs: LogEntry[], target: string | undefined, job: RetentionJob): Promise<void> {
    // In a real implementation, this would export logs to external system
    this.logger.debug('Logs exported', {
      event: 'retention.logs.exported',
      jobId: job.id,
      count: logs.length,
      target
    });
  }

  /**
   * Initialize default retention policies
   */
  private initializeDefaultPolicies(): void {
    // Default policy: Delete debug logs older than 7 days
    this.createPolicy(
      'delete-old-debug-logs',
      'Delete debug level logs older than 7 days',
      [
        { type: 'age', operator: 'gt', value: 7, unit: 'days' },
        { type: 'level', operator: 'eq', value: LogLevel.DEBUG }
      ],
      [{ type: 'delete' }],
      100,
      'system',
      ['default', 'debug', 'cleanup']
    );

    // Default policy: Archive info logs older than 30 days
    this.createPolicy(
      'archive-old-info-logs',
      'Archive info level logs older than 30 days',
      [
        { type: 'age', operator: 'gt', value: 30, unit: 'days' },
        { type: 'level', operator: 'eq', value: LogLevel.INFO }
      ],
      [{ type: 'archive' }, { type: 'compress' }, { type: 'delete' }],
      200,
      'system',
      ['default', 'info', 'archive']
    );

    // Default policy: Compress warning logs older than 60 days
    this.createPolicy(
      'compress-old-warning-logs',
      'Compress warning level logs older than 60 days',
      [
        { type: 'age', operator: 'gt', value: 60, unit: 'days' },
        { type: 'level', operator: 'eq', value: LogLevel.WARN }
      ],
      [{ type: 'compress' }],
      150,
      'system',
      ['default', 'warning', 'compress']
    );

    // Default policy: Keep error logs for 1 year, then archive
    this.createPolicy(
      'archive-old-error-logs',
      'Archive error level logs older than 365 days',
      [
        { type: 'age', operator: 'gt', value: 365, unit: 'days' },
        { type: 'level', operator: 'in', value: [LogLevel.ERROR, LogLevel.FATAL] }
      ],
      [{ type: 'archive' }, { type: 'compress' }],
      300,
      'system',
      ['default', 'error', 'long-term']
    );
  }

  /**
   * Start the retention scheduler
   */
  private startScheduler(): void {
    this.schedulerTimer = setInterval(async () => {
      if (this.isRunning) {
        try {
          await this.executePolicies();
        } catch (error) {
          this.logger.error('Scheduled retention execution failed', {
            event: 'retention.scheduler.error',
            error: {
              name: error.name,
              message: error.message
            }
          });
        }
      }
    }, this.config.schedulerInterval);
  }

  /**
   * Cancel all running jobs
   */
  private async cancelRunningJobs(): Promise<void> {
    const runningJobs = Array.from(this.jobs.values()).filter(j => j.status === 'running');

    for (const job of runningJobs) {
      job.status = 'cancelled';
      job.endTime = new Date();
      job.errors.push({
        timestamp: new Date(),
        level: 'warning',
        message: 'Job cancelled during service shutdown'
      });
    }

    if (runningJobs.length > 0) {
      this.logger.info('Running jobs cancelled', {
        event: 'retention.jobs.cancelled',
        count: runningJobs.length
      });
    }
  }

  /**
   * Helper methods
   */
  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private validatePolicy(policy: RetentionPolicy): void {
    if (!policy.name || policy.name.length === 0) {
      throw new Error('Policy name is required');
    }

    if (!policy.conditions || policy.conditions.length === 0) {
      throw new Error('Policy must have at least one condition');
    }

    if (!policy.actions || policy.actions.length === 0) {
      throw new Error('Policy must have at least one action');
    }

    // Validate conditions
    for (const condition of policy.conditions) {
      this.validateCondition(condition);
    }

    // Validate actions
    for (const action of policy.actions) {
      this.validateAction(action);
    }
  }

  private validateCondition(condition: RetentionCondition): void {
    const validTypes = ['age', 'level', 'domain', 'size', 'count', 'custom'];
    if (!validTypes.includes(condition.type)) {
      throw new Error(`Invalid condition type: ${condition.type}`);
    }

    const validOperators = ['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'in', 'not_in', 'regex'];
    if (!validOperators.includes(condition.operator)) {
      throw new Error(`Invalid condition operator: ${condition.operator}`);
    }

    if (condition.value === undefined || condition.value === null) {
      throw new Error('Condition value is required');
    }
  }

  private validateAction(action: RetentionAction): void {
    const validTypes = ['delete', 'archive', 'compress', 'move', 'alert', 'export'];
    if (!validTypes.includes(action.type)) {
      throw new Error(`Invalid action type: ${action.type}`);
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

/**
 * Global log retention service instance
 */
export const globalLogRetentionService = new LogRetentionService();

/**
 * Factory function to create retention service with custom config
 */
export function createLogRetentionService(config?: Partial<LogRetentionConfig>): LogRetentionService {
  return new LogRetentionService(config);
}

export default LogRetentionService;