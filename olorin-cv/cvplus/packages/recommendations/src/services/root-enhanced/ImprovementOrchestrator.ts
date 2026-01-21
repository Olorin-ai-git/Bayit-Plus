import { RecommendationOrchestrator } from './RecommendationOrchestrator';
import { ActionOrchestrator } from './ActionOrchestrator';

/**
 * ImprovementOrchestrator - Main coordinator for all recommendation operations
 * Delegates to specialized orchestrators to comply with 200-line rule
  */
export class ImprovementOrchestrator {
  private recommendationOrchestrator: RecommendationOrchestrator;
  private actionOrchestrator: ActionOrchestrator;

  constructor() {
    this.recommendationOrchestrator = new RecommendationOrchestrator();
    this.actionOrchestrator = new ActionOrchestrator();
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
    return this.recommendationOrchestrator.generateRecommendations(
      jobId, userId, targetRole, industryKeywords, forceRegenerate
    );
  }

  /**
   * Orchestrates the application of selected recommendations
    */
  async applySelectedRecommendations(
    jobId: string,
    userId: string,
    selectedRecommendationIds: string[],
    targetRole?: string,
    industryKeywords?: string[]
  ): Promise<any> {
    return this.actionOrchestrator.applySelectedRecommendations(
      jobId, userId, selectedRecommendationIds, targetRole, industryKeywords
    );
  }

  /**
   * Orchestrates recommendation preview generation
    */
  async previewRecommendation(
    jobId: string,
    userId: string,
    recommendationId: string
  ): Promise<any> {
    return this.actionOrchestrator.previewRecommendation(jobId, userId, recommendationId);
  }

  /**
   * Orchestrates placeholder customization
    */
  async customizePlaceholders(
    jobId: string,
    userId: string,
    recommendationId: string,
    placeholderValues: any
  ): Promise<any> {
    return this.actionOrchestrator.customizePlaceholders(
      jobId, userId, recommendationId, placeholderValues
    );
  }

  /**
   * Gets processing status for a job
    */
  async getProcessingStatus(jobId: string, userId: string): Promise<any> {
    return this.actionOrchestrator.getProcessingStatus(jobId, userId);
  }

  /**
   * Validates multiple recommendations for batch operations
    */
  async validateBatchRecommendations(
    jobId: string,
    userId: string,
    recommendationIds: string[]
  ): Promise<any> {
    return this.actionOrchestrator.validateBatchRecommendations(jobId, userId, recommendationIds);
  }

  /**
   * Clears active requests (for testing and monitoring)
    */
  clearActiveRequests(): void {
    this.recommendationOrchestrator.clearActiveRequests();
  }

  /**
   * Gets active request count (for monitoring)
    */
  getActiveRequestCount(): number {
    return this.recommendationOrchestrator.getActiveRequestCount();
  }

  /**
   * Gets active request keys (for debugging)
    */
  getActiveRequestKeys(): string[] {
    return this.recommendationOrchestrator.getActiveRequestKeys();
  }

  /**
   * Forces cleanup of a specific request
    */
  forceCleanupRequest(requestKey: string): boolean {
    return this.recommendationOrchestrator.forceCleanupRequest(requestKey);
  }
}