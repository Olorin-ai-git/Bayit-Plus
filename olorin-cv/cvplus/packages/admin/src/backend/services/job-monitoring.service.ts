/**
 * Job Monitoring Service
 * 
 * Service for monitoring CV generation jobs, detecting stuck jobs,
 * and providing job statistics for administrative oversight.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

export interface JobProcessingStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  stuckJobs: number;
  averageProcessingTime: number;
  successRate: number;
  jobsByStatus: Record<string, number>;
  processingTimeDistribution: {
    under1min: number;
    under5min: number;
    under15min: number;
    over15min: number;
  };
}

export interface JobDetails {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'stuck';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  processingTime?: number;
  errorDetails?: any;
  metadata: Record<string, any>;
}

export class JobMonitoringService {
  private static db = admin.firestore();

  /**
   * Monitor and recover stuck CV generation jobs
    */
  static async monitorStuckJobs(): Promise<void> {
    try {
      logger.info('Starting stuck job monitoring...');

      const stuckJobs = await this.identifyStuckJobs();
      logger.info(`Found ${stuckJobs.length} stuck jobs`);

      for (const job of stuckJobs) {
        await this.handleStuckJob(job);
      }

      // Update monitoring statistics
      await this.updateMonitoringStats(stuckJobs.length);

      logger.info('Stuck job monitoring completed');

    } catch (error) {
      logger.error('Error in stuck job monitoring:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific job
    */
  static async logJobDetails(jobId: string): Promise<JobDetails | null> {
    try {
      const jobDoc = await this.db.collection('jobs').doc(jobId).get();
      
      if (!jobDoc.exists) {
        logger.info(`Job ${jobId} not found`);
        return null;
      }

      const jobData = jobDoc.data()!;
      const jobDetails: JobDetails = {
        id: jobId,
        userId: jobData.userId,
        status: jobData.status,
        createdAt: jobData.createdAt?.toDate() || new Date(),
        updatedAt: jobData.updatedAt?.toDate() || new Date(),
        completedAt: jobData.completedAt?.toDate(),
        processingTime: jobData.processingTime,
        errorDetails: jobData.errorDetails,
        metadata: jobData.metadata || {}
      };

      // Log detailed information
      logger.info('Job Details:', {
        id: jobDetails.id,
        userId: jobDetails.userId,
        status: jobDetails.status,
        createdAt: jobDetails.createdAt.toISOString(),
        updatedAt: jobDetails.updatedAt.toISOString(),
        processingTime: jobDetails.processingTime,
        hasErrors: !!jobDetails.errorDetails
      });

      // Check for related documents
      await this.logRelatedJobDocuments(jobId, jobData.userId);

      return jobDetails;

    } catch (error) {
      logger.error(`Error getting job details for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Get comprehensive job processing statistics
    */
  static async getJobProcessingStats(): Promise<JobProcessingStats> {
    try {
      const last24Hours = new Date(Date.now() - (24 * 60 * 60 * 1000));

      // Get jobs from the last 24 hours
      const jobsQuery = await this.db
        .collection('jobs')
        .where('createdAt', '>=', last24Hours)
        .get();

      const stats: JobProcessingStats = {
        totalJobs: jobsQuery.size,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        stuckJobs: 0,
        averageProcessingTime: 0,
        successRate: 0,
        jobsByStatus: {},
        processingTimeDistribution: {
          under1min: 0,
          under5min: 0,
          under15min: 0,
          over15min: 0
        }
      };

      let totalProcessingTime = 0;
      let processedJobs = 0;

      jobsQuery.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status;

        // Count by status
        stats.jobsByStatus[status] = (stats.jobsByStatus[status] || 0) + 1;

        switch (status) {
          case 'processing':
          case 'pending':
            stats.activeJobs++;
            break;
          case 'completed':
            stats.completedJobs++;
            break;
          case 'failed':
          case 'error':
            stats.failedJobs++;
            break;
          case 'stuck':
            stats.stuckJobs++;
            break;
        }

        // Calculate processing time distribution
        if (data.processingTime) {
          totalProcessingTime += data.processingTime;
          processedJobs++;

          const timeInMinutes = data.processingTime / (1000 * 60);
          if (timeInMinutes < 1) {
            stats.processingTimeDistribution.under1min++;
          } else if (timeInMinutes < 5) {
            stats.processingTimeDistribution.under5min++;
          } else if (timeInMinutes < 15) {
            stats.processingTimeDistribution.under15min++;
          } else {
            stats.processingTimeDistribution.over15min++;
          }
        }
      });

      // Calculate derived metrics
      stats.averageProcessingTime = processedJobs > 0 ? totalProcessingTime / processedJobs : 0;
      stats.successRate = stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0;

      return stats;

    } catch (error) {
      logger.error('Error getting job processing stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Identify stuck jobs based on various criteria
    */
  private static async identifyStuckJobs(): Promise<JobDetails[]> {
    const stuckThreshold = new Date(Date.now() - (15 * 60 * 1000)); // 15 minutes ago
    const stuckJobs: JobDetails[] = [];

    try {
      // Find jobs that have been "processing" for too long
      const stuckProcessingQuery = await this.db
        .collection('jobs')
        .where('status', '==', 'processing')
        .where('updatedAt', '<', stuckThreshold)
        .get();

      stuckProcessingQuery.docs.forEach(doc => {
        const data = doc.data();
        stuckJobs.push({
          id: doc.id,
          userId: data.userId,
          status: 'stuck',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
          processingTime: data.processingTime,
          errorDetails: data.errorDetails,
          metadata: data.metadata || {}
        });
      });

      // Find jobs that are pending for too long
      const longPendingThreshold = new Date(Date.now() - (30 * 60 * 1000)); // 30 minutes ago
      const stuckPendingQuery = await this.db
        .collection('jobs')
        .where('status', '==', 'pending')
        .where('createdAt', '<', longPendingThreshold)
        .get();

      stuckPendingQuery.docs.forEach(doc => {
        const data = doc.data();
        stuckJobs.push({
          id: doc.id,
          userId: data.userId,
          status: 'stuck',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
          processingTime: data.processingTime,
          errorDetails: data.errorDetails,
          metadata: data.metadata || {}
        });
      });

    } catch (error) {
      logger.error('Error identifying stuck jobs:', error);
    }

    return stuckJobs;
  }

  /**
   * Handle a stuck job by attempting recovery or marking as failed
    */
  private static async handleStuckJob(job: JobDetails): Promise<void> {
    try {
      logger.info(`Handling stuck job: ${job.id}`);

      // Check if the job can be recovered
      const canRecover = await this.canJobBeRecovered(job);

      if (canRecover) {
        // Attempt to recover the job
        await this.recoverStuckJob(job);
        logger.info(`Successfully recovered stuck job: ${job.id}`);
      } else {
        // Mark job as failed
        await this.markJobAsFailed(job);
        logger.info(`Marked stuck job as failed: ${job.id}`);
      }

    } catch (error) {
      logger.error(`Error handling stuck job ${job.id}:`, error);
    }
  }

  /**
   * Check if a stuck job can be recovered
    */
  private static async canJobBeRecovered(job: JobDetails): Promise<boolean> {
    try {
      // Check if job has been stuck for too long (over 1 hour = unrecoverable)
      const stuckDuration = Date.now() - job.updatedAt.getTime();
      if (stuckDuration > 60 * 60 * 1000) { // 1 hour
        return false;
      }

      // Check if user still exists
      const userDoc = await this.db.collection('users').doc(job.userId).get();
      if (!userDoc.exists) {
        return false;
      }

      // Check if there are any critical errors
      if (job.errorDetails && job.errorDetails.critical) {
        return false;
      }

      // If the job has already been retried multiple times, don't retry again
      const retryCount = job.metadata.retryCount || 0;
      if (retryCount >= 3) {
        return false;
      }

      return true;

    } catch (error) {
      logger.error(`Error checking if job can be recovered: ${job.id}`, error);
      return false;
    }
  }

  /**
   * Attempt to recover a stuck job
    */
  private static async recoverStuckJob(job: JobDetails): Promise<void> {
    try {
      const retryCount = (job.metadata.retryCount || 0) + 1;

      await this.db.collection('jobs').doc(job.id).update({
        status: 'pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        'metadata.retryCount': retryCount,
        'metadata.recoveredAt': admin.firestore.FieldValue.serverTimestamp(),
        'metadata.recoveryReason': 'Stuck job recovery'
      });

      // Log recovery action
      await this.db.collection('job_recovery_logs').add({
        jobId: job.id,
        userId: job.userId,
        action: 'recovery_attempt',
        retryCount,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      logger.error(`Error recovering stuck job ${job.id}:`, error);
    }
  }

  /**
   * Mark a stuck job as failed
    */
  private static async markJobAsFailed(job: JobDetails): Promise<void> {
    try {
      await this.db.collection('jobs').doc(job.id).update({
        status: 'failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        errorDetails: {
          ...job.errorDetails,
          reason: 'Job stuck and could not be recovered',
          failedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });

      // Log failure action
      await this.db.collection('job_recovery_logs').add({
        jobId: job.id,
        userId: job.userId,
        action: 'marked_as_failed',
        reason: 'Stuck job could not be recovered',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      logger.error(`Error marking stuck job as failed ${job.id}:`, error);
    }
  }

  /**
   * Log related job documents for debugging
    */
  private static async logRelatedJobDocuments(jobId: string, userId: string): Promise<void> {
    try {
      // Check for related CV data
      const cvQuery = await this.db
        .collection('cv_data')
        .where('jobId', '==', jobId)
        .get();

      logger.info(`Related CV documents: ${cvQuery.size}`);

      // Check for processing logs
      const logsQuery = await this.db
        .collection('processing_logs')
        .where('jobId', '==', jobId)
        .get();

      logger.info(`Processing logs: ${logsQuery.size}`);

      // Check user's other recent jobs
      const userJobsQuery = await this.db
        .collection('jobs')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      logger.info(`User's recent jobs: ${userJobsQuery.size}`);

    } catch (error) {
      logger.error('Error logging related job documents:', error);
    }
  }

  /**
   * Update monitoring statistics
    */
  private static async updateMonitoringStats(stuckJobsFound: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await this.db.collection('job_monitoring_stats').doc(today).set({
        date: today,
        stuckJobsFound,
        lastMonitoringRun: admin.firestore.FieldValue.serverTimestamp(),
        totalMonitoringRuns: admin.firestore.FieldValue.increment(1)
      }, { merge: true });

    } catch (error) {
      logger.error('Error updating monitoring stats:', error);
    }
  }

  /**
   * Get default statistics
    */
  private static getDefaultStats(): JobProcessingStats {
    return {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      stuckJobs: 0,
      averageProcessingTime: 0,
      successRate: 0,
      jobsByStatus: {},
      processingTimeDistribution: {
        under1min: 0,
        under5min: 0,
        under15min: 0,
        over15min: 0
      }
    };
  }
}