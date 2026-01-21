/**
 * Firebase Functions: Recommendations Package Integration
 * 
 * Export all Firebase functions that use the @cvplus/recommendations package.
 * These provide 100% API compatibility with existing functions while using
 * the optimized package implementation.
 * 
 * MIGRATION STRATEGY:
 * 1. Phase 1: Deploy these functions alongside existing ones
 * 2. Phase 2: Switch traffic gradually using feature flags
 * 3. Phase 3: Replace old functions completely
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// Core recommendation functions
export { getRecommendations } from './getRecommendations';
export { applyImprovements } from './applyImprovements';
export { previewImprovement } from './previewImprovement';

// NEW FUNCTIONALITY - Missing placeholder customization
export { customizePlaceholders } from './customizePlaceholders';

// Re-export the adapter for direct use if needed
export { firebaseFunctionsAdapter } from '../../src/integration/firebase/functions-adapter';

/**
 * Health check function for the recommendations package
  */
import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '@cvplus/core/config/cors';

export const recommendationsHealthCheck = onCall(
  {
    timeoutSeconds: 10,
    memory: '256MiB',
    ...corsOptions,
  },
  async () => {
    try {
      const health = await firebaseFunctionsAdapter.healthCheck();
      return {
        success: true,
        data: {
          service: '@cvplus/recommendations',
          version: '1.0.0',
          ...health
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Health check failed',
        timestamp: new Date().toISOString()
      };
    }
  }
);

/**
 * Migration utilities for progressive rollout
  */
export const MIGRATION_CONFIG = {
  packageVersion: '1.0.0',
  compatibilityMode: true,
  featureFlags: {
    usePackageGetRecommendations: false,
    usePackageApplyImprovements: false,
    usePackagePreviewImprovement: false,
    usePackageCustomizePlaceholders: true // NEW - enabled by default
  },
  performance: {
    targetResponseTime: 30000, // 30 seconds
    targetCacheHitRate: 0.6,   // 60%
    targetErrorRate: 0.02      // 2%
  }
};