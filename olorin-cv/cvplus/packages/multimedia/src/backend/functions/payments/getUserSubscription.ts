import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { corsOptions } from '../../config/cors';
import { simpleSubscriptionService, UserSubscriptionData } from '../../services/simple-subscription.service';

interface GetUserSubscriptionData {
  userId: string;
}

export const getUserSubscription = onCall<GetUserSubscriptionData>(
  {
    ...corsOptions
  },
  async (request) => {
    const { data, auth } = request;

    // Verify authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Verify user matches the authenticated user
    if (auth.uid !== data.userId) {
      throw new HttpsError('permission-denied', 'User ID mismatch');
    }

    const { userId } = data;

    try {
      // Get user subscription with simple service
      const subscriptionData = await simpleSubscriptionService.getUserSubscription(userId);

      logger.info('User subscription retrieved', {
        userId,
        subscriptionStatus: subscriptionData.subscriptionStatus,
        lifetimeAccess: subscriptionData.lifetimeAccess
      });

      return {
        subscriptionStatus: subscriptionData.subscriptionStatus,
        lifetimeAccess: subscriptionData.lifetimeAccess,
        features: subscriptionData.features,
        purchasedAt: subscriptionData.purchasedAt,
        paymentAmount: subscriptionData.metadata?.paymentAmount,
        currency: subscriptionData.metadata?.currency,
        googleAccountVerified: subscriptionData.metadata?.accountVerification?.verifiedAt,
        stripeCustomerId: subscriptionData.stripeCustomerId,
        message: subscriptionData.lifetimeAccess 
          ? 'Lifetime premium access active'
          : subscriptionData.subscriptionStatus === 'free' 
            ? 'No premium subscription found'
            : 'Free tier active'
      };

    } catch (error) {
      logger.error('Error getting user subscription', { error, userId });
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'internal',
        'Failed to get user subscription',
        error
      );
    }
  }
);

// Helper function for internal use (not exposed as Cloud Function)
// Now uses caching for improved performance
export async function getUserSubscriptionInternal(userId: string): Promise<UserSubscriptionData> {
  try {
    logger.debug('Getting user subscription internally (simple)', { userId });
    return await simpleSubscriptionService.getUserSubscription(userId);
  } catch (error) {
    logger.error('Error getting user subscription internally', { error, userId });
    throw error;
  }
}

// Helper function to invalidate cache when subscription changes
export function invalidateUserSubscriptionCache(userId: string): void {
  // Simple service doesn't have cache to invalidate
  logger.debug('Cache invalidation requested (simple service)', { userId });
}