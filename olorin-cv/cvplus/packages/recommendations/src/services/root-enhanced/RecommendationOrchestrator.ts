import { CVAnalyzer } from './CVAnalyzer';
import { RecommendationGenerator } from './RecommendationGenerator';
import { TransformationApplier } from './TransformationApplier';
import { CacheManager } from '@cvplus/core/services/cache/CacheManager';
import { CacheKeyManager } from '@cvplus/core/services/cache/CacheKeyManager';
import { CVRecommendation } from './compatibility';
import { ParsedCV } from './compatibility';

/**
 * RecommendationOrchestrator - Handles core recommendation generation workflow
 * Extracted from ImprovementOrchestrator to comply with 200-line rule
  */
export class RecommendationOrchestrator {
  private analyzer: CVAnalyzer;
  private generator: RecommendationGenerator;
  private applier: TransformationApplier;

  // Request deduplication
  private activeRequests = new Map<string, Promise<any>>();

  constructor() {
    this.analyzer = new CVAnalyzer();
    this.generator = new RecommendationGenerator();
    this.applier = new TransformationApplier();
  }

  /**
   * Orchestrates the complete recommendation generation process
    */
  async generateRecommendations(
    jobId: string,
    userId: string,
    targetRole?: string,
    industryKeywords?: string[],
    forceRegenerate?: boolean
  ): Promise<any> {
    const startTime = Date.now();
    const requestKey = this.createRequestKey(jobId, userId, targetRole, industryKeywords, forceRegenerate);

    try {
      // Check for duplicate requests
      if (this.activeRequests.has(requestKey)) {
        logger.info('🔄 Returning cached active request');
        return await this.activeRequests.get(requestKey);
      }

      // Check multi-tier cache
      if (!forceRegenerate) {
        const cachedResult = await CacheManager.get(requestKey, 'recommendations');
        if (cachedResult) {
          logger.info('📦 Returning cached recommendation result');
          return {
            success: true,
            data: {
              ...(cachedResult as any),
              cached: true,
              cacheSource: 'memory'
            }
          };
        }
      }

      // Create execution promise with proper error handling
      const executionPromise = this.executeRecommendationGeneration(
        jobId, userId, targetRole, industryKeywords, forceRegenerate, startTime
      ).catch(error => {
        // Ensure promise rejection doesn't become unhandled
        this.activeRequests.delete(requestKey);
        throw error;
      });

      this.activeRequests.set(requestKey, executionPromise);

      // Execute and handle result
      const result = await executionPromise;

      // Cache successful result using CacheManager
      if (result.success) {
        await CacheManager.set(requestKey, result.data, 'recommendations');
      }

      // Cleanup
      this.activeRequests.delete(requestKey);
      return result;

    } catch (error: any) {
      this.activeRequests.delete(requestKey);
      await this.applier.handleProcessingError(jobId, error, startTime);
      throw this.formatError(error);
    }
  }

  /**
   * Executes the core recommendation generation logic
    */
  private async executeRecommendationGeneration(
    jobId: string,
    userId: string,
    targetRole?: string,
    industryKeywords?: string[],
    forceRegenerate?: boolean,
    startTime?: number
  ): Promise<any> {
    // Validate job access
    const { jobData, originalCV } = await this.analyzer.validateJobAccess(jobId, userId);

    // Update processing status
    await this.applier.updateProcessingStatus(jobId, 'generating_recommendations');

    // Check existing recommendations
    const existingRecommendations = jobData?.cvRecommendations || [];
    const isRecent = this.analyzer.areRecommendationsRecent(jobData?.lastRecommendationGeneration);

    if (existingRecommendations.length > 0 && isRecent && !forceRegenerate) {
      await this.applier.updateProcessingStatus(jobId, 'analyzed');
      return {
        success: true,
        data: {
          recommendations: existingRecommendations,
          cached: true,
          generatedAt: jobData?.lastRecommendationGeneration
        }
      };
    }

    // Generate new recommendations
    const { recommendations } = await this.generator.generateWithFallbacks(
      originalCV,
      targetRole,
      industryKeywords
    );

    // Validate and sanitize
    const validated = this.analyzer.validateRecommendationQuality(recommendations);
    const sanitized = this.analyzer.sanitizeRecommendationsForStorage(validated);

    // Store results
    const processingTime = startTime ? Date.now() - startTime : 0;
    await this.applier.storeRecommendations(jobId, recommendations, processingTime, sanitized);

    return {
      success: true,
      data: {
        recommendations,
        cached: false,
        generatedAt: new Date().toISOString(),
        processingTime
      }
    };
  }

  /**
   * Creates a cache key for requests
    */
  private createRequestKey(
    jobId: string,
    userId: string,
    targetRole?: string,
    industryKeywords?: string[],
    forceRegenerate?: boolean
  ): string {
    return CacheKeyManager.recommendationKey(jobId, userId, targetRole, industryKeywords, forceRegenerate);
  }

  /**
   * Formats errors for user consumption
    */
  private formatError(error: any): Error {
    if (error.message.includes('timeout')) {
      return new Error('CV analysis timed out. This usually occurs with very large or complex CVs.');
    } else if (error.message.includes('API')) {
      return new Error('AI service temporarily unavailable. Please try again in a few minutes.');
    } else {
      return new Error(`Failed to analyze CV: ${error.message}`);
    }
  }

  /**
   * Clears all active requests (for testing)
    */
  clearActiveRequests(): void {
    this.activeRequests.clear();
  }

  /**
   * Gets active request count (for monitoring)
    */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Gets active request keys (for debugging)
    */
  getActiveRequestKeys(): string[] {
    return Array.from(this.activeRequests.keys());
  }

  /**
   * Forces cleanup of a specific request
    */
  forceCleanupRequest(requestKey: string): boolean {
    return this.activeRequests.delete(requestKey);
  }
}