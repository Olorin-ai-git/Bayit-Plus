// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { CVProcessorService } from '../../services/cv-processor.service';
import { createCVJob } from '../../models/cv-job.service';
import { getUserProfile } from '../../models/user-profile.service';
import { JobStatus, ProcessingStage, CVProcessingFeatures } from '../../../../shared/types/cv-job';
import { validateFileType, validateFileSize } from '../../utils/file-validation.utils';
import { authenticateUser } from '../../middleware/auth.middleware';

const cvProcessor = new CVProcessorService();

interface CVUrlUploadRequest {
  fileUrl: string;
  features: CVProcessingFeatures;
  targetRole?: string;
  targetCompany?: string;
}

interface CVUrlUploadResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  estimatedProcessingTime?: number;
  fileInfo?: {
    originalUrl: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  };
}

export const uploadCVFromUrl = onRequest(
  {
    timeoutSeconds: 540,
    memory: '2GiB',
    maxInstances: 50,
    cors: {
      origin: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      console.log('CV URL upload request received');

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
        } as CVUrlUploadResponse);
        return;
      }

      // Validate Content-Type
      if (!req.headers['content-type']?.includes('application/json')) {
        res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json'
        } as CVUrlUploadResponse);
        return;
      }

      // Authenticate user
      const authResult = await authenticateUser(req);
      if (!authResult.success || !authResult.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        } as CVUrlUploadResponse);
        return;
      }

      const userId = authResult.userId;
      console.log(`CV URL upload for authenticated user: ${userId}`);

      // Parse request body
      const requestData: CVUrlUploadRequest = req.body;

      if (!requestData.fileUrl) {
        res.status(400).json({
          success: false,
          message: 'File URL is required'
        } as CVUrlUploadResponse);
        return;
      }

      // Validate URL format
      if (!isValidUrl(requestData.fileUrl)) {
        res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        } as CVUrlUploadResponse);
        return;
      }

      // Check if URL is from allowed domains
      if (!isAllowedDomain(requestData.fileUrl)) {
        res.status(400).json({
          success: false,
          message: 'URL domain not allowed. Please use trusted file sharing services.'
        } as CVUrlUploadResponse);
        return;
      }

      console.log(`Downloading file from URL: ${requestData.fileUrl}`);

      // Download file from URL
      const downloadResult = await downloadFileFromUrl(requestData.fileUrl);

      if (!downloadResult.success) {
        res.status(400).json({
          success: false,
          message: downloadResult.error || 'Failed to download file from URL'
        } as CVUrlUploadResponse);
        return;
      }

      const { buffer, contentType, fileName, fileSize } = downloadResult;

      // Validate downloaded file
      const fileValidation = validateFileType(contentType, fileName);
      if (!fileValidation.isValid) {
        res.status(400).json({
          success: false,
          message: fileValidation.message
        } as CVUrlUploadResponse);
        return;
      }

      const sizeValidation = validateFileSize(fileSize);
      if (!sizeValidation.isValid) {
        res.status(400).json({
          success: false,
          message: sizeValidation.message
        } as CVUrlUploadResponse);
        return;
      }

      // Get user profile to check credits and subscription
      const userProfile = await getUserProfile(userId);

      // Estimate processing cost
      const estimatedCost = calculateProcessingCost(requestData.features);

      // Check if user has sufficient credits
      if (userProfile.credits < estimatedCost) {
        res.status(402).json({
          success: false,
          message: `Insufficient credits. Required: ${estimatedCost}, Available: ${userProfile.credits}`
        } as CVUrlUploadResponse);
        return;
      }

      // Check subscription limits
      const subscriptionLimits = getSubscriptionLimits(userProfile.subscriptionTier);
      const activeFeaturesCount = Object.values(requestData.features).filter(Boolean).length;

      if (activeFeaturesCount > subscriptionLimits.maxFeatures) {
        res.status(403).json({
          success: false,
          message: `Feature limit exceeded. Your ${userProfile.subscriptionTier} plan allows ${subscriptionLimits.maxFeatures} features, you requested ${activeFeaturesCount}.`
        } as CVUrlUploadResponse);
        return;
      }

      // Upload file to Firebase Storage
      const storage = admin.storage();
      const bucket = storage.bucket();
      const storageFileName = `cvs/${userId}/${Date.now()}-${fileName}`;
      const file = bucket.file(storageFileName);

      console.log(`Uploading file to storage: ${storageFileName}`);

      await file.save(buffer, {
        metadata: {
          contentType: contentType,
          metadata: {
            originalName: fileName,
            originalUrl: requestData.fileUrl,
            uploadedBy: userId,
            uploadedAt: new Date().toISOString(),
            source: 'url_upload'
          }
        }
      });

      const fileUrl = `gs://${bucket.name}/${storageFileName}`;
      console.log(`File uploaded successfully: ${fileUrl}`);

      // Create CV processing job
      const jobData = {
        userId,
        fileName,
        fileUrl,
        fileSizeBytes: fileSize,
        features: requestData.features,
        targetRole: requestData.targetRole,
        targetCompany: requestData.targetCompany,
        status: JobStatus.PENDING,
        currentStage: ProcessingStage.FILE_UPLOAD,
        estimatedCost,
        priority: getUserPriority(userProfile.subscriptionTier),
        metadata: {
          originalUrl: requestData.fileUrl,
          source: 'url_upload'
        }
      };

      const cvJob = await createCVJob(jobData);
      console.log(`CV job created: ${cvJob.id}`);

      // Start async processing (don't await to return immediately)
      processCVAsync(cvJob.id, fileUrl, { userId, ...requestData })
        .catch(error => {
          console.error(`Async CV processing failed for job ${cvJob.id}:`, error);
        });

      // Calculate estimated processing time
      const estimatedProcessingTime = calculateEstimatedTime(requestData.features);

      // Return success response
      res.status(200).json({
        success: true,
        jobId: cvJob.id,
        message: 'CV downloaded and processing started.',
        estimatedProcessingTime,
        fileInfo: {
          originalUrl: requestData.fileUrl,
          fileName,
          fileSize,
          contentType
        }
      } as CVUrlUploadResponse);

      console.log(`CV URL upload completed successfully for job: ${cvJob.id}`);

    } catch (error) {
      console.error('CV URL upload error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error during CV URL upload'
      } as CVUrlUploadResponse);
    }
  }
);

