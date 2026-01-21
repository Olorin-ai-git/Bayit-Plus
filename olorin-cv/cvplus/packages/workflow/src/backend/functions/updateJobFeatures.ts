import { FieldValue } from 'firebase-admin/firestore';
import { requireGoogleAuth } from '../../utils/auth';
import { db } from '../../config/firebase';
import { logger } from 'firebase-functions/v2';

interface UpdateJobFeaturesRequest {
  jobId: string;
  selectedFeatures: string[];
}

interface UpdateJobFeaturesResponse {
  success: boolean;
  validatedFeatures: string[];
  removedFeatures: string[];
  message: string;
}

/**
 * Premium Feature Configuration - Server-side validation
 * Must match frontend configuration in /frontend/src/config/premiumFeatures.ts
  */
const PREMIUM_FEATURE_MAPPINGS: Record<string, string> = {
  // Advanced Features - require Premium access
  'skills-visualization': 'advancedAnalytics',
  'personality-insights': 'aiChat',
  'career-timeline': 'advancedAnalytics',
  'portfolio-gallery': 'webPortal',
  'certification-badges': 'webPortal',
  
  // Multimedia Features
  'generate-podcast': 'podcast',
  'video-introduction': 'webPortal',
  'interactive-timeline': 'webPortal',
  'availability-calendar': 'webPortal',
  'testimonials-carousel': 'webPortal'
};

/**
 * Free features - available to all users
  */
const FREE_FEATURES = [
  'ats-optimization',
  'keyword-enhancement', 
  'achievements-showcase',
  'embed-qr-code',
  'language-proficiency',
  'social-media-links',
  'contact-form',
  'privacy-mode'
];

/**
 * Check if a feature requires premium access
  */
function isPremiumFeature(featureId: string): boolean {
  return !!PREMIUM_FEATURE_MAPPINGS[featureId];
}

/**
 * Get the premium type required for a feature
  */
function getPremiumTypeForFeature(featureId: string): string | null {
  return PREMIUM_FEATURE_MAPPINGS[featureId] || null;
}

/**
 * Get user subscription data directly from Firestore
  */
async function getUserSubscriptionData(userId: string): Promise<{
  subscriptionStatus: string;
  lifetimeAccess: boolean;
  features: Record<string, boolean>;
}> {
  try {
    const subscriptionDoc = await db
      .collection('userSubscriptions')
      .doc(userId)
      .get();

    if (!subscriptionDoc.exists) {
      return {
        subscriptionStatus: 'free',
        lifetimeAccess: false,
        features: {
          webPortal: false,
          aiChat: false,
          podcast: false,
          advancedAnalytics: false
        }
      };
    }

    const subscriptionData = subscriptionDoc.data()!;
    return {
      subscriptionStatus: subscriptionData.subscriptionStatus || 'free',
      lifetimeAccess: subscriptionData.lifetimeAccess || false,
      features: subscriptionData.features || {
        webPortal: false,
        aiChat: false,
        podcast: false,
        advancedAnalytics: false
      }
    };
  } catch (error) {
    logger.error('Error fetching user subscription', { userId, error });
    // Return free tier on error for security
    return {
      subscriptionStatus: 'free',
      lifetimeAccess: false,
      features: {
        webPortal: false,
        aiChat: false,
        podcast: false,
        advancedAnalytics: false
      }
    };
  }
}

/**
 * Validate user access to selected features based on their premium subscription
  */
