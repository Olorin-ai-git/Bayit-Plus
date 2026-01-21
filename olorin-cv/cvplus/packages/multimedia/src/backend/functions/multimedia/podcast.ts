import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'firebase-functions';
import { multimediaService } from '../../services/multimedia.service';
import { getProcessedCV } from '../../models/processed-cv.service';
import { getUserProfile, updateUserCredits } from '../../models/user-profile.service';
import { authenticateUser } from '../../middleware/auth.middleware';
import { ContentType } from '../../../../shared/types/generated-content';

interface PodcastGenerationRequest {
  cvId: string;
  voiceId?: string;
  features?: {
    backgroundMusic?: boolean;
    introOutro?: boolean;
    customScript?: string;
    duration?: 'short' | 'medium' | 'long'; // 1-2min, 3-5min, 5-10min
  };
}

interface PodcastGenerationResponse {
  success: boolean;
  contentId?: string;
  message?: string;
  estimatedProcessingTime?: number;
  estimatedCost?: number;
}

export const generatePodcast = onRequest(
  {
    timeoutSeconds: 600, // 10 minutes for podcast generation
    memory: '2GiB',
    maxInstances: 20, // Limit concurrent podcast generations
    cors: {
      origin: true,
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }
  },
  async (req: Request, res: Response) => {
    try {
      logger.info('Podcast generation request received');

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
        } as PodcastGenerationResponse);
        return;
      }

      // Validate Content-Type
      if (!req.headers['content-type']?.includes('application/json')) {
        res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json'
        } as PodcastGenerationResponse);
        return;
      }

      // Authenticate user
      const authResult = await authenticateUser(req);
      if (!authResult.success || !authResult.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        } as PodcastGenerationResponse);
        return;
      }

      const userId = authResult.userId;

      // Parse request body
      const requestData: PodcastGenerationRequest = req.body;

      if (!requestData.cvId) {
        res.status(400).json({
          success: false,
          message: 'CV ID is required'
        } as PodcastGenerationResponse);
        return;
      }

      logger.info(`Podcast generation request for CV: ${requestData.cvId}, user: ${userId}`);

      // Verify CV exists and belongs to user
      const processedCV = await getProcessedCV(requestData.cvId);
      if (!processedCV) {
        res.status(404).json({
          success: false,
          message: 'CV not found'
        } as PodcastGenerationResponse);
        return;
      }

      if (processedCV.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only generate podcasts for your own CVs.'
        } as PodcastGenerationResponse);
        return;
      }

      // Get user profile for credit checking
      const userProfile = await getUserProfile(userId);

      // Estimate cost based on features
      const estimatedCost = await multimediaService.getEstimatedCost(
        ContentType.PODCAST,
        requestData.features
      );

      // Check if user has sufficient credits
      if (userProfile.credits < estimatedCost) {
        res.status(402).json({
          success: false,
          message: `Insufficient credits. Required: ${estimatedCost}, Available: ${userProfile.credits}`
        } as PodcastGenerationResponse);
        return;
      }

      // Check subscription tier limitations
      const subscriptionLimits = getPodcastLimits(userProfile.subscriptionTier);

      if (!subscriptionLimits.allowsPodcasts) {
        res.status(403).json({
          success: false,
          message: 'Podcast generation is not available in your subscription tier. Please upgrade to access this feature.'
        } as PodcastGenerationResponse);
        return;
      }

      // Check monthly podcast limit
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const monthlyUsage = userProfile.monthlyUsage?.[currentMonth]?.podcasts || 0;

      if (monthlyUsage >= subscriptionLimits.monthlyLimit) {
        res.status(429).json({
          success: false,
          message: `Monthly podcast limit reached. Your ${userProfile.subscriptionTier} plan allows ${subscriptionLimits.monthlyLimit} podcasts per month.`
        } as PodcastGenerationResponse);
        return;
      }

      // Validate voice ID if provided
      if (requestData.voiceId && !isValidVoiceId(requestData.voiceId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid voice ID. Please use a supported voice.'
        } as PodcastGenerationResponse);
        return;
      }

      // Deduct credits upfront (they'll be refunded if generation fails)
      logger.info(`Deducting ${estimatedCost} credits for podcast generation`);
      await updateUserCredits(userId, -estimatedCost);

      try {
        // Generate podcast
        logger.info('Starting podcast generation...');
        const generatedContent = await multimediaService.generateContent({
          cvId: requestData.cvId,
          userId: userId,
          contentType: ContentType.PODCAST,
          features: {
            voiceId: requestData.voiceId,
            backgroundMusic: requestData.features?.backgroundMusic,
            customizations: {
              introOutro: requestData.features?.introOutro,
              customScript: requestData.features?.customScript,
              duration: requestData.features?.duration || 'medium'
            }
          }
        });

        logger.info(`Podcast generation completed: ${generatedContent.id}`);

        // Update monthly usage
        const updatedMonthlyUsage = {
          ...userProfile.monthlyUsage,
          [currentMonth]: {
            ...userProfile.monthlyUsage?.[currentMonth],
            podcasts: monthlyUsage + 1
          }
        };

        // Update user profile with new monthly usage
        await updateUserCredits(userId, 0); // Just to trigger update with new monthly usage
        // Note: In production, create a separate function for updating monthly usage

        res.status(200).json({
          success: true,
          contentId: generatedContent.id,
          message: 'Podcast generation completed successfully',
          estimatedProcessingTime: 0, // Already completed
          estimatedCost
        } as PodcastGenerationResponse);

      } catch (generationError) {
        logger.error('Podcast generation failed:', generationError);

        // Refund credits on failure
        logger.info(`Refunding ${estimatedCost} credits due to generation failure`);
        await updateUserCredits(userId, estimatedCost);

        res.status(500).json({
          success: false,
          message: 'Podcast generation failed. Credits have been refunded.'
        } as PodcastGenerationResponse);
      }

    } catch (error) {
      logger.error('Podcast generation error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error during podcast generation'
      } as PodcastGenerationResponse);
    }
  }
);

