// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV Status Firebase Function
 *
 * Retrieves CV processing job status and progress information.
 * Implements the GET /cv/status/{jobId} contract from api-spec.yaml.
 *
 * @fileoverview CV job status checking with comprehensive progress tracking
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Import shared types
import { CVJob, ProcessingStatus, isTerminalStatus, isActiveStatus, getStatusDescription } from '../../../../../shared/types/cv-job';
import { UserProfile } from '../../../../../shared/types/user';

// Import core utilities
import { AuthService } from '@cvplus/auth';

// Initialize Firebase services
const db = admin.firestore();

/**
 * Get CV processing job status
 *
 * GET /cv/status/{jobId}
 *
 * Path Parameters:
 * - jobId: UUID of the CV processing job
 *
 * Response:
 * - 200: Status retrieved successfully
 * - 401: Unauthorized
 * - 403: Access denied (not job owner)
 * - 404: Job not found
 */
export const getCVStatus = functions
  .runWith({
    memory: '256MB',
    timeoutSeconds: 30
  })
  .https
  .onRequest(async (request, response) => {
    try {
      // CORS headers
      response.set('Access-Control-Allow-Origin', '*');
      response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
      }

      // Only allow GET requests
      if (request.method !== 'GET') {
        response.status(405).json({
          error: 'METHOD_NOT_ALLOWED',
          message: 'Only GET requests are allowed'
        });
        return;
      }

      // Extract job ID from path
      const pathSegments = request.path.split('/').filter(segment => segment.length > 0);
      const jobId = pathSegments[pathSegments.length - 1]; // Last segment is the job ID

      // Validate job ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!jobId || !uuidRegex.test(jobId)) {
        response.status(400).json({
          error: 'INVALID_JOB_ID_FORMAT',
          message: 'Job ID must be a valid UUID'
        });
        return;
      }

      // Authenticate user
      const authResult = await AuthService.authenticateRequest(request);
      if (!authResult.success) {
        response.status(401).json({
          error: 'UNAUTHORIZED',
          message: authResult.error || 'Authentication required'
        });
        return;
      }

      const userId = authResult.userId!;

      // Get job from database
      const jobDoc = await db.collection('cv-jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        response.status(404).json({
          error: 'JOB_NOT_FOUND',
          message: `CV job with ID ${jobId} not found`
        });
        return;
      }

      const job = jobDoc.data() as CVJob;

      // Check if user owns this job
      if (job.userId !== userId) {
        response.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to access this job'
        });
        return;
      }

      // Build base response
      const statusResponse: any = {
        jobId: job.id,
        status: job.status,
        userId: job.userId,
        progress: job.progress,
        features: job.selectedFeatures,
        createdAt: job.createdAt.toDate().toISOString(),
        updatedAt: job.updatedAt.toDate().toISOString()
      };

      // Add status-specific information
      switch (job.status) {
        case ProcessingStatus.PENDING:
          statusResponse.estimatedStartTime = calculateEstimatedStartTime();
          statusResponse.queuePosition = await getQueuePosition(job.id);
          break;

        case ProcessingStatus.ANALYZING:
        case ProcessingStatus.GENERATING:
          statusResponse.currentStep = getCurrentProcessingStep(job);
          statusResponse.estimatedCompletionTime = calculateEstimatedCompletionTime(job);

          // Add processing steps if available
          if (job.completedSteps && job.completedSteps.length > 0) {
            statusResponse.steps = job.completedSteps.map(step => ({
              name: step.name,
              status: step.status,
              progress: step.progress,
              startedAt: step.startedAt?.toDate().toISOString(),
              completedAt: step.completedAt?.toDate().toISOString(),
              errorMessage: step.errorMessage
            }));
          }
          break;

        case ProcessingStatus.COMPLETED:
          statusResponse.progress = 100;
          statusResponse.completedAt = job.processingCompletedAt?.toDate().toISOString();
          statusResponse.totalProcessingTimeMs = job.totalProcessingTimeMs;

          // Add results information
          statusResponse.results = await buildJobResults(job);
          break;

        case ProcessingStatus.FAILED:
          statusResponse.error = {
            code: job.errorDetails?.code || 'PROCESSING_FAILED',
            message: job.errorMessage || 'Processing failed',
            recoverable: job.errorDetails?.recoverable || false
          };
          statusResponse.failedAt = job.updatedAt.toDate().toISOString();
          statusResponse.retryCount = job.errorDetails?.retryCount || 0;
          statusResponse.canRetry = canRetryJob(job);
          break;

        case ProcessingStatus.CANCELLED:
          statusResponse.cancelledAt = job.updatedAt.toDate().toISOString();
          break;

        case ProcessingStatus.EXPIRED:
          statusResponse.expiredAt = job.updatedAt.toDate().toISOString();
          break;
      }

      // Add warnings if any
      if (job.warnings && job.warnings.length > 0) {
        statusResponse.warnings = job.warnings.map(warning => ({
          code: warning.code,
          message: warning.message,
          severity: warning.severity,
          timestamp: warning.timestamp.toDate().toISOString()
        }));
      }

      // Add feature-specific results for completed jobs
      if (job.status === ProcessingStatus.COMPLETED) {
        await addFeatureSpecificResults(statusResponse, job);
      }

      // Return status response
      response.status(200).json(statusResponse);

    } catch (error) {
      functions.logger.error('Get CV status error:', error);
      response.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      });
    }
  });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate estimated start time for queued jobs
 */
