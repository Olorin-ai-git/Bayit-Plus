// @ts-ignore - Export conflicts/**
 * Job Storage
 * 
 * Handles persistence and retrieval of job data and status
 * with support for different storage backends.
 */

import { JobResult, JobStatus } from '../../types';
import { Logger } from '../utils/Logger';

export class JobStorage {
  private readonly logger: Logger;
  private readonly config: any;
  private readonly jobs: Map<string, JobResult>;

  constructor(config: any = {}) {
    this.config = config;
    this.logger = new Logger('JobStorage');
    this.jobs = new Map();
  }

  /**
   * Save job to storage
   */
  public async saveJob(job: JobResult): Promise<void> {
    try {
      this.jobs.set(job.id, { ...job });
      this.logger.debug('Job saved', { jobId: job.id, status: job.status });
    } catch (error) {
      this.logger.error('Failed to save job', { jobId: job.id, error });
      throw error;
    }
  }

  /**
   * Get job from storage
   */
  public async getJob(jobId: string): Promise<JobResult | null> {
    try {
      const job = this.jobs.get(jobId);
      return job ? { ...job } : null;
    } catch (error) {
      this.logger.error('Failed to get job', { jobId, error });
      return null;
    }
  }

  /**
   * List jobs with filtering
   */
  public async listJobs(filters: any = {}): Promise<JobResult[]> {
    try {
      let jobs = Array.from(this.jobs.values());

      // Apply filters
      if (filters.status) {
        jobs = jobs.filter(job => job.status === filters.status);
      }

      if (filters.type) {
        jobs = jobs.filter(job => job.type === filters.type);
      }

      if (filters.userId) {
        jobs = jobs.filter(job => (job as any).userId === filters.userId);
      }

      // Apply pagination
      if (filters.offset) {
        jobs = jobs.slice(filters.offset);
      }

      if (filters.limit) {
        jobs = jobs.slice(0, filters.limit);
      }

      return jobs;

    } catch (error) {
      this.logger.error('Failed to list jobs', { error });
      return [];
    }
  }

  /**
   * Get job statistics
   */
  public async getJobStats(): Promise<Record<string, any>> {
    try {
      const jobs = Array.from(this.jobs.values());
      
      const stats = {
        total: jobs.length,
        queued: jobs.filter(j => j.status === 'queued').length,
        processing: jobs.filter(j => j.status === 'processing').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        cancelled: jobs.filter(j => j.status === 'cancelled').length
      };

      return stats;

    } catch (error) {
      this.logger.error('Failed to get job stats', { error });
      return {};
    }
  }

  /**
   * Delete job from storage
   */
  public async deleteJob(jobId: string): Promise<boolean> {
    try {
      const deleted = this.jobs.delete(jobId);
      if (deleted) {
        this.logger.debug('Job deleted', { jobId });
      }
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete job', { jobId, error });
      return false;
    }
  }

  /**
   * Delete old jobs
   */
  public async deleteOldJobs(olderThanMs: number): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanMs);
      let deletedCount = 0;

      for (const [jobId, job] of this.jobs) {
        if (job.createdAt < cutoffTime) {
          this.jobs.delete(jobId);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        this.logger.info(`Deleted ${deletedCount} old jobs`);
      }

      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to delete old jobs', { error });
      return 0;
    }
  }
}