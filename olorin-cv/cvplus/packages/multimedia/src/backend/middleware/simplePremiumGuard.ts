import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { requireAuth, AuthenticatedRequest } from './simpleAuthGuard';
import { simpleSubscriptionService } from '../services/simple-subscription.service';

type PremiumFeature = 'webPortal' | 'aiChat' | 'podcast' | 'advancedAnalytics' | 'videoIntroduction' | 'roleDetection' | 'externalData';

// Simplified subscription check using multimedia subscription service
const checkPremiumAccess = async (uid: string, feature: PremiumFeature): Promise<boolean> => {
  try {
    logger.debug('Checking premium access', { uid, feature });
    
    const subscription = await simpleSubscriptionService.getUserSubscription(uid);
    
    // Check for lifetime access
    if (!subscription?.lifetimeAccess) {
      logger.debug('No lifetime access', { uid, feature, subscriptionStatus: subscription?.subscriptionStatus });
      return false;
    }
    
    // Check specific feature access
    const hasFeatureAccess = subscription?.features?.[feature] === true;
    logger.debug('Feature access check', { uid, feature, hasAccess: hasFeatureAccess });
    
    return hasFeatureAccess;
    
  } catch (error) {
    logger.error('Error checking premium access', { uid, feature, error });
    return false;
  }
};

// Simplified premium guard for multimedia package
export const withPremiumAccess = (feature: PremiumFeature, handler: Function) => {
  return async (request: any, context?: any) => {
    const startTime = Date.now();
    
    try {
      logger.debug('Multimedia premium function execution started', {
        feature,
        uid: request.auth?.uid,
        hasData: !!request.data
      });

      // Basic authentication check
      const authenticatedRequest = await requireAuth(request);
      
      // Check premium access using simple subscription service
      const hasAccess = await checkPremiumAccess(authenticatedRequest.auth.uid, feature);
      
      if (!hasAccess) {
        logger.warn('Premium access denied', {
          feature,
          uid: authenticatedRequest.auth.uid
        });
        
        throw new HttpsError(
          'permission-denied',
          `This feature requires lifetime premium access. Please upgrade to access '${feature}'.`,
          {
            feature,
            upgradeUrl: '/pricing',
            accessType: 'lifetime',
            reason: 'insufficient-access'
          }
        );
      }
      
      logger.debug('Multimedia function access granted', {
        feature,
        uid: authenticatedRequest.auth.uid
      });
      
      // Execute the original handler with authenticated request
      const result = await handler(authenticatedRequest, context);
      
      const executionTime = Date.now() - startTime;
      logger.debug('Multimedia function execution completed', {
        feature,
        uid: authenticatedRequest.auth.uid,
        executionTime,
        hasResult: !!result
      });
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (error instanceof HttpsError) {
        logger.warn('Multimedia function execution failed', {
          feature,
          uid: request.auth?.uid,
          executionTime,
          errorCode: error.code,
          errorMessage: error.message
        });
        throw error;
      }
      
      logger.error('Multimedia function execution failed with unknown error', {
        feature,
        uid: request.auth?.uid,
        executionTime,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      });
      
      throw new HttpsError(
        'internal',
        `Failed to execute multimedia function: ${feature}`,
        {
          feature,
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }
      );
    }
  };
};