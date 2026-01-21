import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '@cvplus/core/config/cors';
import { 
  ImprovementOrchestrator,
  ValidationEngine
} from '../../src/services/root-enhanced';

/**
 * Firebase Function: customizePlaceholders
 * Customizes recommendation placeholders with user-provided values
 * Maximum 180 lines to comply with code standards
  */
export const customizePlaceholders = onCall(
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
      const { jobId, recommendationId, placeholderValues } = request.data;
      
      if (!jobId || !recommendationId || !placeholderValues) {
        throw new Error('Job ID, recommendation ID, and placeholder values are required');
      }

      logger.info(`[customizePlaceholders] Starting for job ${jobId}, recommendation ${recommendationId}`);

      // Customize placeholders using orchestrator
      const result = await orchestrator.customizePlaceholders(
        jobId,
        authValidation.userId,
        recommendationId,
        placeholderValues
      );

      logger.info(`[customizePlaceholders] Completed for recommendation ${recommendationId}`);
      return result;

    } catch (error: any) {
      logger.error(`[customizePlaceholders] Error:`, {
        error: error.message,
        jobId: request.data?.jobId,
        recommendationId: request.data?.recommendationId,
        userId: request.auth?.uid
      });
      
      throw error;
    }
  }
);