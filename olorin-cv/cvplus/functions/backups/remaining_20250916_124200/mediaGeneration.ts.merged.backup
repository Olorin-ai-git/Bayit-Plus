// @ts-ignore - Export conflicts/**
 * Cloud Functions for Media Generation
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { mediaGenerationService } from '../services/media-generation.service';
import { EnhancedJob } from '../types/enhanced-models';
import { corsOptions } from '../config/cors';

/**
 * Generate video introduction script
 */
export const generateVideoIntro = onCall(
  { 
    timeoutSeconds: 120,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, settings } = data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      // Generate video intro script
      const videoData = await mediaGenerationService.generateVideoIntroScript(
        job.parsedData!,
        settings?.duration || 60,
        settings?.style || 'professional'
      );

      // Update job with video intro data
      await jobDoc.ref.update({
        'enhancedFeatures.videoIntroduction': {
          enabled: true,
          data: videoData,
          status: 'completed',
          processedAt: new Date()
        }
      });

      return {
        success: true,
        videoData
      };
    } catch (error: any) {
      
      // Update job with error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.videoIntroduction.status': 'failed',
        'enhancedFeatures.videoIntroduction.error': error.message
      });
      
      throw new HttpsError('internal', 'Failed to generate video introduction');
    }
  }
);


/**
 * Convert text to audio
 */
export const generateAudioFromText = onCall(
  { 
    timeoutSeconds: 240,
    memory: '1GiB',
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, text, mediaType } = data;
    if (!jobId || !text) {
      throw new HttpsError('invalid-argument', 'Job ID and text are required');
    }

    try {
      // For now, return a mock audio URL
      // In production, integrate with Google Cloud Text-to-Speech or similar
      const audioUrl = `https://storage.googleapis.com/${process.env.STORAGE_BUCKET}/audio/${jobId}/${mediaType || 'podcast'}.mp3`;

      // Update the appropriate feature with audio URL
      const updatePath = mediaType === 'video' 
        ? 'enhancedFeatures.videoIntroduction.data.audioUrl'
        : 'enhancedFeatures.careerPodcast.data.audioUrl';

      await admin.firestore().collection('jobs').doc(jobId).update({
        [updatePath]: audioUrl
      });

      return {
        success: true,
        audioUrl
      };
    } catch (error) {
      throw new HttpsError('internal', 'Failed to generate audio');
    }
  }
);

/**
 * Regenerate media with different settings
 */
export const regenerateMedia = onCall(
  { 
    timeoutSeconds: 180,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, mediaType, settings } = data;
    if (!jobId || !mediaType) {
      throw new HttpsError('invalid-argument', 'Job ID and media type are required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      let result;
      if (mediaType === 'video') {
        result = await mediaGenerationService.generateVideoIntroScript(
          job.parsedData!,
          settings?.duration || 60,
          settings?.style || 'professional'
        );
      } else if (mediaType === 'podcast') {
        result = await mediaGenerationService.generatePodcastScript(
          job.parsedData!,
          settings?.format || 'interview',
          settings?.duration || 300
        );
      } else {
        throw new HttpsError('invalid-argument', 'Invalid media type');
      }

      // Update job with regenerated data
      const featurePath = mediaType === 'video' ? 'videoIntroduction' : 'careerPodcast';
      await jobDoc.ref.update({
        [`enhancedFeatures.${featurePath}.data`]: result,
        [`enhancedFeatures.${featurePath}.regeneratedAt`]: new Date()
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      throw new HttpsError('internal', 'Failed to regenerate media');
    }
  }
);

/**
 * Get media generation status
 */
export const getMediaStatus = onCall(
  { 
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = data;
    if (!jobId) {
      throw new HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      const videoStatus = job.enhancedFeatures?.videoIntroduction?.status || 'pending';
      const podcastStatus = job.enhancedFeatures?.careerPodcast?.status || 'pending';

      return {
        success: true,
        status: {
          video: {
            status: videoStatus,
            hasAudio: !!job.enhancedFeatures?.videoIntroduction?.data?.audioUrl,
            error: job.enhancedFeatures?.videoIntroduction?.error
          },
          podcast: {
            status: podcastStatus,
            hasAudio: !!job.enhancedFeatures?.careerPodcast?.data?.audioUrl,
            error: job.enhancedFeatures?.careerPodcast?.error
          }
        }
      };
    } catch (error) {
      throw new HttpsError('internal', 'Failed to get media status');
    }
  }
);

/**
 * Download media content
 */
export const downloadMediaContent = onCall(
  { 
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    const { data, auth } = request;
    
    // Check authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId, mediaType } = data;
    if (!jobId || !mediaType) {
      throw new HttpsError('invalid-argument', 'Job ID and media type are required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== auth.uid) {
        throw new HttpsError('permission-denied', 'Unauthorized access to job');
      }

      const featurePath = mediaType === 'video' ? 'videoIntroduction' : 'careerPodcast';
      const mediaData = job.enhancedFeatures?.[featurePath]?.data;

      if (!mediaData) {
        throw new HttpsError('not-found', 'Media content not found');
      }

      return {
        success: true,
        content: {
          script: mediaData.script,
          audioUrl: mediaData.audioUrl,
          duration: mediaData.duration,
          metadata: mediaData.metadata
        }
      };
    } catch (error) {
      throw new HttpsError('internal', 'Failed to download media content');
    }
  }
);