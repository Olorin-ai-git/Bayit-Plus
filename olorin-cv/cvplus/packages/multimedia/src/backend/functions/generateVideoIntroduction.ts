import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { videoGenerationService } from '../services/video-generation.service';
import { enhancedVideoGenerationService, EnhancedVideoGenerationOptions } from '../services/enhanced-video-generation.service';
import { withPremiumAccess } from '../middleware/simplePremiumGuard';
// htmlFragmentGenerator import removed - using React SPA architecture

export const generateVideoIntroduction = onCall(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    ...corsOptions
  },
  withPremiumAccess('videoIntroduction', async (request) => {

    const userId = request.auth.uid;
    const { 
      jobId, 
      duration = 'medium',
      style = 'professional',
      avatarStyle = 'realistic',
      background = 'office',
      includeSubtitles = true,
      includeNameCard = true
    } = request.data;

    try {
      // Get the job data with parsed CV
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

      // Update status to processing
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.videoIntroduction.status': 'processing',
          'enhancedFeatures.videoIntroduction.progress': 25,
          'enhancedFeatures.videoIntroduction.currentStep': 'Generating video script...',
          'enhancedFeatures.videoIntroduction.startedAt': FieldValue.serverTimestamp(),
          videoStatus: 'generating',
          updatedAt: FieldValue.serverTimestamp()
        });

      // Generate video introduction with enhanced service (HeyGen integration)
      const enhancedOptions: EnhancedVideoGenerationOptions = {
        duration,
        style,
        avatarStyle,
        background,
        includeSubtitles,
        includeNameCard,
        jobId,
        // Enhanced options
        useAdvancedPrompts: true,
        optimizationLevel: 'advanced',
        allowFallback: true,
        urgency: 'normal',
        qualityLevel: 'standard'
      };
      
      const videoResult = await enhancedVideoGenerationService.generateVideoIntroduction(
        jobData.parsedData,
        enhancedOptions,
        jobId,
        userId
      );

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.videoIntroduction.progress': 75,
          'enhancedFeatures.videoIntroduction.currentStep': 'Finalizing video...'
        });

      // Generate HTML fragment for progressive enhancement
      // HTML generation removed - React SPA handles UI rendering;

      // Update job with video completion
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.videoIntroduction.status': videoResult.status === 'completed' ? 'completed' : 'processing',
          'enhancedFeatures.videoIntroduction.progress': videoResult.progress,
          'enhancedFeatures.videoIntroduction.data': videoResult,
          'enhancedFeatures.videoIntroduction.provider': videoResult.providerId,
          'enhancedFeatures.videoIntroduction.selectionReasoning': videoResult.selectionReasoning,
          'enhancedFeatures.videoIntroduction.estimatedCost': videoResult.estimatedCost,
          'enhancedFeatures.videoIntroduction.htmlFragment': null, // HTML fragment removed with React SPA migration
          'enhancedFeatures.videoIntroduction.processedAt': FieldValue.serverTimestamp(),
          videoStatus: videoResult.status === 'completed' ? 'completed' : videoResult.status,
          video: {
            url: videoResult.videoUrl,
            thumbnailUrl: videoResult.thumbnailUrl,
            duration: videoResult.duration,
            script: videoResult.script,
            subtitles: videoResult.subtitles,
            metadata: videoResult.metadata,
            provider: videoResult.providerId,
            generationMethod: videoResult.generationMethod,
            scriptQualityScore: videoResult.scriptQualityScore,
            generatedAt: FieldValue.serverTimestamp()
          },
          'enhancedFeatures.video': {
            enabled: true,
            status: videoResult.status,
            provider: videoResult.providerId,
            data: {
              videoUrl: videoResult.videoUrl,
              thumbnailUrl: videoResult.thumbnailUrl,
              duration: videoResult.duration,
              progress: videoResult.progress,
              error: videoResult.error
            }
          },
          updatedAt: FieldValue.serverTimestamp()
        });

      return {
        success: true,
        video: videoResult,
        htmlFragment: null
      };
    } catch (error: any) {
      
      // Update status to failed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.videoIntroduction.status': 'failed',
          'enhancedFeatures.videoIntroduction.error': error.message,
          'enhancedFeatures.videoIntroduction.processedAt': FieldValue.serverTimestamp(),
          videoStatus: 'failed',
          videoError: error.message,
          updatedAt: FieldValue.serverTimestamp()
        });
      
      throw new Error(`Failed to generate video introduction: ${error.message}`);
    }
  })
);

