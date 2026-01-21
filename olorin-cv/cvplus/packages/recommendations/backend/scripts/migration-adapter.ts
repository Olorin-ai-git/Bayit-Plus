/**
 * Migration Adapter for Progressive Rollout
 * 
 * Provides a controlled migration path from the violation services in
 * /functions/src/services/recommendations/ to the package-based implementation.
 * 
 * Features:
 * - Feature flags for controlled rollout
 * - Performance monitoring and comparison
 * - Automatic fallback on errors
 * - Zero-downtime migration support
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { CallableRequest } from 'firebase-functions/v2/https';
import { firebaseFunctionsAdapter } from '../../src/integration/firebase/functions-adapter';

/**
 * Feature flags for controlling migration
  */
export interface MigrationFeatureFlags {
  usePackageGetRecommendations: boolean;
  usePackageApplyImprovements: boolean;
  usePackagePreviewImprovement: boolean;
  usePackageCustomizePlaceholders: boolean;
  rolloutPercentage: number; // 0-100
  enableFallback: boolean;
  enablePerformanceComparison: boolean;
}

/**
 * Default feature flags - conservative rollout
  */
const DEFAULT_FLAGS: MigrationFeatureFlags = {
  usePackageGetRecommendations: false,
  usePackageApplyImprovements: false,
  usePackagePreviewImprovement: false,
  usePackageCustomizePlaceholders: true, // NEW functionality - enabled by default
  rolloutPercentage: 0, // 0% rollout initially
  enableFallback: true,
  enablePerformanceComparison: true
};

/**
 * Migration adapter that provides controlled rollout
  */
export class MigrationAdapter {
  private flags: MigrationFeatureFlags;

  constructor(flags?: Partial<MigrationFeatureFlags>) {
    this.flags = { ...DEFAULT_FLAGS, ...flags };
    logger.info('[MigrationAdapter] Initialized with flags:', this.flags);
  }

  /**
   * Adaptive getRecommendations with fallback
    */
  async getRecommendations(request: CallableRequest): Promise<any> {
    if (this.shouldUsePackage('usePackageGetRecommendations', request)) {
      try {
        logger.info('[MigrationAdapter] Using package implementation for getRecommendations');
        return await firebaseFunctionsAdapter.getRecommendations(request);
      } catch (error) {
        if (this.flags.enableFallback) {
          logger.warn('[MigrationAdapter] Package implementation failed, falling back to legacy:', error);
          return await this.fallbackToLegacy('getRecommendations', request);
        }
        throw error;
      }
    } else {
      logger.info('[MigrationAdapter] Using legacy implementation for getRecommendations');
      return await this.fallbackToLegacy('getRecommendations', request);
    }
  }

  /**
   * Adaptive applyImprovements with fallback
    */
  async applyImprovements(request: CallableRequest): Promise<any> {
    if (this.shouldUsePackage('usePackageApplyImprovements', request)) {
      try {
        logger.info('[MigrationAdapter] Using package implementation for applyImprovements');
        return await firebaseFunctionsAdapter.applyImprovements(request);
      } catch (error) {
        if (this.flags.enableFallback) {
          logger.warn('[MigrationAdapter] Package implementation failed, falling back to legacy:', error);
          return await this.fallbackToLegacy('applyImprovements', request);
        }
        throw error;
      }
    } else {
      logger.info('[MigrationAdapter] Using legacy implementation for applyImprovements');
      return await this.fallbackToLegacy('applyImprovements', request);
    }
  }

  /**
   * Adaptive previewImprovement with fallback
    */
  async previewImprovement(request: CallableRequest): Promise<any> {
    if (this.shouldUsePackage('usePackagePreviewImprovement', request)) {
      try {
        logger.info('[MigrationAdapter] Using package implementation for previewImprovement');
        return await firebaseFunctionsAdapter.previewImprovement(request);
      } catch (error) {
        if (this.flags.enableFallback) {
          logger.warn('[MigrationAdapter] Package implementation failed, falling back to legacy:', error);
          return await this.fallbackToLegacy('previewImprovement', request);
        }
        throw error;
      }
    } else {
      logger.info('[MigrationAdapter] Using legacy implementation for previewImprovement');
      return await this.fallbackToLegacy('previewImprovement', request);
    }
  }

