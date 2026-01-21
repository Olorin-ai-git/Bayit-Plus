/**
 * Feature Access Cache Service for CVPlus
 *
 * High-performance caching for premium feature access validation
 * with optimized response times for subscription checks.
 *
 * Implements secure default-deny access control with feature flag kill-switch
 * for safe rollout of security changes.
 *
 * @author Gil Klainert
 * @version 2.0.0
 * @created 2025-08-29
 * @updated 2025-11-29
  */

import { logger } from 'firebase-functions';
import { cacheService } from '../../../services/cache/cache.service';
import { featureFlagsService } from '../../../services/feature-flags/feature-flags.service';

export interface FeatureAccessCacheMetrics {
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  invalidations: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason: string;
  tier: 'free' | 'premium' | 'enterprise';
  cached: boolean;
  responseTime: number;
  securityFlagEnabled?: boolean;
}

class FeatureAccessCacheService {
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly CACHE_NAMESPACE = 'feature_access';
  private db: any = null;
  private metrics: FeatureAccessCacheMetrics = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    invalidations: 0,
    averageResponseTime: 0,
    errorRate: 0
  };

  /**
   * Initialize with Firestore instance
   */
  initialize(firestoreInstance: any): void {
    this.db = firestoreInstance;
  }

  /**
   * Check if user has access to specific feature
   *
   * Implements secure default-deny access control with feature flag kill-switch.
   * When NEW_FEATURE_ACCESS_LOGIC flag is OFF: Uses old behavior (backward compatible)
   * When NEW_FEATURE_ACCESS_LOGIC flag is ON: Uses new default-deny behavior (secure)
   */
  async checkFeatureAccess(userId: string, featureId: string): Promise<FeatureAccessResult> {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      const cacheKey = `${this.CACHE_NAMESPACE}:${userId}:${featureId}`;
      const cached = await cacheService.get<FeatureAccessResult>(cacheKey);

      if (cached.cached && cached.value) {
        this.metrics.cacheHits++;
        const responseTime = Date.now() - startTime;
        this.updateAverageResponseTime(responseTime);

        return {
          hasAccess: cached.value.hasAccess,
          reason: cached.value.reason,
          tier: cached.value.tier,
          cached: true,
          responseTime,
          securityFlagEnabled: cached.value.securityFlagEnabled,
        };
      }

      this.metrics.cacheMisses++;

      // Check if new security logic is enabled (kill-switch feature flag)
      const securityFlagEnabled = await featureFlagsService.evaluateFlag(
        'NEW_FEATURE_ACCESS_LOGIC'
      );

      // Evaluate feature access based on security flag
      let result: FeatureAccessResult;

      if (securityFlagEnabled) {
        // NEW BEHAVIOR: Default-deny security posture
        result = await this.evaluateFeatureAccessSecure(userId, featureId);
        result.securityFlagEnabled = true;
      } else {
        // OLD BEHAVIOR: Default-allow for backward compatibility
        result = {
          hasAccess: true,
          reason: 'Default access (legacy behavior - security flag OFF)',
          tier: 'free',
          cached: false,
          responseTime: Date.now() - startTime,
          securityFlagEnabled: false,
        };

        logger.warn('Using legacy default-allow behavior - security flag OFF', {
          userId,
          featureId,
        });
      }

      // Cache the result
      await cacheService.set(cacheKey, result, { ttl: this.CACHE_TTL });

      this.updateAverageResponseTime(result.responseTime);
      return result;
    } catch (error) {
      this.metrics.errorRate++;
      logger.error('Feature access cache error', { userId, featureId, error });

      // On error: Default to deny access (fail secure)
      return {
        hasAccess: false,
        reason: 'Cache error - access denied for security',
        tier: 'free',
        cached: false,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate feature access with secure default-deny logic
   * Queries Firestore for user subscription tier and feature eligibility
   * Returns false for unknown/unverified features (default-deny security posture)
   */
  private async evaluateFeatureAccessSecure(
    userId: string,
    featureId: string
  ): Promise<FeatureAccessResult> {
    try {
      // Default deny: if we can't verify access, deny it
      if (!this.db) {
        logger.warn('Firestore not initialized for feature access verification', { userId });
        return {
          hasAccess: false,
          reason: 'Database not initialized - access denied for security',
          tier: 'free',
          cached: false,
          responseTime: 0,
        };
      }

      // Query user_subscriptions collection to get current subscription status
      const subscriptionDoc = await this.db
        .collection('user_subscriptions')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      // If no active subscription found, user is on free tier
      if (subscriptionDoc.empty) {
        logger.info('No active subscription found for user', { userId, featureId });

        // Free tier users can access free features only
        const freeFeatures = ['cv_generation', 'basic_templates', 'pdf_export'];
        const hasAccess = freeFeatures.includes(featureId);

        return {
          hasAccess,
          reason: hasAccess
            ? 'Free tier feature access granted'
            : 'Feature requires premium subscription',
          tier: 'free',
          cached: false,
          responseTime: 0,
        };
      }

      // Get the active subscription data
      const subscription = subscriptionDoc.docs[0].data() as any;
      const tier = subscription.tier || 'free';
      const endDate = subscription.endDate ? new Date(subscription.endDate) : null;

      // Check if subscription is expired
      if (endDate && endDate < new Date()) {
        logger.warn('User subscription expired', { userId, endDate });
        return {
          hasAccess: false,
          reason: 'Subscription expired - access denied',
          tier: 'free',
          cached: false,
          responseTime: 0,
        };
      }

      // Define feature access by tier
      const featuresByTier: Record<string, string[]> = {
        free: ['cv_generation', 'basic_templates', 'pdf_export'],
        premium: [
          'cv_generation', 'basic_templates', 'pdf_export',
          'advanced_templates', 'ai_optimization', 'video_intro'
        ],
        enterprise: [
          'cv_generation', 'basic_templates', 'pdf_export',
          'advanced_templates', 'ai_optimization', 'video_intro',
          'team_collaboration', 'analytics_dashboard', 'api_access',
          'priority_support', 'custom_branding'
        ]
      };

      // Check if user's tier has access to the feature
      const tierFeatures = featuresByTier[tier] || featuresByTier.free;
      const hasAccess = tierFeatures.includes(featureId);

      // Log feature access decision for monitoring
      if (hasAccess) {
        logger.info('Feature access granted', {
          userId,
          featureId,
          tier,
          subscriptionId: subscription.stripeSubscriptionId
        });
      } else {
        logger.warn('Feature access denied', {
          userId,
          featureId,
          tier,
          reason: 'Feature not available for subscription tier'
        });
      }

      return {
        hasAccess,
        reason: hasAccess
          ? `${tier} tier feature access granted`
          : `Feature not available for ${tier} tier`,
        tier: tier as 'free' | 'premium' | 'enterprise',
        cached: false,
        responseTime: 0,
      };
    } catch (error) {
      logger.error('Secure feature access evaluation error', {
        userId,
        featureId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail secure: deny access on error
      return {
        hasAccess: false,
        reason: 'Unable to verify access - denied for security',
        tier: 'free',
        cached: false,
        responseTime: 0,
      };
    }
  }

  /**
   * Warm cache for common users
    */
  async warmCache(userIds: string[]): Promise<void> {
    try {
      const commonFeatures = ['cv_generation', 'export_pdf', 'basic_templates'];
      const promises = [];

      for (const userId of userIds) {
        for (const featureId of commonFeatures) {
          promises.push(this.checkFeatureAccess(userId, featureId));
        }
      }

      await Promise.allSettled(promises);
      logger.info('Feature access cache warmed', { userCount: userIds.length });
      
    } catch (error) {
      logger.error('Feature access cache warm-up error', { error });
    }
  }

  /**
   * Get cache hit rate
    */
  getHitRate(): number {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    return totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0;
  }

  /**
   * Get performance metrics
    */
  getMetrics(): FeatureAccessCacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Invalidate cache for user
    */
  async invalidateUser(userId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_NAMESPACE}:${userId}:*`;
      await cacheService.deletePattern(pattern);
      this.metrics.invalidations++;
      
    } catch (error) {
      logger.error('Feature access cache invalidation error', { userId, error });
    }
  }

  /**
   * Clear all feature access cache
    */
  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.CACHE_NAMESPACE}:*`;
      await cacheService.deletePattern(pattern);
      logger.info('Feature access cache cleared');
      
    } catch (error) {
      logger.error('Feature access cache clear error', { error });
    }
  }

  /**
   * Update average response time metric
    */
  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.metrics.requests;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  /**
   * Reset metrics
    */
  resetMetrics(): void {
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      invalidations: 0,
      averageResponseTime: 0,
      errorRate: 0
    };
  }
}

// Export singleton instance
export const featureAccessCacheService = new FeatureAccessCacheService();