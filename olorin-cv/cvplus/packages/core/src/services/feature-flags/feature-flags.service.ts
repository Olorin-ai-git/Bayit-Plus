/**
 * Feature Flags Service for CVPlus
 *
 * Manages feature flag evaluation with Firestore persistence and in-memory caching.
 * Supports kill-switch pattern for safe breaking change rollouts.
 *
 * @author CVPlus Team
 * @version 1.0.0
 * @created 2025-11-29
 */

import { logger } from 'firebase-functions';
import { firestore } from 'firebase-admin';
import { cacheService } from '../cache/cache.service';
import { FEATURE_FLAGS, FeatureFlagKey, getFeatureFlagDefault } from '../../config/feature-flags';

export interface FeatureFlagValue {
  key: string;
  enabled: boolean;
  lastUpdated: number;
  updatedBy?: string;
  reason?: string;
  rolloutPercentage?: number;
}

export interface FeatureFlagMetrics {
  evaluations: number;
  cacheHits: number;
  cacheMisses: number;
  firestoreReads: number;
  averageEvaluationTime: number;
  errorRate: number;
}

class FeatureFlagsService {
  private readonly CACHE_TTL = 60; // 1 minute - aggressive refresh for critical flags
  private readonly CACHE_NAMESPACE = 'feature_flags';
  private readonly FIRESTORE_COLLECTION = 'feature_flags';
  private db: firestore.Firestore | null = null;
  private metrics: FeatureFlagMetrics = {
    evaluations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    firestoreReads: 0,
    averageEvaluationTime: 0,
    errorRate: 0,
  };

  /**
   * Initialize the service with Firestore instance
   */
  initialize(firestoreInstance: firestore.Firestore): void {
    this.db = firestoreInstance;
    logger.info('Feature flags service initialized');
  }

  /**
   * Evaluate a feature flag - returns boolean value
   * Falls back to default if Firestore unavailable
   */
  async evaluateFlag(flagKey: FeatureFlagKey, userId?: string): Promise<boolean> {
    const startTime = Date.now();
    this.metrics.evaluations++;

    try {
      // Try cache first
      const cacheKey = `${this.CACHE_NAMESPACE}:${flagKey}`;
      const cached = await cacheService.get<FeatureFlagValue>(cacheKey);

      if (cached.cached && cached.value) {
        this.metrics.cacheHits++;
        this.updateAverageEvaluationTime(Date.now() - startTime);
        return cached.value.enabled;
      }

      // Cache miss - fetch from Firestore
      this.metrics.cacheMisses++;
      const value = await this.getFlagFromFirestore(flagKey);

      if (value) {
        this.metrics.firestoreReads++;
        // Cache the result
        await cacheService.set(cacheKey, value, { ttl: this.CACHE_TTL });
      }

      this.updateAverageEvaluationTime(Date.now() - startTime);
      return value ? value.enabled : getFeatureFlagDefault(flagKey);
    } catch (error) {
      this.metrics.errorRate++;
      logger.error('Feature flag evaluation error', {
        flagKey,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail safe - return default value
      return getFeatureFlagDefault(flagKey);
    }
  }

  /**
   * Get feature flag with metadata
   */
  async getFlagValue(flagKey: FeatureFlagKey): Promise<FeatureFlagValue | null> {
    try {
      const cacheKey = `${this.CACHE_NAMESPACE}:${flagKey}`;
      const cached = await cacheService.get<FeatureFlagValue>(cacheKey);

      if (cached.cached && cached.value) {
        return cached.value;
      }

      const value = await this.getFlagFromFirestore(flagKey);
      if (value) {
        await cacheService.set(cacheKey, value, { ttl: this.CACHE_TTL });
      }
      return value;
    } catch (error) {
      logger.error('Get flag value error', { flagKey, error });
      return null;
    }
  }

  /**
   * Set feature flag value in Firestore
   */
  async setFlagValue(
    flagKey: string,
    enabled: boolean,
    updatedBy: string,
    reason?: string
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Feature flags service not initialized');
    }

    try {
      const value: FeatureFlagValue = {
        key: flagKey,
        enabled,
        lastUpdated: Date.now(),
        updatedBy,
        reason,
      };

      await this.db.collection(this.FIRESTORE_COLLECTION).doc(flagKey).set(value);

      // Invalidate cache
      const cacheKey = `${this.CACHE_NAMESPACE}:${flagKey}`;
      await cacheService.delete(cacheKey);

      logger.info('Feature flag updated', {
        flagKey,
        enabled,
        updatedBy,
        reason,
      });
    } catch (error) {
      logger.error('Set flag value error', {
        flagKey,
        enabled,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch flag value from Firestore
   */
  private async getFlagFromFirestore(flagKey: FeatureFlagKey): Promise<FeatureFlagValue | null> {
    if (!this.db) {
      return null;
    }

    try {
      const doc = await this.db
        .collection(this.FIRESTORE_COLLECTION)
        .doc(flagKey as string)
        .get();

      if (doc.exists) {
        return doc.data() as FeatureFlagValue;
      }

      return null;
    } catch (error) {
      logger.error('Firestore fetch error', {
        flagKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Initialize all feature flags with defaults in Firestore
   * Safe to call multiple times - only initializes missing flags
   */
  async initializeDefaults(): Promise<void> {
    if (!this.db) {
      throw new Error('Feature flags service not initialized');
    }

    try {
      const batch = this.db.batch();
      const now = Date.now();

      for (const [, flag] of Object.entries(FEATURE_FLAGS)) {
        const flagKey = flag.key;
        const docRef = this.db.collection(this.FIRESTORE_COLLECTION).doc(flagKey);
        const doc = await docRef.get();

        // Only set if doesn't exist
        if (!doc.exists) {
          batch.set(docRef, {
            key: flagKey,
            enabled: flag.default,
            lastUpdated: now,
            updatedBy: 'system',
            reason: 'Initialized with default value',
          } as FeatureFlagValue);
        }
      }

      await batch.commit();
      logger.info('Feature flags defaults initialized');
    } catch (error) {
      logger.error('Initialize defaults error', { error });
      throw error;
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<Record<string, FeatureFlagValue>> {
    if (!this.db) {
      return {};
    }

    try {
      const snapshot = await this.db.collection(this.FIRESTORE_COLLECTION).get();
      const flags: Record<string, FeatureFlagValue> = {};

      snapshot.docs.forEach((doc) => {
        flags[doc.id] = doc.data() as FeatureFlagValue;
      });

      return flags;
    } catch (error) {
      logger.error('Get all flags error', { error });
      return {};
    }
  }

  /**
   * Clear all cache for feature flags
   */
  async clearCache(): Promise<void> {
    try {
      const pattern = `${this.CACHE_NAMESPACE}:*`;
      await cacheService.deletePattern(pattern);
      logger.info('Feature flags cache cleared');
    } catch (error) {
      logger.error('Clear cache error', { error });
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): FeatureFlagMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      evaluations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      firestoreReads: 0,
      averageEvaluationTime: 0,
      errorRate: 0,
    };
  }

  /**
   * Update average evaluation time metric
   */
  private updateAverageEvaluationTime(evaluationTime: number): void {
    const totalEvaluations = this.metrics.evaluations;
    this.metrics.averageEvaluationTime =
      (this.metrics.averageEvaluationTime * (totalEvaluations - 1) + evaluationTime) /
      totalEvaluations;
  }
}

// Export singleton instance
export const featureFlagsService = new FeatureFlagsService();
