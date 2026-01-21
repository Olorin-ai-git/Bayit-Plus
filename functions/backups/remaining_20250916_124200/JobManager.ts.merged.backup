// @ts-ignore - Export conflicts/**
 * Job Manager Service
 * 
 * Manages asynchronous multimedia processing jobs with queuing,
 * status tracking, progress reporting, and retry mechanisms.
 */

import { 
  ProcessingOptions,
  ProcessingResult,
  MediaType,
  ServiceConfig,
  JobOptions,
  JobResult,
  JobStatus,
  JobType,
  JobPriority 
} from '../../types';

import { MediaService } from '../base/MediaService';
import { JobQueue } from './JobQueue';
import { JobProcessor } from './JobProcessor';
import { JobStorage } from './JobStorage';
import { EventEmitter } from 'events';

/**
 * Job management and processing coordination
 */
export class JobManager extends MediaService {
  private readonly queue: JobQueue;
  private readonly processor: JobProcessor;
  private readonly storage: JobStorage;
  private readonly eventEmitter: EventEmitter;
  private readonly activeJobs: Map<string, any>;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(config: ServiceConfig) {
    super(config);
    
    this.queue = new JobQueue(config.jobs?.queue || {});
    this.processor = new JobProcessor(config.jobs?.processor || {});
    this.storage = new JobStorage(config.jobs?.storage || {});
    this.eventEmitter = new EventEmitter();
    this.activeJobs = new Map();
    
    // Start job processing if auto-start is enabled
    if (config.jobs?.autoStart !== false) {
      this.startProcessing();
    }
  }

  /**
   * Main job processing entry point
   */
  public async processMedia(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const jobOptions = options as JobOptions;
    
    if (jobOptions.async === false) {
      // Synchronous processing
      return this.processor.processSync(input, options);
    } else {
      // Asynchronous processing
      const job = await this.createJob(input, options);
      
      return {
        output: job.id,
        metadata: {
          jobId: job.id,
          status: job.status,
          estimatedCompletion: job.estimatedCompletion,
          async: true
        }
      };
    }
  }

  /**
   * Create a new processing job
   */
  public async createJob(
    input: File | Buffer | string,
    options: ProcessingOptions,
    priority: JobPriority = 'normal'
  ): Promise<JobResult> {
    try {
      const jobId = this.generateJobId();
      const job: JobResult = {
        id: jobId,
        type: this.determineJobType(options),
        status: 'queued',
        priority,
        input,
        options,
        createdAt: new Date(),
        progress: 0,
        estimatedCompletion: this.estimateCompletionTime(options)
      };

      // Store job
      await this.storage.saveJob(job);
      
      // Add to queue
      await this.queue.enqueue(job);
      
      // Emit job created event
      this.eventEmitter.emit('job:created', job);
      
      this.logger.info(`Job created: ${jobId}`, { type: job.type, priority });
      
      return job;

    } catch (error) {
      throw this.errorHandler.handleError(error as Error, 'createJob');
    }
  }

  /**
   * Get job status and progress
   */
  public async getJobStatus(jobId: string): Promise<JobResult | null> {
    try {
      return await this.storage.getJob(jobId);
    } catch (error) {
      this.logger.warn(`Failed to get job status: ${jobId}`, { error });
      return null;
    }
  }

  /**
   * Cancel a job
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.storage.getJob(jobId);
      if (!job) {
        return false;
      }

      if (job.status === 'processing') {
        // Stop active processing
        if (this.activeJobs.has(jobId)) {
          const activeJob = this.activeJobs.get(jobId);
          if (activeJob.abort) {
            activeJob.abort();
          }
        }
      }

      // Update job status
      job.status = 'cancelled';
      job.completedAt = new Date();
      await this.storage.saveJob(job);

      // Remove from queue if still queued
      await this.queue.remove(jobId);

      // Emit cancelled event
      this.eventEmitter.emit('job:cancelled', job);

      this.logger.info(`Job cancelled: ${jobId}`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to cancel job: ${jobId}`, { error });
      return false;
    }
  }

  /**
   * Retry a failed job
   */
  public async retryJob(jobId: string): Promise<JobResult | null> {
    try {
      const job = await this.storage.getJob(jobId);
      if (!job || job.status !== 'failed') {
        return null;
      }

      // Reset job status
      job.status = 'queued';
      job.progress = 0;
      job.error = undefined;
      job.retryCount = (job.retryCount || 0) + 1;
      job.updatedAt = new Date();

      // Save and re-queue
      await this.storage.saveJob(job);
      await this.queue.enqueue(job);

      this.eventEmitter.emit('job:retried', job);
      this.logger.info(`Job retried: ${jobId}`, { retryCount: job.retryCount });

      return job;

    } catch (error) {
      this.logger.error(`Failed to retry job: ${jobId}`, { error });
      return null;
    }
  }

  /**
   * Get job result (for completed jobs)
   */
  public async getJobResult(jobId: string): Promise<ProcessingResult | null> {
    try {
      const job = await this.storage.getJob(jobId);
      if (!job || job.status !== 'completed') {
        return null;
      }

      return job.result || null;

    } catch (error) {
      this.logger.warn(`Failed to get job result: ${jobId}`, { error });
      return null;
    }
  }

