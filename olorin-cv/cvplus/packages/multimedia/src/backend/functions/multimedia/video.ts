import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import { multimediaService } from '../../services/multimedia.service';
import { getProcessedCV } from '../../models/processed-cv.service';
import { getUserProfile, updateUserCredits } from '../../models/user-profile.service';
import { authenticateUser } from '../../middleware/auth.middleware';
import { ContentType } from '../../../../shared/types/generated-content';

interface VideoGenerationRequest {
  cvId: string;
  avatarId?: string;
  features?: {
    template?: 'professional' | 'creative' | 'modern' | 'minimal';
    background?: 'office' | 'studio' | 'gradient' | 'minimal';
    duration?: 'short' | 'medium' | 'long'; // 30s, 60s, 90s
    includeSubtitles?: boolean;
    customScript?: string;
    logoUrl?: string;
  };
}

interface VideoGenerationResponse {
  success: boolean;
  contentId?: string;
  message?: string;
  estimatedProcessingTime?: number;
  estimatedCost?: number;
  processingStatus?: string;
}

export const generateVideo = onRequest(
  {
    timeoutSeconds: 600, // 10 minutes for video generation
    memory: '4GiB',
    maxInstances: 10, // Limit concurrent video generations (resource intensive)
    cors: {
      origin: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      logger.info('Video generation request received');

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
        } as VideoGenerationResponse);
        return;
      }

      // Validate Content-Type
      if (!req.headers['content-type']?.includes('application/json')) {
        res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json'
        } as VideoGenerationResponse);
        return;
      }

      // Authenticate user
      const authResult = await authenticateUser(req);
      if (!authResult.success || !authResult.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        } as VideoGenerationResponse);
        return;
      }

      const userId = authResult.userId;

      // Parse request body
      const requestData: VideoGenerationRequest = req.body;

      if (!requestData.cvId) {
        res.status(400).json({
          success: false,
          message: 'CV ID is required'
        } as VideoGenerationResponse);
        return;
      }

      logger.info(`Video generation request for CV: ${requestData.cvId}, user: ${userId}`);

      // Verify CV exists and belongs to user
      const processedCV = await getProcessedCV(requestData.cvId);
      if (!processedCV) {
        res.status(404).json({
          success: false,
          message: 'CV not found'
        } as VideoGenerationResponse);
        return;
      }

      if (processedCV.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only generate videos for your own CVs.'
        } as VideoGenerationResponse);
        return;
      }

      // Get user profile for credit checking and subscription verification
      const userProfile = await getUserProfile(userId);

      // Check subscription tier permissions
      const subscriptionLimits = getVideoLimits(userProfile.subscriptionTier);

      if (!subscriptionLimits.allowsVideos) {
        res.status(403).json({
          success: false,
          message: 'Video generation is not available in your subscription tier. Please upgrade to Premium or Enterprise to access this feature.'
        } as VideoGenerationResponse);
        return;
      }

      // Check monthly video limit
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const monthlyUsage = userProfile.monthlyUsage?.[currentMonth]?.videos || 0;

      if (monthlyUsage >= subscriptionLimits.monthlyLimit) {
        res.status(429).json({
          success: false,
          message: `Monthly video limit reached. Your ${userProfile.subscriptionTier} plan allows ${subscriptionLimits.monthlyLimit} videos per month.`
        } as VideoGenerationResponse);
        return;
      }

      // Validate features against subscription tier
      const featureValidation = validateVideoFeatures(requestData.features, userProfile.subscriptionTier);
      if (!featureValidation.valid) {
        res.status(403).json({
          success: false,
          message: featureValidation.message
        } as VideoGenerationResponse);
        return;
      }

      // Estimate cost based on features
      const estimatedCost = await multimediaService.getEstimatedCost(
        ContentType.VIDEO_INTRO,
        requestData.features
      );

      // Check if user has sufficient credits
      if (userProfile.credits < estimatedCost) {
        res.status(402).json({
          success: false,
          message: `Insufficient credits. Required: ${estimatedCost}, Available: ${userProfile.credits}`
        } as VideoGenerationResponse);
        return;
      }

      // Validate avatar ID if provided
      if (requestData.avatarId && !isValidAvatarId(requestData.avatarId, userProfile.subscriptionTier)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or unavailable avatar ID for your subscription tier.'
        } as VideoGenerationResponse);
        return;
      }

      // Calculate estimated processing time
      const estimatedProcessingTime = calculateVideoProcessingTime(requestData.features);

      // Deduct credits upfront (they'll be refunded if generation fails)
      logger.info(`Deducting ${estimatedCost} credits for video generation`);
      await updateUserCredits(userId, -estimatedCost);

      try {
        // Start video generation asynchronously
        logger.info('Starting video generation...');

        const generatedContent = await multimediaService.generateContent({
          cvId: requestData.cvId,
          userId: userId,
          contentType: ContentType.VIDEO_INTRO,
          features: {
            avatarId: requestData.avatarId,
            customizations: {
              template: requestData.features?.template || 'professional',
              background: requestData.features?.background || 'office',
              duration: requestData.features?.duration || 'medium',
              includeSubtitles: requestData.features?.includeSubtitles || true,
              customScript: requestData.features?.customScript,
              logoUrl: requestData.features?.logoUrl
            }
          }
        });

        logger.info(`Video generation completed: ${generatedContent.id}`);

        // Update monthly usage
        const updatedMonthlyUsage = {
          ...userProfile.monthlyUsage,
          [currentMonth]: {
            ...userProfile.monthlyUsage?.[currentMonth],
            videos: monthlyUsage + 1
          }
        };

        // Note: In production, create a separate function for updating monthly usage

        res.status(200).json({
          success: true,
          contentId: generatedContent.id,
          message: 'Video generation completed successfully',
          estimatedProcessingTime: 0, // Already completed
          estimatedCost,
          processingStatus: 'completed'
        } as VideoGenerationResponse);

      } catch (generationError) {
        logger.error('Video generation failed:', generationError);

        // Refund credits on failure
        logger.info(`Refunding ${estimatedCost} credits due to generation failure`);
        await updateUserCredits(userId, estimatedCost);

        const errorMessage = generationError instanceof Error ? generationError.message : 'Unknown error';

        res.status(500).json({
          success: false,
          message: `Video generation failed: ${errorMessage}. Credits have been refunded.`,
          processingStatus: 'failed'
        } as VideoGenerationResponse);
      }

    } catch (error) {
      logger.error('Video generation error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error during video generation'
      } as VideoGenerationResponse);
    }
  }
);