export const regenerateVideoIntroduction = onCall(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    ...corsOptions
  },
  withPremiumAccess('videoIntroduction', async (request) => {

    const userId = request.auth.uid;
    const { 
      jobId,
      customScript,
      duration,
      style,
      avatarStyle,
      background
    } = request.data;

    try {
      // Get the job data
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      
      // Update status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          videoStatus: 'regenerating',
          updatedAt: FieldValue.serverTimestamp()
        });

      // If custom script provided, create video with that script
      if (customScript) {
        // Direct video creation with custom script
        const videoData = await videoGenerationService.createVideoWithAvatar(
          customScript,
          jobId,
          {
            duration: duration || jobData?.video?.duration || 'medium',
            style: style || jobData?.video?.style || 'professional',
            avatarStyle: avatarStyle || jobData?.video?.avatarStyle || 'realistic',
            background: background || jobData?.video?.background || 'office'
          }
        );

        const thumbnailUrl = await videoGenerationService.generateThumbnail(
          videoData.videoUrl,
          jobId
        );

        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update({
            videoStatus: 'completed',
            video: {
              ...jobData?.video,
              url: videoData.videoUrl,
              thumbnailUrl,
              script: customScript,
              regeneratedAt: FieldValue.serverTimestamp()
            },
            updatedAt: FieldValue.serverTimestamp()
          });

        return {
          success: true,
          video: {
            videoUrl: videoData.videoUrl,
            thumbnailUrl,
            script: customScript,
            duration: videoData.duration
          }
        };
      } else {
        // Regenerate with new parameters using enhanced service
        const regenerateOptions: EnhancedVideoGenerationOptions = {
          duration: duration || jobData?.video?.duration || 'medium',
          style: style || jobData?.video?.style || 'professional',
          avatarStyle: avatarStyle || jobData?.video?.avatarStyle || 'realistic',
          background: background || jobData?.video?.background || 'office',
          includeSubtitles: true,
          includeNameCard: true,
          jobId,
          useAdvancedPrompts: true,
          optimizationLevel: 'advanced',
          allowFallback: true,
          urgency: 'normal',
          qualityLevel: 'standard'
        };
        
        const videoResult = await enhancedVideoGenerationService.generateVideoIntroduction(
          jobData!.parsedData,
          regenerateOptions,
          jobId,
          userId
        );

        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update({
            videoStatus: videoResult.status === 'completed' ? 'completed' : videoResult.status,
            video: {
              ...jobData?.video,
              url: videoResult.videoUrl,
              thumbnailUrl: videoResult.thumbnailUrl,
              duration: videoResult.duration,
              script: videoResult.script,
              subtitles: videoResult.subtitles,
              metadata: videoResult.metadata,
              provider: videoResult.providerId,
              generationMethod: videoResult.generationMethod,
              scriptQualityScore: videoResult.scriptQualityScore,
              regeneratedAt: FieldValue.serverTimestamp()
            },
            'enhancedFeatures.videoIntroduction.data': videoResult,
            'enhancedFeatures.videoIntroduction.provider': videoResult.providerId,
            updatedAt: FieldValue.serverTimestamp()
          });

        return {
          success: true,
          video: videoResult
        };
      }
    } catch (error: any) {
      
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          videoStatus: 'failed',
          videoError: error.message,
          updatedAt: FieldValue.serverTimestamp()
        });
      
      throw new Error(`Failed to regenerate video: ${error.message}`);
    }
  })
);

// Export additional function to check video generation status
export const getVideoStatus = onCall(
  {
    ...corsOptions
  },
  withPremiumAccess('videoIntroduction', async (request) => {

    const { jobId } = request.data;

    try {
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      
      return {
        status: jobData?.videoStatus || 'not-started',
        video: jobData?.video,
        error: jobData?.videoError
      };
    } catch (error: any) {
      throw new Error(`Failed to get video status: ${error.message}`);
    }
  })
);

// Enhanced video status check with real-time provider status
export const getEnhancedVideoStatus = onCall(
  {
    ...corsOptions
  },
  withPremiumAccess('videoIntroduction', async (request) => {

    const { jobId } = request.data;

    try {
      // Check enhanced video generation status
      const status = await enhancedVideoGenerationService.checkVideoStatus(jobId);
      
      // Also get job data from Firestore
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      const jobData = jobDoc.exists ? jobDoc.data() : null;
      
      return {
        providerId: status.providerId,
        status: status.status,
        progress: status.progress,
        videoUrl: status.videoUrl,
        thumbnailUrl: status.thumbnailUrl,
        duration: status.duration,
        error: status.error,
        lastUpdated: status.lastUpdated,
        // Include job data for context
        enhancedFeatures: jobData?.enhancedFeatures?.videoIntroduction
      };
    } catch (error: any) {
      
      // Fallback to regular status check
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      
      return {
        status: jobData?.videoStatus || 'not-started',
        video: jobData?.video,
        error: jobData?.videoError || error.message,
        fallback: true
      };
    }
  })
);