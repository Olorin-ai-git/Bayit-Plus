/**
 * Job Monitoring Functions
 * 
 * Administrative functions for monitoring and managing CV generation jobs.
 * Includes scheduled monitoring, manual triggers, and job statistics.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { JobMonitoringService } from '../services/job-monitoring.service';

// CORS configuration for admin functions
const corsOptions = {
  cors: true
};

/**
 * Scheduled function to monitor and recover stuck CV generation jobs
 * Runs every 10 minutes to check for stuck jobs
  */
export const monitorStuckJobs = onSchedule({
  schedule: 'every 10 minutes',
  timeZone: 'UTC',
  memory: '1GiB',
  timeoutSeconds: 300
}, async (event) => {
  try {
    await JobMonitoringService.monitorStuckJobs();
  } catch (error) {
    logger.error('Scheduled job monitoring failed:', error);
  }
});

/**
 * Manual job monitoring trigger for admin use
  */
export const triggerJobMonitoring = onCall({
  memory: '1GiB',
  timeoutSeconds: 300,
  ...corsOptions
}, async (request) => {
  // Verify admin access (you might want to add proper admin check)
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  try {
    // Run monitoring
    await JobMonitoringService.monitorStuckJobs();
    
    // Get current stats
    const stats = await JobMonitoringService.getJobProcessingStats();
    
    return {
      success: true,
      message: 'Job monitoring completed successfully',
      stats: stats,
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});

/**
 * Get detailed information about a specific job for debugging
  */
export const getJobDetails = onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
  ...corsOptions
}, async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  const { jobId } = request.data;
  
  if (!jobId) {
    throw new Error('jobId is required');
  }
  
  try {
    await JobMonitoringService.logJobDetails(jobId);
    
    return {
      success: true,
      message: `Job details logged for ${jobId}`,
      jobId: jobId,
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      jobId: jobId,
      timestamp: new Date().toISOString()
    };
  }
});

/**
 * Get job processing statistics
  */
export const getJobStats = onCall({
  memory: '512MiB',
  timeoutSeconds: 30,
  ...corsOptions
}, async (request) => {
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  try {
    const stats = await JobMonitoringService.getJobProcessingStats();
    
    return {
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});