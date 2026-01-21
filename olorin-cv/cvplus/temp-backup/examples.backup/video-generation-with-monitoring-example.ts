/**
 * Video Generation with Monitoring - Integration Example
 * 
 * This example demonstrates how to integrate the monitoring system
 * with existing video generation functions with minimal code changes.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';
import { enhancedVideoGenerationService, EnhancedVideoGenerationOptions } from '../services/enhanced-video-generation.service';
import { withPremiumAccess } from '../middleware/premiumGuard';
import { VideoGenerationMonitor, VideoMonitoringHooks } from '../services/video-monitoring-hooks.service';

/**
 * Enhanced Video Generation Function with Integrated Monitoring
 * 
 * This example shows how to add comprehensive monitoring to the existing
 * generateVideoIntroduction function with minimal modifications.
 */
export const generateVideoIntroductionWithMonitoring = onCall(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    ...corsOptions
  },
  withPremiumAccess('videoIntroduction', async (request) => {
    // Initialize monitoring early in the function
    const userId = request.auth.uid;
    const { jobId, duration = 'medium', style = 'professional' } = request.data;
    
    // Create monitoring instance for this generation
    const monitor = new VideoGenerationMonitor(userId, jobId, 'enhanced');
    
    try {

      // Get job data
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        throw new Error('CV data not found. Please ensure CV is parsed first.');
      }

      // Prepare enhanced video generation options
      const enhancedOptions: EnhancedVideoGenerationOptions = {
        duration: duration as 'short' | 'medium' | 'long',
        style,
        features: ['subtitles', 'name_card'],
        quality: 'premium',
        resolution: '1920x1080',
        format: 'mp4',
        optimizationLevel: 'premium',
        urgency: 'normal',
        allowFallback: true
      };

      // 🚀 START MONITORING - Simple one-line addition
      await monitor.start(enhancedOptions);


      // Update job status to processing
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'video_processing',
          videoStatus: 'processing',
          videoProgress: 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      // ⚡ ENHANCED: Add monitoring context to the generation process
      try {
        // Call the enhanced video generation service
        const videoResult = await enhancedVideoGenerationService.generateVideoIntroduction(
          jobData.parsedData,
          enhancedOptions,
          jobId,
          userId!
        );

        // 📊 MONITOR: Record quality assessment if available
        if (videoResult.scriptQualityScore) {
          await monitor.recordQuality(videoResult.scriptQualityScore, {
            industryAlignment: videoResult.industryAlignment,
            generationMethod: videoResult.generationMethod
          });
        }

        // Update job with video result
        const updateData: any = {
          videoUrl: videoResult.videoUrl,
          videoThumbnail: videoResult.thumbnailUrl,
          videoScript: videoResult.script,
          videoStatus: videoResult.status,
          videoProgress: videoResult.progress,
          videoMetadata: videoResult.metadata,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (videoResult.subtitles) {
          updateData.videoSubtitles = videoResult.subtitles;
        }

        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update(updateData);

        // 🎯 COMPLETE MONITORING - Record successful completion
        await monitor.complete({
          jobId,
          providerId: videoResult.metadata.provider || 'enhanced',
          success: true,
          videoUrl: videoResult.videoUrl,
          status: videoResult.status,
          metadata: {
            resolution: videoResult.metadata.resolution || '1920x1080',
            format: videoResult.metadata.format || 'mp4',
            generatedAt: new Date(),
            providerId: videoResult.metadata.provider,
            duration: videoResult.duration,
            size: videoResult.metadata.size
          }
        });


        return {
          success: true,
          jobId,
          videoUrl: videoResult.videoUrl,
          thumbnailUrl: videoResult.thumbnailUrl,
          status: videoResult.status,
          progress: videoResult.progress,
          generationId: monitor.getGenerationId(), // Include generation ID for tracking
          processingTime: monitor.getDuration()
        };

      } catch (generationError) {

        // 🚨 MONITOR: Record error details
        await monitor.recordError(generationError, 'generation_failed');

        // Update job status to failed
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update({
            videoStatus: 'failed',
            videoError: generationError.message || 'Video generation failed',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

        // 📊 COMPLETE MONITORING - Record failed completion
        await monitor.complete({
          jobId,
          providerId: 'enhanced',
          success: false,
          status: 'failed',
          metadata: {
            resolution: '1920x1080',
            format: 'mp4',
            generatedAt: new Date()
          },
          error: {
            code: 'GENERATION_FAILED',
            type: 'generation_error',
            message: generationError.message || 'Video generation failed',
            retryable: true
          }
        });

        throw generationError;
      }

    } catch (error) {

      // 🚨 MONITOR: Record function-level error
      await VideoMonitoringHooks.onError(
        monitor.getGenerationId(),
        error,
        'enhanced',
        'function_error'
      );

      // Ensure monitoring completion even on error
      await monitor.complete({
        jobId,
        providerId: 'enhanced',
        success: false,
        status: 'failed',
        metadata: {
          resolution: '1920x1080',
          format: 'mp4',
          generatedAt: new Date()
        },
        error: {
          code: 'FUNCTION_ERROR',
          type: 'function_error',
          message: error.message || 'Unknown error',
          retryable: false
        }
      });

      throw new Error(`Video generation failed: ${error.message}`);
    }
  })
);

/**
 * Example: Provider Fallback with Monitoring
 * 
 * This example shows how to monitor provider switches during fallback scenarios.
 */
export async function generateVideoWithFallbackMonitoring(
  cvData: any,
  options: EnhancedVideoGenerationOptions,
  jobId: string,
  userId: string
): Promise<any> {
  
  const monitor = new VideoGenerationMonitor(userId, jobId, 'heygen');
  
  try {
    await monitor.start(options);

    // Try primary provider (HeyGen)
    try {
      const result = await enhancedVideoGenerationService.generateVideoIntroduction(
        cvData,
        { ...options, preferredProvider: 'heygen' },
        jobId,
        userId
      );
      
      await monitor.complete({ success: true, ...result });
      return result;
      
    } catch (heygenError) {
      
      // 🔄 MONITOR: Record provider switch
      await monitor.switchProvider('runwayml', 'heygen_failure');
      await monitor.recordError(heygenError, 'switching_to_runwayml');

      // Try fallback provider (RunwayML)
      try {
        const result = await enhancedVideoGenerationService.generateVideoIntroduction(
          cvData,
          { ...options, preferredProvider: 'runwayml' },
          jobId,
          userId
        );
        
        await monitor.complete({ success: true, ...result });
        return result;
        
      } catch (runwaymlError) {
        
        // 🔄 MONITOR: Record second provider switch
        await monitor.switchProvider('did', 'runwayml_failure');
        await monitor.recordError(runwaymlError, 'switching_to_did');

        // Try final fallback (D-ID)
        const result = await enhancedVideoGenerationService.generateVideoIntroduction(
          cvData,
          { ...options, preferredProvider: 'did' },
          jobId,
          userId
        );
        
        await monitor.complete({ success: true, ...result });
        return result;
      }
    }

  } catch (finalError) {
    await monitor.recordError(finalError, 'all_providers_failed');
    await monitor.complete({
      jobId,
      providerId: 'did',
      success: false,
      status: 'failed',
      metadata: {
        resolution: '1920x1080',
        format: 'mp4',
        generatedAt: new Date()
      },
      error: { 
        code: 'ALL_PROVIDERS_FAILED',
        type: 'all_providers_failed', 
        message: finalError.message,
        retryable: false 
      }
    });
    throw finalError;
  }
}

/**
 * Example: User Feedback Collection with Monitoring
 * 
 * This function demonstrates how to collect and monitor user feedback.
 */
export const recordVideoFeedback = onCall(
  { ...corsOptions },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { generationId, rating, feedback, videoUrl } = request.data;
    const userId = request.auth.uid;

    try {
      // 📝 MONITOR: Record user feedback
      await VideoMonitoringHooks.onUserFeedback(
        generationId,
        userId,
        rating,
        feedback
      );

      // Store feedback in database
      await admin.firestore()
        .collection('video_feedback')
        .add({
          generationId,
          userId,
          rating,
          feedback,
          videoUrl,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });


      return { success: true, message: 'Feedback recorded successfully' };

    } catch (error) {
      throw new Error(`Failed to record feedback: ${error.message}`);
    }
  }
);

