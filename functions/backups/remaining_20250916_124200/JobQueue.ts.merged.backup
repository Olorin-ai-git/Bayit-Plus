// @ts-ignore - Export conflicts/**
 * Job Queue Implementation
 * 
 * Manages job queuing with priority support, persistence,
 * and efficient processing coordination for multimedia jobs.
 */

import { JobResult, JobPriority } from '../../types';
import { Logger } from '../utils/Logger';

export interface QueueStats {
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  priorityDistribution: Record<JobPriority, number>;
}

/**
 * Priority-based job queue implementation
 */
export class JobQueue {
  private readonly logger: Logger;
  private readonly queues: Map<JobPriority, JobResult[]>;
  private readonly priorityOrder: JobPriority[] = ['urgent', 'high', 'normal', 'low'];
  private readonly config: any;

  constructor(config: any = {}) {
    this.config = config;
    this.logger = new Logger('JobQueue');
    this.queues = new Map();
    
    // Initialize priority queues
    this.priorityOrder.forEach(priority => {
      this.queues.set(priority, []);
    });
  }

  /**
   * Add job to appropriate priority queue
   */
  public async enqueue(job: JobResult): Promise<void> {
    try {
      const priority = job.priority || 'normal';
      const queue = this.queues.get(priority);
      
      if (!queue) {
        throw new Error(`Invalid priority: ${priority}`);
      }

      queue.push(job);
      
      // Sort queue by creation time (FIFO within same priority)
      queue.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      this.logger.debug('Job enqueued', { 
        jobId: job.id, 
        priority, 
        queueSize: queue.length 
      });

    } catch (error) {
      this.logger.error('Failed to enqueue job', { jobId: job.id, error });
      throw error;
    }
  }

  /**
   * Get next job from highest priority queue
   */
  public async dequeue(): Promise<JobResult | null> {
    try {
      // Check queues in priority order
      for (const priority of this.priorityOrder) {
        const queue = this.queues.get(priority);
        if (queue && queue.length > 0) {
          const job = queue.shift()!;
          
          this.logger.debug('Job dequeued', { 
            jobId: job.id, 
            priority, 
            remainingInQueue: queue.length 
          });
          
          return job;
        }
      }

      return null; // No jobs available

    } catch (error) {
      this.logger.error('Failed to dequeue job', { error });
      return null;
    }
  }

  /**
   * Remove specific job from queue
   */
  public async remove(jobId: string): Promise<boolean> {
    try {
      for (const [priority, queue] of this.queues) {
        const index = queue.findIndex(job => job.id === jobId);
        
        if (index !== -1) {
          queue.splice(index, 1);
          
          this.logger.debug('Job removed from queue', { 
            jobId, 
            priority, 
            remainingInQueue: queue.length 
          });
          
          return true;
        }
      }

      return false; // Job not found

    } catch (error) {
      this.logger.error('Failed to remove job from queue', { jobId, error });
      return false;
    }
  }

  /**
   * Get job by ID from any queue
   */
  public async getJob(jobId: string): Promise<JobResult | null> {
    for (const queue of this.queues.values()) {
      const job = queue.find(job => job.id === jobId);
      if (job) {
        return job;
      }
    }

    return null;
  }

  /**
   * Get all jobs from specific priority queue
   */
  public async getJobsByPriority(priority: JobPriority): Promise<JobResult[]> {
    const queue = this.queues.get(priority);
    return queue ? [...queue] : [];
  }

  /**
   * Get all queued jobs
   */
  public async getAllJobs(): Promise<JobResult[]> {
    const allJobs: JobResult[] = [];
    
    for (const queue of this.queues.values()) {
      allJobs.push(...queue);
    }
    
    // Sort by creation time
    return allJobs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Get queue statistics
   */
  public async getStats(): Promise<QueueStats> {
    const stats: QueueStats = {
      totalJobs: 0,
      queuedJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      priorityDistribution: {
        urgent: 0,
        high: 0,
        normal: 0,
        low: 0
      }
    };

    for (const [priority, queue] of this.queues) {
      stats.priorityDistribution[priority] = queue.length;
      stats.totalJobs += queue.length;
      
      // All jobs in queue are "queued" status
      stats.queuedJobs += queue.length;
    }

    return stats;
  }

  /**
   * Get queue size for specific priority
   */
  public getQueueSize(priority?: JobPriority): number {
    if (priority) {
      const queue = this.queues.get(priority);
      return queue ? queue.length : 0;
    }

    // Return total size across all priorities
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Check if queue is empty
   */
  public isEmpty(): boolean {
    return this.getQueueSize() === 0;
  }

  /**
   * Clear all queues
   */
  public async clear(): Promise<void> {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
    
    this.logger.info('All queues cleared');
  }

  /**
   * Clear specific priority queue
   */
  public async clearPriority(priority: JobPriority): Promise<void> {
    const queue = this.queues.get(priority);
    if (queue) {
      queue.length = 0;
      this.logger.info(`${priority} priority queue cleared`);
    }
  }

  /**
   * Update job priority (move between queues)
   */
  public async updateJobPriority(jobId: string, newPriority: JobPriority): Promise<boolean> {
    try {
      // Find and remove job from current queue
      let job: JobResult | undefined;
      
      for (const [priority, queue] of this.queues) {
        const index = queue.findIndex(j => j.id === jobId);
        if (index !== -1) {
          job = queue.splice(index, 1)[0];
          break;
        }
      }

      if (!job) {
        return false; // Job not found
      }

      // Update priority and re-enqueue
      job.priority = newPriority;
      await this.enqueue(job);

      this.logger.info('Job priority updated', { 
        jobId, 
        newPriority 
      });

      return true;

    } catch (error) {
      this.logger.error('Failed to update job priority', { jobId, newPriority, error });
      return false;
    }
  }

  /**
   * Peek at next job without removing it
   */
  public async peek(): Promise<JobResult | null> {
    for (const priority of this.priorityOrder) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }

    return null;
  }

  /**
   * Get jobs older than specified time
   */
  public async getOldJobs(olderThanMs: number): Promise<JobResult[]> {
    const cutoffTime = new Date(Date.now() - olderThanMs);
    const oldJobs: JobResult[] = [];

    for (const queue of this.queues.values()) {
      for (const job of queue) {
        if (job.createdAt < cutoffTime) {
          oldJobs.push(job);
        }
      }
    }

    return oldJobs;
  }

  /**
   * Remove old jobs from queues
   */
  public async cleanupOldJobs(olderThanMs: number): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanMs);
    let removedCount = 0;

    for (const queue of this.queues.values()) {
      let i = 0;
      while (i < queue.length) {
        if (queue[i].createdAt < cutoffTime) {
          queue.splice(i, 1);
          removedCount++;
        } else {
          i++;
        }
      }
    }

    if (removedCount > 0) {
      this.logger.info(`Cleaned up ${removedCount} old jobs`);
    }

    return removedCount;
  }

  /**
   * Export queue state for debugging
   */
  public exportState(): Record<string, any> {
    const state: Record<string, any> = {
      timestamp: new Date().toISOString(),
      queues: {},
      stats: {}
    };

    // Export queue contents
    for (const [priority, queue] of this.queues) {
      state.queues[priority] = queue.map(job => ({
        id: job.id,
        type: job.type,
        createdAt: job.createdAt,
        status: job.status
      }));
    }

    // Export statistics
    state.stats = {
      totalJobs: this.getQueueSize(),
      priorityDistribution: Object.fromEntries(
        this.priorityOrder.map(p => [p, this.getQueueSize(p)])
      )
    };

    return state;
  }
}