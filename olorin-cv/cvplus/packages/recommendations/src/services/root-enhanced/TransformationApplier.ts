import { db } from '@cvplus/core';
import { CVTransformationService, CVRecommendation, ParsedCV } from './compatibility';

/**
 * TransformationApplier - Handles application of recommendations to CV
 * Manages the process of applying selected improvements and saving results
  */
export class TransformationApplier {
  private db: FirebaseFirestore.Firestore;
  private transformationService: CVTransformationService;

  constructor() {
    this.db = db;
    this.transformationService = new CVTransformationService();
  }

  /**
   * Applies selected recommendations to a CV and saves results
    */
  async applyRecommendationsToCV(
    jobId: string,
    originalCV: ParsedCV,
    selectedRecommendations: CVRecommendation[]
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      logger.info(`🔧 Applying ${selectedRecommendations.length} recommendations to CV`);

      // Apply transformations using the service
      const transformationResult = await this.transformationService.applyRecommendations(
        originalCV,
        selectedRecommendations
      );

      // Prepare update data
      const updateData = {
        improvedCV: transformationResult.improvedCV,
        appliedRecommendations: transformationResult.appliedRecommendations,
        transformationSummary: transformationResult.transformationSummary,
        comparisonReport: transformationResult.comparisonReport,
        lastTransformation: new Date().toISOString(),
        status: 'completed',
        improvementsApplied: true,
        updatedAt: new Date()
      };

      // Save to database
      await this.db.collection('jobs').doc(jobId).update(updateData);

      logger.info(`✅ Successfully applied ${transformationResult.appliedRecommendations?.length || 0} improvements`);

      return {
        success: true,
        data: {
          jobId,
          improvedCV: transformationResult.improvedCV,
          appliedRecommendations: transformationResult.appliedRecommendations || [],
          transformationSummary: transformationResult.transformationSummary,
          comparisonReport: transformationResult.comparisonReport,
          improvementsApplied: true,
          message: `Successfully applied ${transformationResult.appliedRecommendations?.length || 0} improvements`
        }
      };
    } catch (error: any) {
      logger.error('❌ Error applying recommendations:', error.message);
      
      // Update job status to reflect error
      try {
        await this.db.collection('jobs').doc(jobId).update({
          status: 'failed',
          error: error.message,
          lastError: new Date().toISOString()
        });
      } catch (dbError) {
        logger.error('Failed to update job status after error:', dbError);
      }

      return {
        success: false,
        error: `Failed to apply improvements: ${error.message}`
      };
    }
  }

  /**
   * Generates a preview of what a single recommendation would look like when applied
    */
  async generateRecommendationPreview(
    originalCV: ParsedCV,
    recommendation: CVRecommendation
  ): Promise<{
    success: boolean;
    data?: {
      recommendation: CVRecommendation;
      beforeContent: string;
      afterContent: string;
      previewCV: ParsedCV;
      estimatedImpact: number;
    };
    error?: string;
  }> {
    try {
      logger.info(`🔍 Generating preview for recommendation: ${recommendation.title}`);

      // Apply just this single recommendation for preview
      const previewResult = await this.transformationService.applyRecommendations(
        originalCV,
        [recommendation]
      );

      return {
        success: true,
        data: {
          recommendation,
          beforeContent: recommendation.currentContent || '',
          afterContent: recommendation.suggestedContent || '',
          previewCV: previewResult.improvedCV || originalCV,
          estimatedImpact: recommendation.estimatedScoreImprovement || 0
        }
      };
    } catch (error: any) {
      logger.error('❌ Error generating preview:', error.message);
      return {
        success: false,
        error: `Failed to preview improvement: ${error.message}`
      };
    }
  }

  /**
   * Stores generated recommendations with metadata
    */
  async storeRecommendations(
    jobId: string,
    recommendations: CVRecommendation[],
    processingTime: number,
    sanitizedRecommendations: CVRecommendation[]
  ): Promise<void> {
    const now = new Date().toISOString();
    
    logger.info(`🏁 Storing ${recommendations.length} recommendations for job ${jobId}`);
    
    await this.db.collection('jobs').doc(jobId).update({
      cvRecommendations: sanitizedRecommendations,
      lastRecommendationGeneration: now,
      status: 'analyzed',
      processingTime: processingTime,
      processingCompleted: now,
      recommendationCount: recommendations.length,
      // Clear progress fields
      processingProgress: null,
      processingStage: null,
      totalStages: null,
      processingStartTime: null
    });

    logger.info('✅ Recommendations stored successfully');
  }

  /**
   * Updates job status during processing
    */
  async updateProcessingStatus(
    jobId: string,
    status: string,
    progress?: string,
    stage?: number,
    totalStages?: number
  ): Promise<void> {
    const updateData: any = { status };
    
    if (progress) updateData.processingProgress = progress;
    if (stage) updateData.processingStage = stage;
    if (totalStages) updateData.totalStages = totalStages;
    
    try {
      await this.db.collection('jobs').doc(jobId).update(updateData);
    } catch (error) {
      logger.warn('Failed to update processing status:', error);
    }
  }

  /**
   * Handles error states and updates job status accordingly
    */
  async handleProcessingError(
    jobId: string,
    error: any,
    startTime: number
  ): Promise<void> {
    const processingTime = Date.now() - startTime;
    
    try {
      await this.db.collection('jobs').doc(jobId).update({
        status: 'failed',
        error: error.message,
        lastError: new Date().toISOString(),
        processingProgress: null,
        processingStage: null,
        totalStages: null,
        processingStartTime: null,
        failureReason: error.message.includes('timeout') ? 'timeout' : 'processing_error',
        processingTime
      });
    } catch (dbError) {
      logger.error('Failed to update job status after error:', dbError);
    }
  }

  /**
   * Cleans up temporary processing data
    */
  async cleanupProcessingData(jobId: string): Promise<void> {
    try {
      await this.db.collection('jobs').doc(jobId).update({
        processingProgress: null,
        processingStage: null,
        totalStages: null,
        processingStartTime: null
      });
    } catch (error) {
      logger.warn('Failed to cleanup processing data:', error);
    }
  }
}