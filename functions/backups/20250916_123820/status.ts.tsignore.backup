// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import { getCVJob, subscribeToJobUpdates } from '../../models/cv-job.service';
import { getProcessedCV } from '../../models/processed-cv.service';
import { getGeneratedContentByCV } from '../../models/generated-content.service';
import { authenticateUser } from '../../middleware/auth.middleware';
import { JobStatus, ProcessingStage } from '../../../../shared/types/cv-job';

interface CVStatusResponse {
  success: boolean;
  jobId: string;
  status: JobStatus;
  currentStage: ProcessingStage;
  progress: number;
  statusMessage?: string;
  estimatedTimeRemaining?: number;
  processedCV?: {
    id: string;
    summary: string;
    atsScore?: number;
    personalityProfile?: any;
  };
  generatedContent?: Array<{
    id: string;
    contentType: string;
    status: string;
    fileUrl?: string;
    thumbnailUrl?: string;
  }>;
  error?: string;
  completedAt?: string;
  processingTime?: number;
}

export const getCVStatus = onRequest(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 200,
    cors: {
      origin: true,
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      console.log('CV status request received');

      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.status(200).send('');
        return;
      }

      // Only allow GET method
      if (req.method !== 'GET') {
        res.status(405).json({
          success: false,
          error: 'Method not allowed. Use GET.'
        });
        return;
      }

      // Authenticate user
      const authResult = await authenticateUser(req);
      if (!authResult.success || !authResult.userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const userId = authResult.userId;

      // Extract jobId from URL path
      const urlParts = req.path.split('/');
      const jobId = urlParts[urlParts.length - 1];

      if (!jobId || jobId.length < 10) {
        res.status(400).json({
          success: false,
          error: 'Valid jobId is required'
        } as CVStatusResponse);
        return;
      }

      console.log(`Getting CV status for job: ${jobId}, user: ${userId}`);

      // Get CV job data
      const cvJob = await getCVJob(jobId);

      if (!cvJob) {
        res.status(404).json({
          success: false,
          error: 'CV job not found'
        } as CVStatusResponse);
        return;
      }

      // Verify ownership
      if (cvJob.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied. You can only view your own CV jobs.'
        } as CVStatusResponse);
        return;
      }

      // Calculate progress percentage
      const progress = calculateProgress(cvJob.status, cvJob.currentStage);

      // Estimate remaining time
      const estimatedTimeRemaining = calculateRemainingTime(
        cvJob.status,
        cvJob.currentStage,
        cvJob.createdAt.toDate(),
        cvJob.features
      );

      // Base response
      const statusResponse: CVStatusResponse = {
        success: true,
        jobId: cvJob.id,
        status: cvJob.status,
        currentStage: cvJob.currentStage,
        progress,
        statusMessage: cvJob.statusMessage,
        estimatedTimeRemaining
      };

      // Add processing time if completed
      if (cvJob.completedAt) {
        statusResponse.completedAt = cvJob.completedAt.toDate().toISOString();
        statusResponse.processingTime = cvJob.completedAt.toDate().getTime() - cvJob.createdAt.toDate().getTime();
      }

      // Add error details if failed
      if (cvJob.status === JobStatus.FAILED && cvJob.errorMessage) {
        statusResponse.error = cvJob.errorMessage;
      }

      // If job is completed, get processed CV data
      if (cvJob.status === JobStatus.COMPLETED && cvJob.processedCVId) {
        try {
          const processedCV = await getProcessedCV(cvJob.processedCVId);
          if (processedCV) {
            statusResponse.processedCV = {
              id: processedCV.id,
              summary: processedCV.structuredData.summary || '',
              atsScore: processedCV.atsAnalysis?.score,
              personalityProfile: processedCV.aiAnalysis?.personalityProfile ? {
                type: processedCV.aiAnalysis.personalityProfile.mbtiType,
                summary: processedCV.aiAnalysis.personalityProfile.summary,
                traits: processedCV.aiAnalysis.personalityProfile.traits
              } : undefined
            };

            // Get generated content for this CV
            try {
              const generatedContent = await getGeneratedContentByCV(processedCV.id);
              statusResponse.generatedContent = generatedContent.map(content => ({
                id: content.id,
                contentType: content.contentType,
                status: content.status,
                fileUrl: content.fileUrl,
                thumbnailUrl: content.thumbnailUrl
              }));
            } catch (contentError) {
              console.warn(`Failed to get generated content for CV ${processedCV.id}:`, contentError);
              // Don't fail the entire request for this
            }
          }
        } catch (cvError) {
          console.warn(`Failed to get processed CV ${cvJob.processedCVId}:`, cvError);
          // Don't fail the entire request for this
        }
      }

      // Set appropriate cache headers based on job status
      if (cvJob.status === JobStatus.COMPLETED || cvJob.status === JobStatus.FAILED) {
        // Cache completed/failed jobs for longer
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
      } else {
        // Don't cache in-progress jobs
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      }

      res.status(200).json(statusResponse);

      console.log(`CV status retrieved successfully for job: ${jobId}`);

    } catch (error) {
      console.error('CV status error:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error while getting CV status'
      } as CVStatusResponse);
    }
  }
);

