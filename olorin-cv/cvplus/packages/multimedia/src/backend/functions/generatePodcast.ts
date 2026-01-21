import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { withPremiumAccess } from '../middleware/simplePremiumGuard';
import { podcastGenerationService } from '../services/podcast-generation.service';
// htmlFragmentGenerator import removed - using React SPA architecture
import { sanitizeForFirestore, sanitizeErrorContext } from '../utils/firestore-sanitizer';

export const generatePodcast = onCall(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    secrets: ['ELEVENLABS_API_KEY', 'ELEVENLABS_HOST1_VOICE_ID', 'ELEVENLABS_HOST2_VOICE_ID', 'OPENAI_API_KEY'],
    ...corsOptions
  },
  withPremiumAccess('podcast', async (request) => {
    const startTime = Date.now();
    logger.info('🎙️ generatePodcast function called with enhanced auth', {
      uid: request.auth.uid,
      email: request.auth.token.email,
      data: request.data,
      timestamp: new Date().toISOString()
    });

    const { 
      jobId, 
      style = 'casual',
      duration = 'medium',
      focus = 'balanced' 
    } = request.data;


    if (!jobId) {
      throw new Error('Job ID is required');
    }

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
      
      // Verify job ownership
      if (jobData?.userId !== request.auth.uid) {
        logger.error('❌ Job ownership verification failed', {
          jobId,
          requestUid: request.auth.uid,
          jobUserId: jobData?.userId
        });
        throw new Error('Access denied: Job belongs to different user');
      }
      
      if (!jobData?.parsedData) {
        throw new Error('CV data not found. Please ensure CV is parsed first.');
      }
      

      // Update status to processing
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.generatePodcast.status': 'processing',
          'enhancedFeatures.generatePodcast.progress': 25,
          'enhancedFeatures.generatePodcast.currentStep': 'Creating podcast script...',
          'enhancedFeatures.generatePodcast.startedAt': FieldValue.serverTimestamp(),
          podcastStatus: 'generating',
          updatedAt: FieldValue.serverTimestamp()
        });

      // Generate conversational podcast
      const podcastResult = await podcastGenerationService.generatePodcast(
        jobData.parsedData,
        jobId,
        request.auth.uid,
        {
          style,
          duration,
          focus
        }
      );

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.generatePodcast.progress': 75,
          'enhancedFeatures.generatePodcast.currentStep': 'Finalizing podcast audio...'
        });

      // Generate HTML fragment for progressive enhancement
      // HTML generation removed - React SPA handles UI rendering;

      // Sanitize podcast result data before Firestore write
      const sanitizedPodcastData = sanitizeForFirestore(podcastResult);
      const sanitizedHtmlFragment = null; // HTML fragment removed with React SPA migration
      
      // Create safe update object
      const updateData = sanitizeForFirestore({
        'enhancedFeatures.generatePodcast.status': 'completed',
        'enhancedFeatures.generatePodcast.progress': 100,
        'enhancedFeatures.generatePodcast.data': sanitizedPodcastData,
        'enhancedFeatures.generatePodcast.htmlFragment': sanitizedHtmlFragment,
        'enhancedFeatures.generatePodcast.processedAt': FieldValue.serverTimestamp(),
        podcastStatus: 'completed',
        podcast: sanitizeForFirestore({
          url: podcastResult.audioUrl,
          transcript: podcastResult.transcript,
          duration: podcastResult.duration,
          chapters: podcastResult.chapters,
          generatedAt: FieldValue.serverTimestamp()
        }),
        'enhancedFeatures.podcast': sanitizeForFirestore({
          enabled: true,
          status: 'completed',
          data: {
            url: podcastResult.audioUrl,
            duration: podcastResult.duration
          }
        }),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update job with podcast completion
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(updateData);

      return {
        success: true,
        podcastUrl: podcastResult.audioUrl,
        transcript: podcastResult.transcript,
        duration: podcastResult.duration,
        chapters: podcastResult.chapters,
        htmlFragment: sanitizedHtmlFragment
      };
    } catch (error: any) {
      
      // Sanitize error data for safe Firestore write
      const sanitizedErrorContext = sanitizeErrorContext({
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      });
      
      // Create safe error update object
      const errorUpdateData = sanitizeForFirestore({
        'enhancedFeatures.generatePodcast.status': 'failed',
        'enhancedFeatures.generatePodcast.error': error.message || 'Unknown error',
        'enhancedFeatures.generatePodcast.errorContext': sanitizedErrorContext,
        'enhancedFeatures.generatePodcast.processedAt': FieldValue.serverTimestamp(),
        podcastStatus: 'failed',
        podcastError: error.message || 'Unknown error',
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Update status to failed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(errorUpdateData);
      
      throw new Error(`Failed to generate podcast: ${error.message}`);
    }
  })
);