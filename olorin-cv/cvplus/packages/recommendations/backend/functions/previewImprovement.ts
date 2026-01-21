import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '@cvplus/core/config/cors';
import { 
  ImprovementOrchestrator,
  ValidationEngine
} from '../../src/services/root-enhanced';

/**
 * Firebase Function: previewImprovement
 * Generates a preview of what a single recommendation would look like when applied
 * Maximum 180 lines to comply with code standards
  */
export const previewImprovement = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    ...corsOptions,
  },
  async (request) => {
    const validator = new ValidationEngine();
    const orchestrator = new ImprovementOrchestrator();

    try {
      // Validate authentication
      const authValidation = validator.validateAuth(request);
      if (!authValidation.isValid) {
        throw new Error(authValidation.error);
      }

      // Validate request data
      const { jobId, recommendationId } = request.data;
      
      if (!jobId || !recommendationId) {
        throw new Error('Job ID and recommendation ID are required');
      }

      logger.info(`[previewImprovement] Starting for job ${jobId}, recommendation ${recommendationId}`);

      // Generate preview using orchestrator
      const result = await orchestrator.previewRecommendation(
        jobId,
        authValidation.userId,
        recommendationId
      );

      logger.info(`[previewImprovement] Completed for recommendation ${recommendationId}`);
      return result;

    } catch (error: any) {
      logger.error(`[previewImprovement] Error:`, {
        error: error.message,
        jobId: request.data?.jobId,
        recommendationId: request.data?.recommendationId,
        userId: request.auth?.uid
      });
      
      throw error;
    }
  }
);