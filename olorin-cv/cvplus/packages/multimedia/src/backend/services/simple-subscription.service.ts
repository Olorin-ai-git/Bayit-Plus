import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

export interface UserSubscriptionData {
  subscriptionStatus: 'free' | 'lifetime' | 'active';
  lifetimeAccess: boolean;
  features: Record<string, boolean>;
  purchasedAt?: Date;
  stripeCustomerId?: string;
  metadata?: {
    paymentAmount?: number;
    currency?: string;
    accountVerification?: {
      verifiedAt?: Date;
    };
  };
}

/**
 * Simplified subscription service for multimedia package during migration
 * This provides basic functionality without complex caching dependencies
  */
export class SimpleSubscriptionService {
  private db = admin.firestore();

  async getUserSubscription(userId: string): Promise<UserSubscriptionData> {
    try {
      logger.debug('Getting user subscription (simple)', { userId });

      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        logger.warn('User not found, returning free subscription', { userId });
        return this.getDefaultFreeSubscription();
      }

      const userData = userDoc.data();
      
      // Check for lifetime access
      const lifetimeAccess = userData?.subscription?.lifetimeAccess === true;
      
      // Default features for multimedia access during migration
      const defaultFeatures = {
        podcast: lifetimeAccess,
        videoIntroduction: lifetimeAccess,
        webPortal: lifetimeAccess,
        aiChat: lifetimeAccess,
        advancedAnalytics: lifetimeAccess,
        roleDetection: lifetimeAccess,
        externalData: lifetimeAccess
      };

      return {
        subscriptionStatus: lifetimeAccess ? 'lifetime' : 'free',
        lifetimeAccess,
        features: userData?.subscription?.features || defaultFeatures,
        purchasedAt: userData?.subscription?.purchasedAt?.toDate(),
        stripeCustomerId: userData?.subscription?.stripeCustomerId,
        metadata: userData?.subscription?.metadata || {}
      };

    } catch (error) {
      logger.error('Error getting user subscription (simple)', { error, userId });
      return this.getDefaultFreeSubscription();
    }
  }

  private getDefaultFreeSubscription(): UserSubscriptionData {
    return {
      subscriptionStatus: 'free',
      lifetimeAccess: false,
      features: {
        podcast: false,
        videoIntroduction: false,
        webPortal: false,
        aiChat: false,
        advancedAnalytics: false,
        roleDetection: false,
        externalData: false
      }
    };
  }
}

export const simpleSubscriptionService = new SimpleSubscriptionService();