async function validateFeatureAccess(
  userId: string,
  selectedFeatures: string[]
): Promise<{
  validatedFeatures: string[];
  removedFeatures: string[];
  violations: string[];
}> {
  const validatedFeatures: string[] = [];
  const removedFeatures: string[] = [];
  const violations: string[] = [];

  try {
    // Get user's premium subscription status
    const subscription = await getUserSubscriptionData(userId);
    const userPremiumFeatures = subscription.features || {};

    logger.info('Validating feature access', {
      userId,
      selectedFeatures,
      userPremiumFeatures,
      isLifetimePremium: subscription?.lifetimeAccess
    });

    for (const featureId of selectedFeatures) {
      // Allow free features
      if (FREE_FEATURES.includes(featureId) || !isPremiumFeature(featureId)) {
        validatedFeatures.push(featureId);
        continue;
      }

      // Check premium feature access
      const requiredPremiumType = getPremiumTypeForFeature(featureId);
      if (!requiredPremiumType) {
        // Unknown feature - allow but log warning
        logger.warn('Unknown feature in validation', { featureId });
        validatedFeatures.push(featureId);
        continue;
      }

      // Check if user has access to required premium feature
      const hasAccess = userPremiumFeatures[requiredPremiumType] === true;
      
      if (hasAccess) {
        validatedFeatures.push(featureId);
        logger.info('Premium feature access granted', { 
          featureId, 
          requiredPremiumType, 
          userId 
        });
      } else {
        removedFeatures.push(featureId);
        violations.push(
          `Feature "${featureId}" requires "${requiredPremiumType}" access but user lacks permission`
        );
        logger.warn('Premium feature access denied', { 
          featureId, 
          requiredPremiumType, 
          userId,
          userPremiumFeatures 
        });
      }
    }

    return {
      validatedFeatures,
      removedFeatures,
      violations
    };

  } catch (error) {
    logger.error('Error during feature validation', { error, userId, selectedFeatures });
    
    // On error, fall back to only allowing free features for security
    const fallbackFeatures = selectedFeatures.filter(featureId => 
      FREE_FEATURES.includes(featureId) || !isPremiumFeature(featureId)
    );
    
    return {
      validatedFeatures: fallbackFeatures,
      removedFeatures: selectedFeatures.filter(f => !fallbackFeatures.includes(f)),
      violations: ['Feature validation failed - restricted to free features only']
    };
  }
}

/**
 * Firebase Function: Update Job Features with Premium Validation
 * 
 * This function enforces server-side validation to ensure only premium users
 * can select and use premium features. Non-premium users are restricted to free features.
  */
export const updateJobFeatures = onCall<UpdateJobFeaturesRequest>(
  { cors: true },
  async (request): Promise<UpdateJobFeaturesResponse> => {
    try {
      // Validate authentication
      const user = await requireGoogleAuth(request);
      const userId = user.uid;
      const { jobId, selectedFeatures } = request.data;

      // Validate request parameters
      if (!jobId || !Array.isArray(selectedFeatures)) {
        throw new HttpsError(
          'invalid-argument',
          'Missing required parameters: jobId and selectedFeatures array'
        );
      }

      logger.info('Processing job features update', {
        userId,
        jobId,
        selectedFeatures: selectedFeatures.length,
        features: selectedFeatures
      });

      // Validate user owns the job
      const jobRef = db.collection('jobs').doc(jobId);
      const jobDoc = await jobRef.get();

      if (!jobDoc.exists) {
        throw new HttpsError('not-found', 'Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== userId) {
        throw new HttpsError(
          'permission-denied', 
          'You do not have permission to modify this job'
        );
      }

      // Critical: Validate feature access based on user's premium subscription
      const validation = await validateFeatureAccess(userId, selectedFeatures);

      // Log security violations
      if (validation.violations.length > 0) {
        logger.warn('Premium feature access violations detected', {
          userId,
          jobId,
          violations: validation.violations,
          removedFeatures: validation.removedFeatures
        });
      }

      // Update job with only validated (accessible) features
      await jobRef.update({
        selectedFeatures: validation.validatedFeatures,
        removedFeatures: validation.removedFeatures,
        lastFeatureValidation: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Prepare response message
      let message = `Updated job with ${validation.validatedFeatures.length} features`;
      if (validation.removedFeatures.length > 0) {
        message += `. Removed ${validation.removedFeatures.length} premium features requiring upgrade.`;
      }

      logger.info('Job features updated successfully', {
        userId,
        jobId,
        validatedFeatures: validation.validatedFeatures.length,
        removedFeatures: validation.removedFeatures.length
      });

      return {
        success: true,
        validatedFeatures: validation.validatedFeatures,
        removedFeatures: validation.removedFeatures,
        message
      };

    } catch (error) {
      logger.error('Error in updateJobFeatures function', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        requestData: request.data
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal', 
        'Failed to update job features. Please try again.'
      );
    }
  }
);