/**
 * Download file from URL with validation and error handling
 */
async function downloadFileFromUrl(url: string): Promise<{
  success: boolean;
  buffer?: Buffer;
  contentType?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      maxContentLength: 10 * 1024 * 1024, // 10MB limit
      timeout: 30000, // 30 seconds timeout
      headers: {
        'User-Agent': 'CVPlus-Bot/1.0'
      }
    });

    if (response.status !== 200) {
      return {
        success: false,
        error: `HTTP ${response.status}: Unable to download file`
      };
    }

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'application/octet-stream';

    // Extract filename from URL or Content-Disposition header
    let fileName = extractFileNameFromUrl(url);
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (fileNameMatch) {
        fileName = fileNameMatch[1].replace(/['"]/g, '');
      }
    }

    return {
      success: true,
      buffer,
      contentType,
      fileName,
      fileSize: buffer.length
    };

  } catch (error) {
    console.error('File download error:', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Download timeout. Please ensure the file is accessible.'
        };
      } else if (error.response?.status === 404) {
        return {
          success: false,
          error: 'File not found at the provided URL.'
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          error: 'Access denied. Please check if the file is publicly accessible.'
        };
      }
    }

    return {
      success: false,
      error: 'Failed to download file. Please check the URL and try again.'
    };
  }
}

/**
 * Process CV asynchronously
 */
async function processCVAsync(
  jobId: string,
  fileUrl: string,
  requestData: { userId: string } & CVUrlUploadRequest
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
  }
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Check if URL is from allowed domain
 */
function isAllowedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const allowedDomains = [
      'drive.google.com',
      'docs.google.com',
      'dropbox.com',
      'dl.dropboxusercontent.com',
      'onedrive.live.com',
      'sharepoint.com',
      '1drv.ms',
      'box.com',
      'app.box.com',
      'icloud.com',
      'github.com',
      'raw.githubusercontent.com',
      'gitlab.com',
      'bitbucket.org',
      's3.amazonaws.com',
      'storage.googleapis.com',
      'blob.core.windows.net'
    ];

    return allowedDomains.some(domain => {
      return urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`);
    });
  } catch {
    return false;
  }
}

/**
 * Extract filename from URL
 */
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.substring(pathname.lastIndexOf('/') + 1);

    // If no filename in URL, generate a default one
    if (!fileName || !fileName.includes('.')) {
      return `cv-${Date.now()}.pdf`;
    }

    return fileName;
  } catch {
    return `cv-${Date.now()}.pdf`;
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

  return Math.round(cost * 100) / 100;
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