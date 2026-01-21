import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '@cvplus/core/config/cors';
import { 
  ImprovementOrchestrator,
  ValidationEngine
} from '../../src/services/root-enhanced';

/**
 * Firebase Function: applyImprovements
 * Applies selected CV recommendations and saves improved CV
 * Maximum 180 lines to comply with code standards
  */
export const applyImprovements = onCall(
  {
    timeoutSeconds: 180,
    memory: '1GiB',
    ...corsOptions,
  },
  async (request) => {
    const validator = new ValidationEngine();
    const orchestrator = new ImprovementOrchestrator();
    const startTime = Date.now();

    try {
      // Validate authentication
      const authValidation = validator.validateAuth(request);
      if (!authValidation.isValid) {
        throw new Error(authValidation.error);
      }

      // Validate request data
      const { jobId, selectedRecommendationIds, targetRole, industryKeywords } = request.data;
      const requestValidation = validator.validateRecommendationRequest({
        jobId,
        selectedRecommendationIds
      });
      if (!requestValidation.isValid) {
        throw new Error(requestValidation.errors.join('; '));
      }

      logger.info(`[applyImprovements] Starting for job ${jobId}`, {
        userId: authValidation.userId,
        selectedCount: selectedRecommendationIds.length,
        targetRole,
        timestamp: new Date().toISOString()
      });

      // Apply recommendations using orchestrator
      const result = await orchestrator.applySelectedRecommendations(
        jobId,
        authValidation.userId,
        selectedRecommendationIds,
        targetRole,
        industryKeywords
      );

      const processingTime = Date.now() - startTime;
      logger.info(`[applyImprovements] Completed for job ${jobId}`, {
        success: result.success,
        appliedCount: result.data?.appliedRecommendations?.length || 0,
        processingTime
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error(`[applyImprovements] Error for job ${request.data?.jobId}:`, {
        error: error.message,
        userId: request.auth?.uid,
        processingTime
      });
      
      throw error;
    }
  }
);