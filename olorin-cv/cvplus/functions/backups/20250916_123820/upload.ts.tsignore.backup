// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { CVProcessorService } from '../../services/cv-processor.service';
import { createCVJob } from '../../models/cv-job.service';
import { getUserProfile } from '../../models/user-profile.service';
import { JobStatus, ProcessingStage, CVProcessingFeatures } from '../../../../shared/types/cv-job';
import { validateMultipartUpload, parseMultipartForm } from '../../utils/multipart.utils';
import { validateFileType, validateFileSize } from '../../utils/file-validation.utils';
import { authenticateUser } from '../../middleware/auth.middleware';

const cvProcessor = new CVProcessorService();

interface CVUploadRequest {
  userId: string;
  features: CVProcessingFeatures;
  targetRole?: string;
  targetCompany?: string;
}

interface CVUploadResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  estimatedProcessingTime?: number;
  supportedFormats?: string[];
}

export const uploadCV = onRequest(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    maxInstances: 100,
    cors: {
      origin: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      console.log('CV upload request received');

      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.status(200).send('');
        return;
      }

      // Only allow POST method
      if (req.method !== 'POST') {
        res.status(405).json({
          success: false,
          message: 'Method not allowed. Use POST.'
        } as CVUploadResponse);
        return;
      }

      // Validate Content-Type for multipart upload
      if (!req.headers['content-type']?.includes('multipart/form-data')) {
        res.status(400).json({
          success: false,
          message: 'Content-Type must be multipart/form-data',
          supportedFormats: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
        } as CVUploadResponse);
        return;
      }

      // Authenticate user
      const authResult = await authenticateUser(req);
      if (!authResult.success || !authResult.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        } as CVUploadResponse);
        return;
      }

      const userId = authResult.userId;
      console.log(`CV upload for authenticated user: ${userId}`);

      // Parse multipart form data
      const formData = await parseMultipartForm(req);

      if (!formData.file) {
        res.status(400).json({
          success: false,
          message: 'CV file is required',
          supportedFormats: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
        } as CVUploadResponse);
        return;
      }

      // Validate file
      const fileValidation = validateFileType(formData.file.mimetype, formData.file.originalname);
      if (!fileValidation.isValid) {
        res.status(400).json({
          success: false,
          message: fileValidation.message,
          supportedFormats: fileValidation.supportedFormats
        } as CVUploadResponse);
        return;
      }

      const sizeValidation = validateFileSize(formData.file.size);
      if (!sizeValidation.isValid) {
        res.status(400).json({
          success: false,
          message: sizeValidation.message
        } as CVUploadResponse);
        return;
      }

      // Parse request data
      const requestData: CVUploadRequest = {
        userId,
        features: JSON.parse(formData.fields.features || '{}'),
        targetRole: formData.fields.targetRole,
        targetCompany: formData.fields.targetCompany
      };

      console.log('Request features:', requestData.features);

      // Get user profile to check credits and subscription
      const userProfile = await getUserProfile(userId);

      // Estimate processing cost
      const estimatedCost = calculateProcessingCost(requestData.features);

      // Check if user has sufficient credits
      if (userProfile.credits < estimatedCost) {
        res.status(402).json({
          success: false,
          message: `Insufficient credits. Required: ${estimatedCost}, Available: ${userProfile.credits}`
        } as CVUploadResponse);
        return;
      }

      // Check subscription limits
      const subscriptionLimits = getSubscriptionLimits(userProfile.subscriptionTier);
      const activeFeaturesCount = Object.values(requestData.features).filter(Boolean).length;

      if (activeFeaturesCount > subscriptionLimits.maxFeatures) {
        res.status(403).json({
          success: false,
          message: `Feature limit exceeded. Your ${userProfile.subscriptionTier} plan allows ${subscriptionLimits.maxFeatures} features, you requested ${activeFeaturesCount}.`
        } as CVUploadResponse);
        return;
      }

      // Upload file to Firebase Storage
      const storage = admin.storage();
      const bucket = storage.bucket();
      const fileName = `cvs/${userId}/${Date.now()}-${formData.file.originalname}`;
      const file = bucket.file(fileName);

      console.log(`Uploading file to: ${fileName}`);

      await file.save(formData.file.buffer, {
        metadata: {
          contentType: formData.file.mimetype,
          metadata: {
            originalName: formData.file.originalname,
            uploadedBy: userId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      const fileUrl = `gs://${bucket.name}/${fileName}`;
      console.log(`File uploaded successfully: ${fileUrl}`);

      // Create CV processing job
      const jobData = {
        userId,
        fileName: formData.file.originalname,
        fileUrl,
        fileSizeBytes: formData.file.size,
        features: requestData.features,
        targetRole: requestData.targetRole,
        targetCompany: requestData.targetCompany,
        status: JobStatus.PENDING,
        currentStage: ProcessingStage.FILE_UPLOAD,
        estimatedCost,
        priority: getUserPriority(userProfile.subscriptionTier)
      };

      const cvJob = await createCVJob(jobData);
      console.log(`CV job created: ${cvJob.id}`);

      // Start async processing (don't await to return immediately)
      processCVAsync(cvJob.id, fileUrl, requestData)
        .catch(error => {
          console.error(`Async CV processing failed for job ${cvJob.id}:`, error);
        });

      // Calculate estimated processing time
      const estimatedProcessingTime = calculateEstimatedTime(requestData.features);

      // Return success response
      res.status(200).json({
        success: true,
        jobId: cvJob.id,
        message: 'CV upload successful. Processing started.',
        estimatedProcessingTime
      } as CVUploadResponse);

      console.log(`CV upload completed successfully for job: ${cvJob.id}`);

    } catch (error) {
      console.error('CV upload error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error during CV upload'
      } as CVUploadResponse);
    }
  }
);