/**
 * Get video limits based on subscription tier
  */
function getVideoLimits(tier: string) {
  const limits = {
    free: {
      allowsVideos: false,
      monthlyLimit: 0,
      availableAvatars: [],
      availableTemplates: [],
      maxDuration: 0
    },
    basic: {
      allowsVideos: false,
      monthlyLimit: 0,
      availableAvatars: [],
      availableTemplates: [],
      maxDuration: 0
    },
    premium: {
      allowsVideos: true,
      monthlyLimit: 3,
      availableAvatars: ['amy-jcwCkr1grs', 'noah-jBXGhj8p5s', 'sara-kVoxw1fwUm'],
      availableTemplates: ['professional', 'modern'],
      maxDuration: 90 // 90 seconds
    },
    enterprise: {
      allowsVideos: true,
      monthlyLimit: 15,
      availableAvatars: ['amy-jcwCkr1grs', 'noah-jBXGhj8p5s', 'sara-kVoxw1fwUm', 'alex-Hm5AUP7qKs', 'custom'],
      availableTemplates: ['professional', 'creative', 'modern', 'minimal'],
      maxDuration: 120 // 2 minutes
    }
  };

  return limits[tier as keyof typeof limits] || limits.free;
}

/**
 * Validate video features against subscription tier
  */
