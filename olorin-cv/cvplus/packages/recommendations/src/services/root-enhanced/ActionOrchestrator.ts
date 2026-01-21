import { CVAnalyzer } from './CVAnalyzer';
import { ContentProcessor } from './ContentProcessor';
import { ValidationEngine } from './ValidationEngine';
import { TransformationApplier } from './TransformationApplier';
import { RecommendationOrchestrator } from './RecommendationOrchestrator';
import { CVRecommendation } from './compatibility';

/**
 * ActionOrchestrator - Handles CV transformation actions
 * Extracted from ImprovementOrchestrator to comply with 200-line rule
  */
export class ActionOrchestrator {
  private analyzer: CVAnalyzer;
  private processor: ContentProcessor;
  private validator: ValidationEngine;
  private applier: TransformationApplier;
  private recommendationOrchestrator: RecommendationOrchestrator;

  constructor() {
    this.analyzer = new CVAnalyzer();
    this.processor = new ContentProcessor();
    this.validator = new ValidationEngine();
    this.applier = new TransformationApplier();
    this.recommendationOrchestrator = new RecommendationOrchestrator();
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
    try {
      // Validate request
      const validation = this.validator.validateRecommendationRequest({
        jobId,
        selectedRecommendationIds
      });

      if (!validation.isValid) {
        throw new Error(validation.errors.join('; '));
      }

      // Analyze and validate job access
      const { jobData, originalCV } = await this.analyzer.validateJobAccess(jobId, userId);

      // Get and validate stored recommendations
      const storedRecommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
      
      // Generate recommendations if none exist
      if (storedRecommendations.length === 0) {
        logger.info('🔄 No stored recommendations, generating new ones');
        const result = await this.recommendationOrchestrator.generateRecommendations(
          jobId, userId, targetRole, industryKeywords
        );
        
        if (!result.success) {
          throw new Error('Failed to generate recommendations');
        }
        
        // Update stored recommendations for validation
        storedRecommendations.push(...result.data.recommendations);
      }

      // Validate selected recommendations
      const selectedRecommendations = this.analyzer.validateSelectedRecommendations(
        selectedRecommendationIds,
        storedRecommendations
      );

      // Apply transformations
      const result = await this.applier.applyRecommendationsToCV(
        jobId,
        originalCV,
        selectedRecommendations
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error: any) {
      logger.error('❌ Apply recommendations error:', error.message);
      throw new Error(`Failed to apply improvements: ${error.message}`);
    }
  }

  /**
   * Orchestrates recommendation preview generation
    */
  async previewRecommendation(
    jobId: string,
    userId: string,
    recommendationId: string
  ): Promise<any> {
    try {
      // Validate job access
      const { jobData, originalCV } = await this.analyzer.validateJobAccess(jobId, userId);
      const recommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
      
      const recommendation = recommendations.find(rec => rec.id === recommendationId);
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      // Generate preview
      const previewResult = await this.applier.generateRecommendationPreview(
        originalCV,
        recommendation
      );

      if (!previewResult.success) {
        throw new Error(previewResult.error);
      }

      return {
        success: true,
        data: previewResult.data
      };

    } catch (error: any) {
      throw new Error(`Failed to preview improvement: ${error.message}`);
    }
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
    try {
      // Validate job access
      const { jobData } = await this.analyzer.validateJobAccess(jobId, userId);
      const recommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
      
      const recIndex = recommendations.findIndex(rec => rec.id === recommendationId);
      if (recIndex === -1) {
        throw new Error('Recommendation not found');
      }

      const recommendation = recommendations[recIndex];
      
      // Process placeholders
      const customizedRecommendation = this.processor.customizeRecommendation(
        recommendation,
        placeholderValues
      );

      // Update recommendations array
      recommendations[recIndex] = customizedRecommendation;

      // Save to database
      const db = this.analyzer.getDatabase();
      await db.collection('jobs').doc(jobId).update({
        cvRecommendations: recommendations,
        lastUpdate: new Date().toISOString()
      });

      return {
        success: true,
        data: {
          recommendationId,
          customizedContent: customizedRecommendation.customizedContent,
          originalContent: recommendation.suggestedContent,
          placeholdersReplaced: Object.keys(placeholderValues).length
        }
      };

    } catch (error: any) {
      throw new Error(`Failed to customize placeholders: ${error.message}`);
    }
  }

  /**
   * Validates multiple recommendations for batch operations
    */
  async validateBatchRecommendations(
    jobId: string,
    userId: string,
    recommendationIds: string[]
  ): Promise<{
    valid: CVRecommendation[];
    invalid: string[];
    missing: string[];
  }> {
    const { jobData } = await this.analyzer.validateJobAccess(jobId, userId);
    const storedRecommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
    
    const valid: CVRecommendation[] = [];
    const invalid: string[] = [];
    const missing: string[] = [];

    for (const id of recommendationIds) {
      const recommendation = storedRecommendations.find(rec => rec.id === id);
      if (!recommendation) {
        missing.push(id);
      } else {
        const validation = this.validator.validateRecommendationRequest({ recommendationId: id });
        if (validation.isValid) {
          valid.push(recommendation);
        } else {
          invalid.push(id);
        }
      }
    }

    return { valid, invalid, missing };
  }

  /**
   * Gets processing status for a job
    */
  async getProcessingStatus(jobId: string, userId: string): Promise<any> {
    const { jobData } = await this.analyzer.validateJobAccess(jobId, userId);
    
    return {
      status: jobData?.status || 'unknown',
      processingProgress: jobData?.processingProgress,
      processingStage: jobData?.processingStage,
      totalStages: jobData?.totalStages,
      lastUpdate: jobData?.updatedAt || jobData?.lastUpdate,
      recommendationCount: jobData?.recommendationCount || 0
    };
  }
}