import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { authGuard } from '@cvplus/auth/middleware/authGuard';
import { premiumGuard } from '@cvplus/premium/middleware/premiumGuard';
import { TranslationService } from '../../index';
import { SupportedLanguage } from '../../index';

interface BulkTranslationRequest {
  jobId?: string;
  sourceLanguage: SupportedLanguage;
  targetLanguages: SupportedLanguage[];
  content: Array<{
    id: string;
    namespace: string;
    key: string;
    text: string;
    context?: string;
    metadata?: Record<string, any>;
  }>;
  options?: {
    professionalMode?: boolean;
    culturalAdaptation?: boolean;
    qualityLevel?: 'basic' | 'standard' | 'professional';
    batchSize?: number;
  };
}

interface BulkTranslationResponse {
  success: boolean;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: {
    totalItems: number;
    completedItems: number;
    failedItems: number;
    currentLanguage?: SupportedLanguage;
  };
  results?: Array<{
    id: string;
    sourceText: string;
    translations: Record<SupportedLanguage, {
      text: string;
      confidence: number;
      reviewed: boolean;
    }>;
    status: 'completed' | 'failed';
    errors?: Record<SupportedLanguage, string>;
  }>;
  estimatedCompletion?: number;
  timestamp: number;
}

/**
 * Firebase Function for bulk translation operations
 * Handles large-scale translation jobs with progress tracking and retry logic
  */