/**
 * Calculate progress percentage based on status and stage
 */
function calculateProgress(status: JobStatus, currentStage: ProcessingStage): number {
  if (status === JobStatus.COMPLETED) return 100;
  if (status === JobStatus.FAILED) return 0;

  const stageProgress = {
    [ProcessingStage.FILE_UPLOAD]: 5,
    [ProcessingStage.FILE_PARSING]: 15,
    [ProcessingStage.CONTENT_EXTRACTION]: 25,
    [ProcessingStage.AI_ANALYSIS]: 45,
    [ProcessingStage.ATS_OPTIMIZATION]: 65,
    [ProcessingStage.ENHANCEMENT]: 80,
    [ProcessingStage.QUALITY_CHECK]: 90,
    [ProcessingStage.FINALIZATION]: 95
  };

  return stageProgress[currentStage] || 0;
}

/**
 * Calculate estimated remaining time in seconds
 */
function calculateRemainingTime(
  status: JobStatus,
  currentStage: ProcessingStage,
  startTime: Date,
  features: any
): number | undefined {
  if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
    return 0;
  }

  const now = new Date();
  const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

  // Base time estimates for each stage (in seconds)
  const stageTimings = {
    [ProcessingStage.FILE_UPLOAD]: 5,
    [ProcessingStage.FILE_PARSING]: 8,
    [ProcessingStage.CONTENT_EXTRACTION]: 10,
    [ProcessingStage.AI_ANALYSIS]: 20,
    [ProcessingStage.ATS_OPTIMIZATION]: 15,
    [ProcessingStage.ENHANCEMENT]: 12,
    [ProcessingStage.QUALITY_CHECK]: 8,
    [ProcessingStage.FINALIZATION]: 5
  };

  // Adjust timing based on enabled features
  let multiplier = 1.0;
  if (features) {
    if (features.personalityAnalysis) multiplier += 0.3;
    if (features.atsOptimization) multiplier += 0.2;
    if (features.skillsEnhancement) multiplier += 0.2;
    if (features.industryOptimization) multiplier += 0.2;
  }

  // Get remaining stages
  const stageOrder = [
    ProcessingStage.FILE_UPLOAD,
    ProcessingStage.FILE_PARSING,
    ProcessingStage.CONTENT_EXTRACTION,
    ProcessingStage.AI_ANALYSIS,
    ProcessingStage.ATS_OPTIMIZATION,
    ProcessingStage.ENHANCEMENT,
    ProcessingStage.QUALITY_CHECK,
    ProcessingStage.FINALIZATION
  ];

  const currentIndex = stageOrder.indexOf(currentStage);
  if (currentIndex === -1) return undefined;

  // Calculate remaining time
  let remainingTime = 0;
  for (let i = currentIndex + 1; i < stageOrder.length; i++) {
    remainingTime += stageTimings[stageOrder[i]];
  }

  // Add remaining time for current stage (assume 50% complete)
  remainingTime += stageTimings[currentStage] * 0.5;

  // Apply feature multiplier
  remainingTime = Math.ceil(remainingTime * multiplier);

  // Add buffer for safety (20%)
  remainingTime = Math.ceil(remainingTime * 1.2);

  return Math.max(remainingTime, 5); // Minimum 5 seconds
}