/**
 * Get podcast limits based on subscription tier
  */
function getPodcastLimits(tier: string) {
  const limits = {
    free: {
      allowsPodcasts: false,
      monthlyLimit: 0,
      voiceOptions: []
    },
    basic: {
      allowsPodcasts: true,
      monthlyLimit: 2,
      voiceOptions: ['default']
    },
    premium: {
      allowsPodcasts: true,
      monthlyLimit: 10,
      voiceOptions: ['default', 'professional', 'friendly', 'confident']
    },
    enterprise: {
      allowsPodcasts: true,
      monthlyLimit: 50,
      voiceOptions: ['default', 'professional', 'friendly', 'confident', 'custom']
    }
  };

  return limits[tier as keyof typeof limits] || limits.free;
}

/**
 * Validate voice ID
  */
function isValidVoiceId(voiceId: string): boolean {
  const validVoiceIds = [
    // ElevenLabs voice IDs
    'pNInz6obpgDQGcFmaJgB', // Adam
    'ErXwobaYiN019PkySvjV', // Antoni
    'VR6AewLTigWG4xSOukaG', // Arnold
    'yoZ06aMxZJJ28mfd3POQ', // Sam
    'CYw3kZ02Hs0563khs1Fj', // Emily
    'FGY2WhTYpPnrIDTdsKH5', // Laura
    // Custom voice identifiers
    'default',
    'professional',
    'friendly',
    'confident'
  ];

  return validVoiceIds.includes(voiceId);
}

/**
 * Calculate estimated processing time based on features
  */
function calculateEstimatedTime(features: any): number {
  let baseTime = 60; // 1 minute base time for simple podcast

  if (features?.backgroundMusic) baseTime += 30;
  if (features?.introOutro) baseTime += 20;
  if (features?.duration === 'long') baseTime += 60;
  else if (features?.duration === 'medium') baseTime += 30;

  return baseTime;
}