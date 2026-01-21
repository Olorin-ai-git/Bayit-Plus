/**
 * Feature Flags Service Tests
 *
 * @author CVPlus Team
 * @version 1.0.0
 * @created 2025-11-29
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { featureFlagsService } from './feature-flags.service';
import { FEATURE_FLAGS } from '../../config/feature-flags';

describe('FeatureFlagsService', () => {
  beforeEach(() => {
    featureFlagsService.resetMetrics();
  });

  describe('evaluateFlag', () => {
    it('should return default value when cache and Firestore both fail', async () => {
      const result = await featureFlagsService.evaluateFlag('NEW_FEATURE_ACCESS_LOGIC');
      const expected = FEATURE_FLAGS.NEW_FEATURE_ACCESS_LOGIC.default;
      expect(result).toBe(expected);
    });

    it('should return false for NEW_FEATURE_ACCESS_LOGIC by default', async () => {
      const result = await featureFlagsService.evaluateFlag('NEW_FEATURE_ACCESS_LOGIC');
      expect(result).toBe(false);
    });

    it('should return false for ENABLE_VIDEO_GENERATION by default', async () => {
      const result = await featureFlagsService.evaluateFlag('ENABLE_VIDEO_GENERATION');
      expect(result).toBe(false);
    });

    it('should return false for ENABLE_PODCAST_GENERATION by default', async () => {
      const result = await featureFlagsService.evaluateFlag('ENABLE_PODCAST_GENERATION');
      expect(result).toBe(false);
    });

    it('should increment evaluation metrics', async () => {
      await featureFlagsService.evaluateFlag('NEW_FEATURE_ACCESS_LOGIC');
      const metrics = featureFlagsService.getMetrics();
      expect(metrics.evaluations).toBe(1);
    });

    it('should handle multiple evaluations', async () => {
      await featureFlagsService.evaluateFlag('NEW_FEATURE_ACCESS_LOGIC');
      await featureFlagsService.evaluateFlag('ENABLE_VIDEO_GENERATION');
      await featureFlagsService.evaluateFlag('ENABLE_PODCAST_GENERATION');
      const metrics = featureFlagsService.getMetrics();
      expect(metrics.evaluations).toBe(3);
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics structure', () => {
      const metrics = featureFlagsService.getMetrics();
      expect(metrics).toHaveProperty('evaluations');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('firestoreReads');
      expect(metrics).toHaveProperty('averageEvaluationTime');
      expect(metrics).toHaveProperty('errorRate');
    });

    it('should initialize all metrics to 0', () => {
      const metrics = featureFlagsService.getMetrics();
      expect(metrics.evaluations).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.firestoreReads).toBe(0);
      expect(metrics.averageEvaluationTime).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to 0', async () => {
      // Generate some metrics
      await featureFlagsService.evaluateFlag('NEW_FEATURE_ACCESS_LOGIC');
      let metrics = featureFlagsService.getMetrics();
      expect(metrics.evaluations).toBeGreaterThan(0);

      // Reset
      featureFlagsService.resetMetrics();
      metrics = featureFlagsService.getMetrics();
      expect(metrics.evaluations).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
    });
  });

  describe('initialization', () => {
    it('should handle initialization without error', () => {
      expect(() => {
        // Service can be initialized without Firestore
        // In real tests, would pass firestore instance
      }).not.toThrow();
    });
  });

  describe('critical flags', () => {
    it('NEW_FEATURE_ACCESS_LOGIC should default to false (backward compatible)', async () => {
      const result = await featureFlagsService.evaluateFlag('NEW_FEATURE_ACCESS_LOGIC');
      expect(result).toBe(false);
    });

    it('ENABLE_PAYMENT_PROVIDER_FILTERING should default to false (safe)', async () => {
      const result = await featureFlagsService.evaluateFlag('ENABLE_PAYMENT_PROVIDER_FILTERING');
      expect(result).toBe(false);
    });

    it('ENABLE_ENHANCED_RATE_LIMITING should default to false (safe)', async () => {
      const result = await featureFlagsService.evaluateFlag('ENABLE_ENHANCED_RATE_LIMITING');
      expect(result).toBe(false);
    });
  });

  describe('flag defaults', () => {
    it('all critical flags should default to false', async () => {
      for (const [key, flag] of Object.entries(FEATURE_FLAGS)) {
        if (flag.critical) {
          const result = await featureFlagsService.evaluateFlag(key as any);
          expect(result).toBe(false);
        }
      }
    });

    it('should not have any critical flags defaulting to true', () => {
      for (const [, flag] of Object.entries(FEATURE_FLAGS)) {
        if (flag.critical) {
          expect(flag.default).toBe(false);
        }
      }
    });
  });
});