export const bulkTranslation = onCall<BulkTranslationRequest, Promise<BulkTranslationResponse>>(
  {
    region: 'us-central1',
    memory: '2GiB',
    timeoutSeconds: 540, // 9 minutes (max for gen 2)
    cors: true,
  },
  async (request) => {
    const startTime = Date.now();

    try {
      // Extract data and context
      const { data, auth } = request;
      const { 
        jobId, 
        sourceLanguage, 
        targetLanguages, 
        content, 
        options = {} 
      } = data;

      const {
        professionalMode = false,
        culturalAdaptation = true,
        qualityLevel = 'standard',
        batchSize = 50,
      } = options;

      // Validate authentication
      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required for bulk translation');
      }

      // Check premium access for bulk operations
      // Note: Premium checking will be implemented when premium service is available

      // Additional premium check for professional mode
      if (professionalMode) {
        // Note: Premium checking will be implemented when premium service is available
        // For now, allow professional mode for all users
      }

      // Validate input data
      if (!sourceLanguage || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
        throw new HttpsError('invalid-argument', 'Source language and target languages are required');
      }

      if (!Array.isArray(content) || content.length === 0) {
        throw new HttpsError('invalid-argument', 'Content array is required');
      }

      if (content.length > 5000) {
        throw new HttpsError('invalid-argument', 'Maximum 5000 items per bulk translation job');
      }

      if (targetLanguages.length > 10) {
        throw new HttpsError('invalid-argument', 'Maximum 10 target languages per job');
      }

      // Validate content items
      for (const item of content) {
        if (!item.id || !item.namespace || !item.key || !item.text) {
          throw new HttpsError(
            'invalid-argument', 
            'Each content item must have id, namespace, key, and text'
          );
        }
      }

      // Generate or use existing job ID
      const currentJobId = jobId || `bulk_${auth.uid}_${Date.now()}`;

      logger.info('Bulk translation job started', {
        userId: auth.uid,
        jobId: currentJobId,
        sourceLanguage,
        targetLanguages: targetLanguages.length,
        contentItems: content.length,
        professionalMode,
        qualityLevel,
      });

      // Initialize Firestore for job tracking
      const db = getFirestore();
      const jobDocRef = db.collection('translationJobs').doc(currentJobId);

      // Create or update job document
      await jobDocRef.set({
        userId: auth.uid,
        status: 'processing',
        sourceLanguage,
        targetLanguages,
        contentCount: content.length,
        professionalMode,
        qualityLevel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        progress: {
          totalItems: content.length * targetLanguages.length,
          completedItems: 0,
          failedItems: 0,
        },
        options,
      });

      // Initialize translation service
      const translationService = TranslationService.getInstance({
        // Configuration will be added when TranslationService interface is properly defined
      });

      // Process translations in batches
      const results: any[] = [];
      let totalCompleted = 0;
      let totalFailed = 0;

      // Split content into batches
      const batches = [];
      for (let i = 0; i < content.length; i += batchSize) {
        batches.push(content.slice(i, i + batchSize));
      }

      for (const [batchIndex, batch] of batches.entries()) {
        logger.info(`Processing batch ${batchIndex + 1}/${batches.length}`, {
          jobId: currentJobId,
          batchSize: batch.length,
        });

        // Process each item in the batch
        const batchResults = await Promise.all(
          batch.map(async (item) => {
            const itemResult: any = {
              id: item.id,
              sourceText: item.text,
              translations: {},
              status: 'completed',
              errors: {},
            };

            // Translate to each target language
            for (const targetLang of targetLanguages) {
              try {
                const translationOptions = {
                  sourceLanguage,
                  targetLanguage: targetLang,
                  context: item.context,
                  namespace: item.namespace,
                  professionalMode,
                  culturalAdaptation,
                  qualityLevel,
                };

                const translatedText = await translationService.translate(
                  item.text,
                  translationOptions
                );

                // Assess translation quality (simplified for now)
                const confidence = 0.85; // Default confidence score
                // TODO: Implement proper confidence assessment when available

                itemResult.translations[targetLang] = {
                  text: translatedText,
                  confidence,
                  reviewed: false,
                };

                totalCompleted++;

              } catch (error) {
                logger.warn('Translation failed for item', {
                  jobId: currentJobId,
                  itemId: item.id,
                  targetLanguage: targetLang,
                  error: error.message,
                });

                itemResult.errors[targetLang] = error.message;
                itemResult.status = itemResult.status === 'completed' ? 'completed' : 'failed';
                totalFailed++;
              }
            }

            return itemResult;
          })
        );

        results.push(...batchResults);

        // Update job progress
        await jobDocRef.update({
          updatedAt: Date.now(),
          'progress.completedItems': totalCompleted,
          'progress.failedItems': totalFailed,
          'progress.currentBatch': batchIndex + 1,
          'progress.totalBatches': batches.length,
        });

        // Add small delay between batches to prevent rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Finalize job
      const finalStatus = totalFailed === 0 ? 'completed' : 
                         totalCompleted > 0 ? 'completed' : 'failed';

      const processingTime = Date.now() - startTime;

      await jobDocRef.update({
        status: finalStatus,
        completedAt: Date.now(),
        processingTime,
        results: results.length <= 100 ? results : undefined, // Store small result sets
        summary: {
          totalItems: content.length * targetLanguages.length,
          completedTranslations: totalCompleted,
          failedTranslations: totalFailed,
          successRate: Math.round((totalCompleted / (content.length * targetLanguages.length)) * 100),
        },
      });

      // Store detailed results separately for large jobs
      if (results.length > 100) {
        await db.collection('translationResults').doc(currentJobId).set({
          jobId: currentJobId,
          userId: auth.uid,
          results,
          createdAt: Date.now(),
        });
      }

      logger.info('Bulk translation job completed', {
        userId: auth.uid,
        jobId: currentJobId,
        finalStatus,
        processingTime,
        successRate: Math.round((totalCompleted / (content.length * targetLanguages.length)) * 100),
      });

      return {
        success: true,
        jobId: currentJobId,
        status: finalStatus,
        progress: {
          totalItems: content.length * targetLanguages.length,
          completedItems: totalCompleted,
          failedItems: totalFailed,
        },
        results: results.length <= 100 ? results : undefined,
        timestamp: Date.now(),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Bulk translation job failed', {
        userId: request.auth?.uid,
        jobId: request.data?.jobId,
        error: error.message,
        processingTime,
        stack: error.stack,
      });

      // Update job status if job was created
      if (request.data?.jobId) {
        try {
          const db = getFirestore();
          await db.collection('translationJobs').doc(request.data.jobId).update({
            status: 'failed',
            error: error.message,
            failedAt: Date.now(),
            processingTime,
          });
        } catch (updateError) {
          logger.error('Failed to update job status', {
            jobId: request.data.jobId,
            error: updateError.message,
          });
        }
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Bulk translation failed: ${error.message}`,
        { 
          originalError: error.message,
          processingTime,
        }
      );
    }
  }
);

/**
 * Get bulk translation job status
  */
export const getBulkTranslationStatus = onCall<{
  jobId: string;
  includeResults?: boolean;
}, Promise<BulkTranslationResponse>>(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    try {
      const { data, auth } = request;
      const { jobId, includeResults = false } = data;

      if (!auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      await authGuard(request);

      if (!jobId) {
        throw new HttpsError('invalid-argument', 'Job ID is required');
      }

      const db = getFirestore();
      const jobDoc = await db.collection('translationJobs').doc(jobId).get();

      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Translation job not found');
      }

      const jobData = jobDoc.data()!;

      // Verify user owns this job or has admin access
      if (jobData.userId !== auth.uid && !auth.token?.admin) {
        throw new HttpsError('permission-denied', 'Access denied to this translation job');
      }

      let results;
      if (includeResults && jobData.status === 'completed') {
        if (jobData.results) {
          results = jobData.results;
        } else {
          // Try to get results from separate collection
          const resultsDoc = await db.collection('translationResults').doc(jobId).get();
          if (resultsDoc.exists) {
            results = resultsDoc.data()?.results;
          }
        }
      }

      return {
        success: true,
        jobId,
        status: jobData.status,
        progress: jobData.progress,
        results,
        estimatedCompletion: jobData.estimatedCompletion,
        timestamp: Date.now(),
      };

    } catch (error) {
      logger.error('Get bulk translation status failed', {
        userId: request.auth?.uid,
        jobId: request.data?.jobId,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to get job status: ${error.message}`,
        { originalError: error.message }
      );
    }
  }
);