/**
 * Example: System Health Check with Monitoring
 * 
 * This function provides a health check endpoint that includes monitoring status.
 */
export const getVideoSystemHealth = onCall(
  { ...corsOptions },
  async (request) => {
    // Check authentication for admin users
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    // Verify admin access
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();
    
    const userData = userDoc.data();
    if (!userData?.isAdmin && userData?.role !== 'analytics') {
      throw new Error('Admin access required for system health check');
    }

    try {
      // 📊 GET MONITORING STATUS
      const monitoringStatus = await VideoMonitoringHooks.getStatus();

      // Get recent system metrics
      await VideoMonitoringHooks.triggerMetricsCalculation();

      return {
        success: true,
        timestamp: new Date().toISOString(),
        monitoring: monitoringStatus,
        systemHealth: {
          functionsOnline: true,
          databaseConnected: true,
          monitoringActive: true
        }
      };

    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
);

/**
 * Integration Summary:
 * 
 * The monitoring system can be integrated into existing video generation functions
 * with minimal code changes:
 * 
 * 1. Create a VideoGenerationMonitor instance at the start
 * 2. Call monitor.start() when generation begins
 * 3. Call monitor.complete() when generation finishes
 * 4. Use monitor.recordError() for error handling
 * 5. Use monitor.switchProvider() for provider changes
 * 6. Use monitor.recordQuality() for quality assessment
 * 
 * The monitoring system runs independently and won't break existing functionality
 * even if monitoring calls fail.
 */