import { onCall } from 'firebase-functions/v2/https';
import { corsOptions } from '@cvplus/core/config/cors';
import { 
  AIIntegrationService,
  RecommendationEngineService,
  CareerDevelopmentService,
  ValidationEngine,
  ImprovementOrchestrator
} from '../../src/services/root-enhanced';
// Note: Requires proper service injection when job processing service is available
import { getFirestore } from 'firebase-admin/firestore';
import type { CVParsedData } from '@cvplus/core';

/**
 * Firebase Function: getRecommendations
 * Generates AI-powered CV improvement recommendations with caching and error handling
 * Maximum 180 lines to comply with code standards
  */
export const getRecommendations = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    concurrency: 10,
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
      const { jobId, targetRole, industryKeywords, forceRegenerate } = request.data;
      const requestValidation = validator.validateRecommendationRequest({ jobId });
      if (!requestValidation.isValid) {
        throw new Error(requestValidation.errors.join('; '));
      }

      logger.info(`[getRecommendations] Starting for job ${jobId}`, {
        userId: authValidation.userId,
        targetRole,
        industryKeywords,
        forceRegenerate,
        timestamp: new Date().toISOString()
      });

      // Initialize AI-powered recommendation services
      const aiService = new AIIntegrationService();
      const recommendationEngine = new RecommendationEngineService({ aiService });
      const careerService = new CareerDevelopmentService();

      // Get CV data for the job
      const db = getFirestore();
      const jobDoc = await db.collection('jobs').doc(jobId).get();

      if (!jobDoc.exists) {
        throw new Error(`Job ${jobId} not found`);
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== authValidation.userId) {
        throw new Error('Unauthorized access to job');
      }

      const cvData: CVParsedData = jobData?.parsedData;
      if (!cvData) {
        throw new Error(`CV data not found for job ${jobId}`);
      }

      logger.info(`[getRecommendations] Analyzing CV with ${cvData.workExperience.length} experience entries`);

      // Generate comprehensive recommendations
      const analysisResult = await recommendationEngine.analyzeCVComprehensively(
        cvData,
        targetRole,
        industryKeywords
      );

      // Get career insights if target role specified
      let careerInsights = [];
      if (targetRole) {
        const roleCompatibility = await recommendationEngine.analyzeRoleCompatibility(
          cvData,
          targetRole,
          industryKeywords
        );
        
        careerInsights = await careerService.getCareerInsights(
          cvData,
          recommendationEngine.detectIndustry?.(cvData)
        );
      }

      // Prepare result
      const result = {
        success: true,
        data: {
          recommendations: analysisResult.recommendations,
          overallScore: analysisResult.overallScore,
          sectionScores: analysisResult.sectionScores,
          strengths: analysisResult.strengths,
          weaknesses: analysisResult.weaknesses,
          missingElements: analysisResult.missingElements,
          atsCompatibility: analysisResult.atsCompatibility,
          careerInsights: careerInsights.slice(0, 5), // Top 5 insights
          cached: false,
          generatedAt: new Date().toISOString(),
          processingTime: analysisResult.processingTime
        },
        timestamp: Date.now()
      };

      const processingTime = Date.now() - startTime;
      logger.info(`[getRecommendations] Completed for job ${jobId}`, {
        success: result.success,
        recommendationCount: result.data?.recommendations?.length || 0,
        processingTime,
        cached: result.data?.cached || false
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error(`[getRecommendations] Error for job ${request.data?.jobId}:`, {
        error: error.message,
        stack: error.stack,
        userId: request.auth?.uid,
        processingTime
      });
      
      // Return formatted error
      throw error;
    }
  }
);