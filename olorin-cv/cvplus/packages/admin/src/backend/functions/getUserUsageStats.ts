import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
// Premium service temporarily unavailable during cleanup
// import { PremiumService } from '@cvplus/premium';

// Real subscription service integration
const getUserSubscriptionInternal = async (userId: string) => {
  try {
    // Premium service temporarily unavailable during cleanup
    // const subscriptionData = await PremiumService.getUserSubscription(userId);
    const subscriptionData = { status: 'free', lifetimeAccess: false };
    return {
      subscriptionStatus: subscriptionData.status || 'free',
      lifetimeAccess: subscriptionData.lifetimeAccess || false
    };
  } catch (error) {
    logger.error('Failed to get user subscription', { userId, error });
    // Fallback to free plan if subscription service fails
    return { subscriptionStatus: 'free', lifetimeAccess: false };
  }
};

interface GetUserUsageStatsData {
  userId: string;
}

export const getUserUsageStats = onCall<GetUserUsageStatsData>(
  {
    cors: true
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
      // Get current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get user's subscription status
      const subscriptionData = await getUserSubscriptionInternal(userId);
      const isLifetimeAccess = subscriptionData.lifetimeAccess === true;
      const isPremium = subscriptionData.subscriptionStatus === 'premium' || isLifetimeAccess;

      // Get user's uploads this month
      const db = admin.firestore();
      const uploadsQuery = await db
        .collection('userPolicyRecords')
        .doc(userId)
        .collection('uploadHistory')
        .where('uploadDate', '>=', startOfMonth)
        .get();

      const currentMonthUploads = uploadsQuery.size;
      
      // Count unique CV hashes uploaded this month
      const uniqueCVHashes = new Set(
        uploadsQuery.docs
          .map(doc => doc.data().cvHash)
          .filter(hash => hash) // Filter out any null/undefined hashes
      ).size;

      // Calculate remaining uploads based on plan
      const FREE_PLAN_LIMIT = 3;
      const PREMIUM_UNIQUE_CV_LIMIT = 3;

      let remainingUploads: number;
      
      if (isPremium) {
        // Premium users: unlimited refinements of up to 3 unique CVs per month
        remainingUploads = uniqueCVHashes >= PREMIUM_UNIQUE_CV_LIMIT ? 0 : Infinity;
      } else {
        // Free users: 3 uploads total per month
        remainingUploads = Math.max(0, FREE_PLAN_LIMIT - currentMonthUploads);
      }

      const usageStats = {
        currentMonthUploads,
        uniqueCVsThisMonth: uniqueCVHashes,
        remainingUploads: remainingUploads === Infinity ? 999 : remainingUploads, // Frontend can't handle Infinity
        subscriptionStatus: isPremium ? 'premium' : 'free',
        lifetimeAccess: isLifetimeAccess,
        monthlyLimit: isPremium ? 'unlimited' : FREE_PLAN_LIMIT,
        uniqueCVLimit: isPremium ? PREMIUM_UNIQUE_CV_LIMIT : 1,
        currentMonth: now.toISOString().substring(0, 7), // YYYY-MM format
        lastUpdated: new Date().toISOString()
      };

      logger.info('User usage stats retrieved', {
        userId,
        currentMonthUploads,
        uniqueCVsThisMonth: uniqueCVHashes,
        remainingUploads: remainingUploads === Infinity ? 'unlimited' : remainingUploads,
        subscriptionStatus: isPremium ? 'premium' : 'free'
      });

      return usageStats;

    } catch (error) {
      logger.error('Error getting user usage stats', { error, userId });
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        'internal',
        'Failed to get user usage statistics',
        error
      );
    }
  }
);