function validateVideoFeatures(features: any, tier: string): { valid: boolean; message?: string } {
  const limits = getVideoLimits(tier);

  if (features?.template && !limits.availableTemplates.includes(features.template)) {
    return {
      valid: false,
      message: `Template '${features.template}' is not available in your ${tier} plan. Available templates: ${limits.availableTemplates.join(', ')}`
    };
  }

  const durationLimits = {
    short: 30,
    medium: 60,
    long: 90
  };

  const requestedDuration = durationLimits[features?.duration as keyof typeof durationLimits] || 60;

  if (requestedDuration > limits.maxDuration) {
    return {
      valid: false,
      message: `Video duration '${features?.duration}' exceeds your plan limit of ${limits.maxDuration} seconds`
    };
  }

  return { valid: true };
}

/**
 * Validate avatar ID against subscription tier
  */
function isValidAvatarId(avatarId: string, tier: string): boolean {
  const limits = getVideoLimits(tier);
  return limits.availableAvatars.includes(avatarId);
}

/**
 * Calculate estimated video processing time based on features
  */
function calculateVideoProcessingTime(features: any): number {
  let baseTime = 120; // 2 minutes base time

  // Duration impacts processing time
  const duration = features?.duration || 'medium';
  if (duration === 'long') baseTime += 60;
  else if (duration === 'short') baseTime -= 30;

  // Template complexity
  const template = features?.template || 'professional';
  if (template === 'creative') baseTime += 30;
  else if (template === 'minimal') baseTime -= 15;

  // Additional features
  if (features?.includeSubtitles) baseTime += 20;
  if (features?.logoUrl) baseTime += 15;
  if (features?.customScript) baseTime += 10;

  return Math.max(baseTime, 60); // Minimum 1 minute
}

/**
 * Get available avatar options for subscription tier
  */
export function getAvailableAvatars(tier: string): Array<{ id: string; name: string; preview: string }> {
  const avatarDatabase = {
    'amy-jcwCkr1grs': {
      name: 'Amy',
      preview: 'https://create-images-results.d-id.com/api_docs/assets/amy.jpeg',
      description: 'Professional businesswoman'
    },
    'noah-jBXGhj8p5s': {
      name: 'Noah',
      preview: 'https://create-images-results.d-id.com/api_docs/assets/noah.jpeg',
      description: 'Confident professional'
    },
    'sara-kVoxw1fwUm': {
      name: 'Sara',
      preview: 'https://create-images-results.d-id.com/api_docs/assets/sara.jpeg',
      description: 'Friendly presenter'
    },
    'alex-Hm5AUP7qKs': {
      name: 'Alex',
      preview: 'https://create-images-results.d-id.com/api_docs/assets/alex.jpeg',
      description: 'Modern professional'
    }
  };

  const limits = getVideoLimits(tier);

  return limits.availableAvatars
    .filter(id => id !== 'custom')
    .map(id => ({
      id,
      name: avatarDatabase[id as keyof typeof avatarDatabase]?.name || id,
      preview: avatarDatabase[id as keyof typeof avatarDatabase]?.preview || ''
    }));
}

/**
 * Get available video templates for subscription tier
  */
export function getAvailableTemplates(tier: string): Array<{ id: string; name: string; description: string }> {
  const templateDatabase = {
    professional: {
      name: 'Professional',
      description: 'Clean, corporate design suitable for business contexts'
    },
    creative: {
      name: 'Creative',
      description: 'Vibrant, dynamic design for creative industries'
    },
    modern: {
      name: 'Modern',
      description: 'Contemporary design with sleek animations'
    },
    minimal: {
      name: 'Minimal',
      description: 'Simple, elegant design focusing on content'
    }
  };

  const limits = getVideoLimits(tier);

  return limits.availableTemplates.map(id => ({
    id,
    name: templateDatabase[id as keyof typeof templateDatabase]?.name || id,
    description: templateDatabase[id as keyof typeof templateDatabase]?.description || ''
  }));
}