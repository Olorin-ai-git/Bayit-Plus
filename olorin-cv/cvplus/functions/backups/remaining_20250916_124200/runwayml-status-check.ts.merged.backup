// @ts-ignore - Export conflicts/**
 * RunwayML Status Check Function
 * 
 * Firebase Function to manually check RunwayML video generation status
 * for debugging and manual status updates when polling fails.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { enhancedVideoGenerationService } from '../services/enhanced-video-generation.service';
import { VideoProviderError, VideoProviderErrorType } from '../services/video-providers/base-provider.interface';
import * as admin from 'firebase-admin';

// CORS configuration
const corsOptions = {
  cors: true
};

/**
 * Manual RunwayML Status Check
 * 
 * HTTP endpoint to manually check status of a RunwayML video generation job
 * Useful for debugging and manual status updates
 */
export const runwaymlStatusCheck = onRequest(
  {
    timeoutSeconds: 30,
    memory: '512MiB',
    maxInstances: 50,
    ...corsOptions
  },
  async (request, response) => {
    const startTime = Date.now();
    
    try {
      
      // Validate HTTP method
      if (request.method !== 'POST' && request.method !== 'GET') {
        response.status(405).json({
          error: 'Method not allowed',
          allowed: ['POST', 'GET']
        });
        return;
      }
      
      // Extract job ID from query parameter or body
      const jobId = request.method === 'GET' 
        ? request.query.jobId as string
        : request.body?.jobId;
      
      if (!jobId) {
        response.status(400).json({
          error: 'Missing job ID',
          message: 'Job ID must be provided in query parameter or request body'
        });
        return;
      }
      
      
      // Check status using enhanced video generation service
      const status = await enhancedVideoGenerationService.checkVideoStatus(jobId);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[RunwayML Status Check] Status retrieved in ${processingTime}ms:`, {
        jobId: status.jobId,
        status: status.status,
        progress: status.progress
      });
      
      // Return status information
      response.status(200).json({
        success: true,
        message: 'Status retrieved successfully',
        data: {
          jobId: status.jobId,
          providerId: status.providerId,
          status: status.status,
          progress: status.progress,
          videoUrl: status.videoUrl,
          thumbnailUrl: status.thumbnailUrl,
          duration: status.duration,
          error: status.error,
          lastUpdated: status.lastUpdated,
          processingTime
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error('[RunwayML Status Check] Failed:', {
        error: error.message,
        type: error.type || 'unknown',
        processingTime,
        jobId: request.query.jobId || request.body?.jobId
      });
      
      // Handle specific error types
      if (error instanceof VideoProviderError) {
        switch (error.type) {
          case VideoProviderErrorType.INVALID_PARAMETERS:
            response.status(404).json({
              error: 'Job not found',
              message: error.message,
              type: error.type
            });
            return;
            
          case VideoProviderErrorType.PROVIDER_UNAVAILABLE:
            response.status(503).json({
              error: 'Provider unavailable',
              message: error.message,
              type: error.type,
              retryable: error.retryable
            });
            return;
            
          default:
            response.status(500).json({
              error: 'Status check failed',
              message: error.message,
              type: error.type,
              retryable: error.retryable
            });
            return;
        }
      }
      
      // Handle unexpected errors
      response.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while checking status',
        timestamp: new Date().toISOString(),
        processingTime
      });
      return;
    }
  }
);

/**
 * RunwayML Batch Status Check
 * 
 * Check status for multiple RunwayML jobs in a single request
 * Useful for monitoring dashboard and bulk status updates
 */
export const runwaymlBatchStatusCheck = onRequest(
  {
    timeoutSeconds: 60,
    memory: '1GiB',
    maxInstances: 20,
    ...corsOptions
  },
  async (request, response) => {
    const startTime = Date.now();
    
    try {
      
      // Validate HTTP method
      if (request.method !== 'POST') {
        response.status(405).json({
          error: 'Method not allowed',
          allowed: ['POST']
        });
        return;
      }
      
      // Validate payload
      const { jobIds } = request.body;
      
      if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
        response.status(400).json({
          error: 'Invalid job IDs',
          message: 'jobIds must be a non-empty array'
        });
        return;
      }
      
      if (jobIds.length > 50) {
        response.status(400).json({
          error: 'Too many jobs',
          message: 'Maximum 50 jobs per batch request'
        });
        return;
      }
      
      
      // Check status for all jobs
      const results = await Promise.allSettled(
        jobIds.map(async (jobId: string) => {
          try {
            const status = await enhancedVideoGenerationService.checkVideoStatus(jobId);
            return {
              jobId,
              success: true,
              status
            };
          } catch (error: any) {
            return {
              jobId,
              success: false,
              error: {
                message: error.message,
                type: error.type || 'unknown'
              }
            };
          }
        })
      );
      
      // Process results
      const successful = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);
      
      const failed = results
        .filter(result => result.status === 'rejected')
        .map(result => ({
          error: (result as PromiseRejectedResult).reason
        }));
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[RunwayML Batch Status Check] Completed in ${processingTime}ms:`, {
        total: jobIds.length,
        successful: successful.length,
        failed: failed.length
      });
      
      response.status(200).json({
        success: true,
        message: 'Batch status check completed',
        data: {
          total: jobIds.length,
          successful: successful.length,
          failed: failed.length,
          results: successful,
          errors: failed.length > 0 ? failed : undefined,
          processingTime
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error('[RunwayML Batch Status Check] Failed:', {
        error: error.message,
        processingTime
      });
      
      response.status(500).json({
        error: 'Batch status check failed',
        message: error.message,
        processingTime,
        timestamp: new Date().toISOString()
      });
      return;
    }
  }
);

/**
 * RunwayML Polling Task Handler
 * 
 * Cloud Task handler for automated status polling of RunwayML jobs
 * This provides backup polling in case the internal polling manager fails
 */
export const runwaymlPollingTask = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 3,
      minBackoffSeconds: 5,
      maxBackoffSeconds: 60,
      maxDoublings: 3
    },
    rateLimits: {
      maxDispatchesPerSecond: 10,
      maxConcurrentDispatches: 50
    }
  },
  async (request) => {
    const startTime = Date.now();
    
    try {
      const { jobId, runwayId, pollCount = 0 } = request.data;
      
      if (!jobId || !runwayId) {
        throw new Error('Missing required parameters: jobId and runwayId');
      }
      
      
      // Check status
      const status = await enhancedVideoGenerationService.checkVideoStatus(jobId);
      
      // Update Firestore with latest status
      const db = admin.firestore();
      await db.collection('runwayml_jobs').doc(jobId).update({
        status: status.status,
        progress: status.progress,
        videoUrl: status.videoUrl,
        thumbnailUrl: status.thumbnailUrl,
        duration: status.duration,
        error: status.error,
        lastPolled: admin.firestore.FieldValue.serverTimestamp(),
        pollCount: pollCount + 1
      });
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[RunwayML Polling Task] Completed in ${processingTime}ms:`, {
        jobId,
        status: status.status,
        progress: status.progress,
        isComplete: status.status === 'completed' || status.status === 'failed'
      });
      
      // Schedule next poll if not complete and under limits
      if (status.status !== 'completed' && status.status !== 'failed' && pollCount < 180) {
        // Schedule next poll in 5-15 seconds based on current poll count
        const delay = Math.min(5 + pollCount * 0.5, 15);
        
        await admin.firestore().collection('_tasks').add({
          type: 'runwayml-polling',
          scheduledTime: admin.firestore.Timestamp.fromMillis(Date.now() + delay * 1000),
          data: {
            jobId,
            runwayId,
            pollCount: pollCount + 1
          }
        });
        
      }
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error('[RunwayML Polling Task] Failed:', {
        error: error.message,
        jobId: request.data?.jobId,
        processingTime
      });
      
      // Don't throw to avoid task retry for permanent failures
      if (error instanceof VideoProviderError && !error.retryable) {
        return;
      }
      
      throw error; // Let Cloud Tasks handle retries for retryable errors
    }
  }
);

/**
 * RunwayML Job Cleanup Task
 * 
 * Cloud Task handler for cleaning up old RunwayML job records
 * Runs periodically to remove completed jobs older than specified retention period
 */
export const runwaymlCleanupTask = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 2,
      minBackoffSeconds: 30,
      maxBackoffSeconds: 300
    }
  },
  async (request) => {
    const startTime = Date.now();
    
    try {
      const { retentionDays = 30 } = request.data;
      
      
      const db = admin.firestore();
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      // Find old completed jobs
      const oldJobsQuery = await db
        .collection('runwayml_jobs')
        .where('status', 'in', ['completed', 'failed'])
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
        .limit(100) // Process in batches
        .get();
      
      if (oldJobsQuery.empty) {
        return;
      }
      
      const batch = db.batch();
      let deleteCount = 0;
      
      oldJobsQuery.forEach(doc => {
        batch.delete(doc.ref);
        deleteCount++;
      });
      
      await batch.commit();
      
      const processingTime = Date.now() - startTime;
      
      console.log(`[RunwayML Cleanup Task] Completed in ${processingTime}ms:`, {
        deletedJobs: deleteCount,
        retentionDays
      });
      
      // Schedule next cleanup if there might be more records
      if (deleteCount === 100) {
        await admin.firestore().collection('_tasks').add({
          type: 'runwayml-cleanup',
          scheduledTime: admin.firestore.Timestamp.fromMillis(Date.now() + 60000), // 1 minute
          data: { retentionDays }
        });
        
      }
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error('[RunwayML Cleanup Task] Failed:', {
        error: error.message,
        processingTime
      });
      
      throw error;
    }
  }
);