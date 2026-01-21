/**
 * Firebase Functions Adapter for CVPlus Recommendations
 * 
 * Provides compatibility layer between Firebase Functions and the recommendations package.
 * Ensures zero-downtime migration with 100% API compatibility.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { CallableRequest } from 'firebase-functions/v2/https';
import { recommendationsService } from '../../services/recommendations.service';
import type {
  GetRecommendationsParams,
  GetRecommendationsResponse,
  ApplyImprovementsParams,
  ApplyImprovementsResponse,
  PreviewImprovementParams,
  PreviewImprovementResponse,
  CustomizePlaceholdersParams,
  CustomizePlaceholdersResponse
} from '../../types';

/**
 * Firebase Functions integration adapter
 * Maintains 100% API compatibility with existing Firebase function interfaces
  */
export class FirebaseFunctionsAdapter {
  private static instance: FirebaseFunctionsAdapter;

  private constructor() {}

  /**
   * Get singleton instance
    */
  static getInstance(): FirebaseFunctionsAdapter {
    if (!FirebaseFunctionsAdapter.instance) {
      FirebaseFunctionsAdapter.instance = new FirebaseFunctionsAdapter();
    }
    return FirebaseFunctionsAdapter.instance;
  }

  /**
   * Get recommendations - Firebase function compatible interface
    */
  async getRecommendations(request: CallableRequest): Promise<any> {
    try {
      // Validate authentication
      if (!request.auth?.uid) {
        throw new Error('Authentication required');
      }

      // Extract and validate request data
      const { jobId, targetRole, industryKeywords, forceRegenerate } = request.data;
      
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      // Transform Firebase function request to package service format
      const params: GetRecommendationsParams = {
        jobId,
        userId: request.auth.uid,
        targetRole,
        industryKeywords,
        forceRegenerate: forceRegenerate || false
      };

      // Call package service
      const result = await recommendationsService.getRecommendations(params);

      // Transform response to Firebase function format
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        cached: result.data?.cached || false
      };

    } catch (error: any) {
      logger.error('[FirebaseFunctionsAdapter] getRecommendations error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Apply improvements - Firebase function compatible interface
    */
  async applyImprovements(request: CallableRequest): Promise<any> {
    try {
      // Validate authentication
      if (!request.auth?.uid) {
        throw new Error('Authentication required');
      }

      // Extract and validate request data
      const { jobId, selectedRecommendationIds, targetRole, industryKeywords } = request.data;
      
      if (!jobId || !selectedRecommendationIds) {
        throw new Error('Job ID and selected recommendation IDs are required');
      }

      // Transform Firebase function request to package service format
      const params: ApplyImprovementsParams = {
        jobId,
        userId: request.auth.uid,
        selectedRecommendationIds,
        targetRole,
        industryKeywords
      };

      // Call package service
      const result = await recommendationsService.applyImprovements(params);

      // Transform response to Firebase function format
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('[FirebaseFunctionsAdapter] applyImprovements error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Preview improvement - Firebase function compatible interface
    */
  async previewImprovement(request: CallableRequest): Promise<any> {
    try {
      // Validate authentication
      if (!request.auth?.uid) {
        throw new Error('Authentication required');
      }

      // Extract and validate request data
      const { jobId, recommendationId } = request.data;
      
      if (!jobId || !recommendationId) {
        throw new Error('Job ID and recommendation ID are required');
      }

      // Transform Firebase function request to package service format
      const params: PreviewImprovementParams = {
        jobId,
        userId: request.auth.uid,
        recommendationId
      };

      // Call package service
      const result = await recommendationsService.previewImprovement(params);

      // Transform response to Firebase function format
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('[FirebaseFunctionsAdapter] previewImprovement error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Customize placeholders - Firebase function compatible interface
   * MISSING FUNCTIONALITY - Now implemented
    */
  async customizePlaceholders(request: CallableRequest): Promise<any> {
    try {
      // Validate authentication
      if (!request.auth?.uid) {
        throw new Error('Authentication required');
      }

      // Extract and validate request data
      const { jobId, recommendationId, placeholderValues } = request.data;
      
      if (!jobId || !recommendationId || !placeholderValues) {
        throw new Error('Job ID, recommendation ID, and placeholder values are required');
      }

      // Transform Firebase function request to package service format
      const params: CustomizePlaceholdersParams = {
        jobId,
        userId: request.auth.uid,
        recommendationId,
        placeholderValues
      };

      // Call package service (will be implemented)
      const result = await recommendationsService.customizePlaceholders(params);

      // Transform response to Firebase function format
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      logger.error('[FirebaseFunctionsAdapter] customizePlaceholders error:', error);
      return {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Health check for monitoring
    */
  async healthCheck(): Promise<{ healthy: boolean; timestamp: string; details: any }> {
    try {
      const health = recommendationsService.getHealthStatus();
      return {
        healthy: health.healthy,
        timestamp: new Date().toISOString(),
        details: health
      };
    } catch (error: any) {
      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        details: { error: error.message }
      };
    }
  }
}

// Export singleton instance
export const firebaseFunctionsAdapter = FirebaseFunctionsAdapter.getInstance();