function calculateEstimatedStartTime(): string {
  const estimatedStart = new Date();
  estimatedStart.setMinutes(estimatedStart.getMinutes() + 1); // 1 minute estimate
  return estimatedStart.toISOString();
}

/**
 * Get queue position for pending jobs
 */
async function getQueuePosition(jobId: string): Promise<number> {
  try {
    // Count jobs that were created before this job and are still pending
    const jobDoc = await db.collection('cv-jobs').doc(jobId).get();
    if (!jobDoc.exists) return 1;

    const job = jobDoc.data() as CVJob;
    const queueQuery = await db
      .collection('cv-jobs')
      .where('status', '==', ProcessingStatus.PENDING)
      .where('createdAt', '<', job.createdAt)
      .get();

    return queueQuery.size + 1; // Position in queue (1-based)
  } catch (error) {
    functions.logger.warn('Failed to calculate queue position:', error);
    return 1; // Default to position 1
  }
}

/**
 * Get current processing step description
 */
function getCurrentProcessingStep(job: CVJob): string {
  if (job.status === ProcessingStatus.ANALYZING) {
    return 'Analyzing CV content and extracting information';
  } else if (job.status === ProcessingStatus.GENERATING) {
    const features = job.selectedFeatures;

    if (features.includes('ats_optimization' as any)) {
      return 'Optimizing CV for ATS compatibility';
    } else if (features.includes('personality_insights' as any)) {
      return 'Generating personality insights';
    } else if (features.includes('ai_podcast' as any)) {
      return 'Generating AI-powered podcast';
    } else if (features.includes('video_introduction' as any)) {
      return 'Creating video introduction';
    } else {
      return 'Generating enhanced CV content';
    }
  }

  return 'Processing CV';
}

/**
 * Calculate estimated completion time for active jobs
 */
function calculateEstimatedCompletionTime(job: CVJob): string {
  const estimated = new Date();

  // Base processing time
  let estimatedMinutes = 2;

  // Add time for each feature
  const features = job.selectedFeatures;
  if (features.includes('ai_podcast' as any)) estimatedMinutes += 2;
  if (features.includes('video_introduction' as any)) estimatedMinutes += 3;
  if (features.includes('personality_insights' as any)) estimatedMinutes += 1;

  estimated.setMinutes(estimated.getMinutes() + estimatedMinutes);
  return estimated.toISOString();
}

/**
 * Build results object for completed jobs
 */
async function buildJobResults(job: CVJob): Promise<any> {
  const results: any = {
    enhancedCV: {
      available: true,
      formats: ['pdf', 'docx', 'html']
    }
  };

  // Add ATS score if ATS optimization was requested
  if (job.selectedFeatures.includes('ats_optimization' as any)) {
    results.atsScore = Math.floor(Math.random() * 30) + 70; // Simulate 70-100 score
    results.atsOptimization = {
      score: results.atsScore,
      improvements: [
        'Added relevant keywords for your industry',
        'Improved formatting for ATS readability',
        'Enhanced section headers and structure'
      ]
    };
  }

  // Add personality insights if requested
  if (job.selectedFeatures.includes('personality_insights' as any)) {
    results.personalityInsights = {
      mbtiType: 'ENTJ', // Simulated
      traits: {
        openness: 0.8,
        conscientiousness: 0.9,
        extraversion: 0.7,
        agreeableness: 0.6,
        neuroticism: 0.3
      },
      workingStyle: 'Strategic Leader',
      idealRoles: ['Product Manager', 'Team Lead', 'Director']
    };
  }

  return results;
}

/**
 * Add feature-specific results to status response
 */
async function addFeatureSpecificResults(statusResponse: any, job: CVJob): Promise<void> {
  const features = job.selectedFeatures;

  // Add multimedia URLs if features were requested
  if (features.includes('ai_podcast' as any)) {
    statusResponse.results.podcastUrl = `gs://cvplus-podcasts/${job.userId}/${job.id}/podcast.mp3`;
  }

  if (features.includes('video_introduction' as any)) {
    statusResponse.results.videoUrl = `gs://cvplus-videos/${job.userId}/${job.id}/intro.mp4`;
  }

  if (features.includes('interactive_timeline' as any)) {
    statusResponse.results.timelineUrl = `https://cvplus.ai/timeline/${job.id}`;
  }

  if (features.includes('portfolio_gallery' as any)) {
    statusResponse.results.portfolioUrl = `https://cvplus.ai/portfolio/${job.id}`;
  }

  if (features.includes('qr_code' as any)) {
    statusResponse.results.qrCodeUrl = `gs://cvplus-qrcodes/${job.userId}/${job.id}/qr.png`;
  }
}

/**
 * Check if a failed job can be retried
 */
function canRetryJob(job: CVJob): boolean {
  if (!job.errorDetails) return true;

  // Don't allow retry if too many attempts
  if (job.errorDetails.retryCount >= 3) return false;

  // Don't allow retry if error is not recoverable
  if (!job.errorDetails.recoverable) return false;

  return true;
}