  /**
   * customizePlaceholders - NEW FUNCTIONALITY (no fallback available)
    */
  async customizePlaceholders(request: CallableRequest): Promise<any> {
    if (this.shouldUsePackage('usePackageCustomizePlaceholders', request)) {
      logger.info('[MigrationAdapter] Using package implementation for customizePlaceholders (NEW)');
      return await firebaseFunctionsAdapter.customizePlaceholders(request);
    } else {
      // No legacy implementation exists - return error
      return {
        success: false,
        error: 'customizePlaceholders functionality is not available in legacy mode. Please enable package implementation.',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Determine if package implementation should be used
    */
  private shouldUsePackage(flagName: keyof MigrationFeatureFlags, request: CallableRequest): boolean {
    // Check feature flag
    if (!this.flags[flagName]) {
      return false;
    }

    // Check rollout percentage
    if (this.flags.rolloutPercentage < 100) {
      // Use user ID hash to determine if user is in rollout group
      const userId = request.auth?.uid;
      if (userId) {
        const hash = this.simpleHash(userId);
        const percentage = hash % 100;
        if (percentage >= this.flags.rolloutPercentage) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Fallback to legacy implementation
    */
  private async fallbackToLegacy(operation: string, request: CallableRequest): Promise<any> {
    try {
      // Import migrated services from local module
      const { ImprovementOrchestrator } = await import('../../src/services/root-enhanced/ImprovementOrchestrator');
      const { ValidationEngine } = await import('../../src/services/validation/ValidationEngine');
      
      const orchestrator = new ImprovementOrchestrator();
      const validator = new ValidationEngine();

      // Validate authentication
      const authValidation = validator.validateAuth(request);
      if (!authValidation.isValid) {
        throw new Error(authValidation.error);
      }

      switch (operation) {
        case 'getRecommendations':
          return await this.legacyGetRecommendations(orchestrator, request, authValidation.userId);
        
        case 'applyImprovements':
          return await this.legacyApplyImprovements(orchestrator, request, authValidation.userId);
        
        case 'previewImprovement':
          return await this.legacyPreviewImprovement(orchestrator, request, authValidation.userId);
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      logger.error(`[MigrationAdapter] Legacy fallback failed for ${operation}:`, error);
      throw error;
    }
  }

  /**
   * Legacy getRecommendations implementation
    */
  private async legacyGetRecommendations(orchestrator: any, request: CallableRequest, userId: string): Promise<any> {
    const { jobId, targetRole, industryKeywords, forceRegenerate } = request.data;
    
    return await orchestrator.generateRecommendations(
      jobId,
      userId,
      targetRole,
      industryKeywords,
      forceRegenerate
    );
  }

  /**
   * Legacy applyImprovements implementation
    */
  private async legacyApplyImprovements(orchestrator: any, request: CallableRequest, userId: string): Promise<any> {
    const { jobId, selectedRecommendationIds, targetRole, industryKeywords } = request.data;
    
    return await orchestrator.applySelectedRecommendations(
      jobId,
      userId,
      selectedRecommendationIds,
      targetRole,
      industryKeywords
    );
  }

  /**
   * Legacy previewImprovement implementation
    */
  private async legacyPreviewImprovement(orchestrator: any, request: CallableRequest, userId: string): Promise<any> {
    const { jobId, recommendationId } = request.data;
    
    return await orchestrator.previewRecommendation(
      jobId,
      userId,
      recommendationId
    );
  }

  /**
   * Simple hash function for user ID
    */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Update feature flags at runtime
    */
  updateFlags(flags: Partial<MigrationFeatureFlags>): void {
    this.flags = { ...this.flags, ...flags };
    logger.info('[MigrationAdapter] Updated flags:', this.flags);
  }

  /**
   * Get current migration status
    */
  getMigrationStatus(): {
    flags: MigrationFeatureFlags;
    packageVersion: string;
    timestamp: string;
  } {
    return {
      flags: this.flags,
      packageVersion: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const migrationAdapter = new MigrationAdapter();