/**
 * Process CV asynchronously
 */
async function processCVAsync(
  jobId: string,
  fileUrl: string,
  requestData: CVUploadRequest
): Promise<void> {
  try {
    console.log(`Starting async CV processing for job: ${jobId}`);

    await cvProcessor.processCV({
      jobId,
      userId: requestData.userId,
      fileUrl,
      features: requestData.features,
      targetRole: requestData.targetRole,
      targetCompany: requestData.targetCompany
    });

    console.log(`CV processing completed successfully for job: ${jobId}`);

  } catch (error) {
    console.error(`CV processing failed for job ${jobId}:`, error);

    // The CV processor should handle job status updates on failure
    // This is just additional logging
  }
}

/**
 * Calculate processing cost based on features
 */
function calculateProcessingCost(features: CVProcessingFeatures): number {
  let cost = 1.0; // Base cost for basic processing

  if (features.atsOptimization) cost += 0.5;
  if (features.personalityAnalysis) cost += 0.3;
  if (features.skillsEnhancement) cost += 0.2;
  if (features.achievementHighlighting) cost += 0.2;
  if (features.industryOptimization) cost += 0.3;
  if (features.formatOptimization) cost += 0.2;

  return Math.round(cost * 100) / 100; // Round to 2 decimal places
}

/**
 * Get subscription limits
 */
function getSubscriptionLimits(tier: string) {
  const limits = {
    free: { maxFeatures: 2, maxUploadsPerMonth: 3 },
    basic: { maxFeatures: 4, maxUploadsPerMonth: 10 },
    premium: { maxFeatures: 8, maxUploadsPerMonth: 50 },
    enterprise: { maxFeatures: 999, maxUploadsPerMonth: 999 }
  };

  return limits[tier as keyof typeof limits] || limits.free;
}

/**
 * Get user priority based on subscription
 */
function getUserPriority(tier: string): number {
  const priorities = {
    enterprise: 1,
    premium: 2,
    basic: 3,
    free: 4
  };

  return priorities[tier as keyof typeof priorities] || 4;
}

/**
 * Calculate estimated processing time based on features
 */
function calculateEstimatedTime(features: CVProcessingFeatures): number {
  let baseTime = 15; // 15 seconds base time

  if (features.atsOptimization) baseTime += 10;
  if (features.personalityAnalysis) baseTime += 15;
  if (features.skillsEnhancement) baseTime += 8;
  if (features.achievementHighlighting) baseTime += 5;
  if (features.industryOptimization) baseTime += 12;
  if (features.formatOptimization) baseTime += 5;

  return baseTime;
}