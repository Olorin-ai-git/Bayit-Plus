// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { CVInitiationRequest, CVInitiationResponse } from '../../types';

// Import the core CV generation logic for background processing
import { generateCVCore } from './generateCV';

export const initiateCVGeneration = onCall(
  {
    timeoutSeconds: 90, // Increased to handle recovery logic
    memory: '1GiB',
    ...corsOptions
  },
  async (request) => {
    
    // Step 1: Quick validation and authentication
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, templateId, features } = request.data;
    const userId = request.auth.uid;
    

    try {
      // Step 2: Validate job existence and ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      
      // Verify user ownership
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      // Ensure parsed data exists
      if (!jobData?.parsedData) {
        throw new Error('No parsed CV data found');
      }

      // Step 3: Initialize job with 'processing' status and feature tracking
      const selectedFeatures = features || [];
      const enhancedFeatures = initializeFeatureTracking(selectedFeatures);
      const estimatedTime = calculateEstimatedTime(selectedFeatures);
      
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'generating',
          selectedTemplate: templateId,
          selectedFeatures: selectedFeatures,
          enhancedFeatures: enhancedFeatures,
          generationStartedAt: FieldValue.serverTimestamp(),
          estimatedCompletionTime: new Date(Date.now() + estimatedTime * 1000),
          updatedAt: FieldValue.serverTimestamp()
        });

      // Step 4: Trigger background generateCV processing with comprehensive error recovery
      setImmediate(async () => {
        try {
          
          // Add global timeout protection for the entire generation process
          const result = await Promise.race([
            generateCVCore(jobId, templateId, features, request.auth?.uid || ''),
            new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('CV generation timed out after 12 minutes')), 720000);
            })
          ]);
          
        } catch (error) {
          
          // Comprehensive error recovery
          await handleCVGenerationFailure(jobId, error, features || []);
        }
      });

      // Step 5: Return immediately with job status
      return {
        success: true,
        jobId: jobId,
        status: 'initiated',
        selectedFeatures: selectedFeatures,
        estimatedTime: estimatedTime,
        message: `CV generation started with ${selectedFeatures.length} features. Estimated completion in ${Math.ceil(estimatedTime / 60)} minutes.`
      };

    } catch (error: any) {
      
      // Update job status to failed if possible
      try {
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update({
            status: 'failed',
            error: error.message,
            updatedAt: FieldValue.serverTimestamp()
          });
      } catch (updateError: any) {
      }
      
      throw new Error(`Failed to initiate CV generation: ${error.message}`);
    }
  });

/**
 * Initialize feature tracking structure with all selected features set to 'pending' status
 */
function initializeFeatureTracking(selectedFeatures: string[]): Record<string, any> {
  const enhancedFeatures: Record<string, any> = {};
  
  for (const feature of selectedFeatures) {
    enhancedFeatures[feature] = {
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for processing',
      enabled: true,
      queuedAt: new Date(),
      estimatedTimeRemaining: getFeatureEstimatedTime(feature)
    };
  }
  
  return enhancedFeatures;
}

/**
 * Calculate total estimated time based on number and type of features
 */
function calculateEstimatedTime(features: string[]): number {
  if (!features || features.length === 0) {
    return 60; // Base CV generation: 1 minute
  }

  let totalTime = 60; // Base CV generation time
  
  for (const feature of features) {
    totalTime += getFeatureEstimatedTime(feature);
  }
  
  // Add buffer time for coordination between features (10% overhead)
  totalTime = Math.ceil(totalTime * 1.1);
  
  return totalTime;
}

/**
 * Get estimated processing time for individual features (in seconds)
 */
function getFeatureEstimatedTime(feature: string): number {
  const featureTimings: Record<string, number> = {
    // Fast features (30-60 seconds)
    'skills-visualization': 45,
    'language-proficiency': 30,
    'social-media-links': 20,
    'embed-qr-code': 25,
    'privacy-mode': 15,
    
    // Medium features (1-2 minutes)
    'ats-optimization': 90,
    'achievement-highlighting': 75,
    'certification-badges': 60,
    'interactive-timeline': 90,
    
    // Complex features (2-4 minutes)
    'generate-podcast': 180,
    'video-introduction': 150,
    'portfolio-gallery': 120,
    'availability-calendar': 90,
    'testimonials-carousel': 105,
    
    // Advanced features (3-5 minutes)
    'personality-insights': 200,
    'industry-optimization': 180,
    'regional-optimization': 150
  };
  
  return featureTimings[feature] || 60; // Default to 1 minute for unknown features
}

/**
 * Comprehensive error recovery for CV generation failures
 */
async function handleCVGenerationFailure(jobId: string, error: any, features: string[]): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const isTimeout = errorMessage.includes('timed out') || errorMessage.includes('timeout');
  const isNetworkError = errorMessage.includes('network') || errorMessage.includes('ECONNRESET');
  const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('limit');
  
  
  try {
    // Update job with failure details and recovery information
    const updateData: any = {
      status: 'failed',
      error: errorMessage,
      failureTimestamp: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      recoveryInfo: {
        isTimeout,
        isNetworkError,
        isQuotaError,
        retryable: isTimeout || isNetworkError || isQuotaError,
        recommendedRetryDelay: getRetryDelay(errorMessage),
        maxRetries: 3
      }
    };
    
    // Mark all selected features as failed if they weren't processed
    const enhancedFeatures: Record<string, any> = {};
    for (const feature of features) {
      enhancedFeatures[feature] = {
        status: 'failed',
        error: `CV generation failed: ${errorMessage}`,
        failureTimestamp: FieldValue.serverTimestamp(),
        retryable: isTimeout || isNetworkError
      };
    }
    updateData.enhancedFeatures = enhancedFeatures;
    
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update(updateData);
      
    
  } catch (updateError) {
    
    // Last resort: try to at least mark the job as failed
    try {
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          status: 'failed',
          error: errorMessage,
          updatedAt: FieldValue.serverTimestamp()
        });
    } catch (lastResortError) {
    }
  }
}

/**
 * Get recommended retry delay based on error type
 */
function getRetryDelay(errorMessage: string): number {
  const lowerError = errorMessage.toLowerCase();
  
  if (lowerError.includes('quota') || lowerError.includes('limit')) {
    return 900; // 15 minutes for quota errors
  }
  
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return 300; // 5 minutes for timeout errors
  }
  
  if (lowerError.includes('network') || lowerError.includes('connection')) {
    return 120; // 2 minutes for network errors
  }
  
  return 180; // 3 minutes default
}

/**
 * Type definitions for this function
 */
export type { CVInitiationRequest, CVInitiationResponse };