  /**
   * List jobs with filtering
   */
  public async listJobs(
    filters: {
      status?: JobStatus;
      type?: JobType;
      limit?: number;
      offset?: number;
      userId?: string;
    } = {}
  ): Promise<JobResult[]> {
    return this.storage.listJobs(filters);
  }

  /**
   * Get job statistics
   */
  public async getJobStats(): Promise<Record<string, any>> {
    const stats = await this.storage.getJobStats();
    const queueStats = await this.queue.getStats();

    return {
      ...stats,
      queue: queueStats,
      activeJobs: this.activeJobs.size,
      processingEnabled: this.processingInterval !== null
    };
  }

  /**
   * Start job processing
   */
  public startProcessing(): void {
    if (this.processingInterval) {
      return; // Already processing
    }

    const interval = this.config.jobs?.processingInterval || 1000;
    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, interval);

    this.logger.info('Job processing started');
  }

  /**
   * Stop job processing
   */
  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.logger.info('Job processing stopped');
  }

  /**
   * Subscribe to job events
   */
  public onJobEvent(
    event: 'created' | 'started' | 'progress' | 'completed' | 'failed' | 'cancelled',
    callback: (job: JobResult) => void
  ): void {
    this.eventEmitter.on(`job:${event}`, callback);
  }

  /**
   * Validate job input
   */
  public async validateInput(
    input: File | Buffer | string,
    options: ProcessingOptions
  ): Promise<boolean> {
    try {
      // Check if job type is supported
      const jobType = this.determineJobType(options);
      if (!this.processor.supportsJobType(jobType)) {
        throw new Error(`Unsupported job type: ${jobType}`);
      }

      // Validate specific job options
      return this.processor.validateJobOptions(options);

    } catch (error) {
      this.logger.warn('Job validation failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get supported media types
   */
  public getSupportedTypes(): MediaType[] {
    return ['image', 'video', 'audio'];
  }

  /**
   * Get service capabilities
   */
  public getCapabilities(): Record<string, any> {
    return {
      asyncProcessing: true,
      jobTypes: this.processor.getSupportedJobTypes(),
      priorities: ['low', 'normal', 'high', 'urgent'],
      maxConcurrentJobs: this.config.jobs?.maxConcurrentJobs || 5,
      retrySupport: true,
      progressTracking: true,
      eventNotifications: true,
      jobPersistence: true
    };
  }

  /**
   * Process next job in queue
   */
  private async processNextJob(): Promise<void> {
    try {
      // Check if we can process more jobs
      const maxConcurrent = this.config.jobs?.maxConcurrentJobs || 5;
      if (this.activeJobs.size >= maxConcurrent) {
        return;
      }

      // Get next job from queue
      const job = await this.queue.dequeue();
      if (!job) {
        return; // No jobs to process
      }

      // Start processing
      this.activeJobs.set(job.id, { job, startTime: new Date() });
      await this.processJob(job);

    } catch (error) {
      this.logger.error('Error processing job queue', { error });
    }
  }

  /**
   * Process individual job
   */
  private async processJob(job: JobResult): Promise<void> {
    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();
      await this.storage.saveJob(job);

      this.eventEmitter.emit('job:started', job);

      // Process the job
      const result = await this.processor.process(
        job.input,
        job.options,
        (progress) => {
          job.progress = progress;
          job.updatedAt = new Date();
          this.storage.saveJob(job); // Don't await to avoid blocking
          this.eventEmitter.emit('job:progress', job);
        }
      );

      // Job completed successfully
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.completedAt = new Date();
      await this.storage.saveJob(job);

      this.eventEmitter.emit('job:completed', job);
      this.logger.info(`Job completed: ${job.id}`, { 
        duration: job.completedAt.getTime() - (job.startedAt?.getTime() || 0)
      });

    } catch (error) {
      // Job failed
      job.status = 'failed';
      job.error = (error as Error).message;
      job.completedAt = new Date();
      await this.storage.saveJob(job);

      this.eventEmitter.emit('job:failed', job);
      this.logger.error(`Job failed: ${job.id}`, { error });

      // Check if job should be retried
      const maxRetries = this.config.jobs?.maxRetries || 3;
      if ((job.retryCount || 0) < maxRetries) {
        setTimeout(() => {
          this.retryJob(job.id);
        }, (job.retryCount || 0) * 5000); // Exponential backoff
      }

    } finally {
      // Remove from active jobs
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine job type from processing options
   */
  private determineJobType(options: ProcessingOptions): JobType {
    if ((options as any).transcode) {
      return 'transcode';
    }
    if ((options as any).optimize) {
      return 'optimize';
    }
    if ((options as any).enhance) {
      return 'enhance';
    }
    return 'process';
  }

  /**
   * Estimate completion time based on options
   */
  private estimateCompletionTime(options: ProcessingOptions): Date {
    // Simple estimation based on job type
    const baseTime = 30; // 30 seconds base
    const jobType = this.determineJobType(options);
    
    let multiplier = 1;
    switch (jobType) {
      case 'transcode':
        multiplier = 3;
        break;
      case 'enhance':
        multiplier = 2;
        break;
      case 'optimize':
        multiplier = 1.5;
        break;
    }

    const estimatedSeconds = baseTime * multiplier;
    return new Date(Date.now() + estimatedSeconds * 1000);
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    this.stopProcessing();
    
    // Cancel all active jobs
    for (const [jobId] of this.activeJobs) {
      await this.cancelJob(jobId);
    }

    await super.cleanup();
  }
}