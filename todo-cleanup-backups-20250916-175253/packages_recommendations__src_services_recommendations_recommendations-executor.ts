/**
 * @cvplus/recommendations - Recommendations Executor
 * 
 * Handles execution of recommendation operations including Firebase function calls,
 * parameter validation, and response processing. Separates execution logic from orchestration.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

// TODO: Placeholder customization service needs to be reimplemented
import { RecommendationErrorType } from '../../types';
import type {
  GetRecommendationsParams,
  GetRecommendationsResponse,
  ApplyImprovementsParams,
  ApplyImprovementsResponse,
  PreviewImprovementParams,
  PreviewImprovementResponse,
  CustomizePlaceholdersParams,
  CustomizePlaceholdersResponse,
  RecommendationError
} from '../../types';

// ============================================================================
// RECOMMENDATIONS EXECUTOR
// ============================================================================

export class RecommendationsExecutor {
  // TODO: Placeholder service will be reimplemented
  // private placeholderService: PlaceholderCustomizationService;

  constructor() {
    // this.placeholderService = new PlaceholderCustomizationService();
  }

  /**
   * Execute recommendation generation via Firebase function
    */
  async executeRecommendationGeneration(
    params: GetRecommendationsParams,
    requestId: string
  ): Promise<GetRecommendationsResponse> {
    console.log(`[RecommendationsExecutor] Executing recommendation generation for ${requestId}`);
    
    // Import Firebase dynamically to avoid build issues
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const getRecommendations = httpsCallable(functions, 'getRecommendations');

    const result = await getRecommendations({
      jobId: params.jobId,
      targetRole: params.targetRole,
      industryKeywords: params.industryKeywords,
      forceRegenerate: params.forceRegenerate
    });

    // Validate response structure
    if (!result.data || typeof result.data !== 'object') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Invalid response from recommendation service',
        false,
        { params, response: result }
      );
    }

    const responseData = result.data as any;
    
    return {
      success: true,
      data: {
        recommendations: responseData.data?.recommendations || responseData.recommendations || [],
        cached: false,
        generatedAt: new Date().toISOString(),
        processingTime: responseData.data?.processingTime || 0
      },
      timestamp: Date.now()
    };
  }

  /**
   * Execute improvement application via Firebase function
    */
  async executeImprovementApplication(
    params: ApplyImprovementsParams,
    requestId: string
  ): Promise<ApplyImprovementsResponse> {
    console.log(`[RecommendationsExecutor] Executing improvement application for ${requestId}`);
    
    // Validate parameters
    this.validateApplyImprovementsParams(params);
    
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const applyImprovements = httpsCallable(functions, 'applyImprovements');

    const result = await applyImprovements({
      jobId: params.jobId,
      selectedRecommendationIds: params.selectedRecommendationIds,
      targetRole: params.targetRole,
      industryKeywords: params.industryKeywords
    });

    const responseData = result.data as any;
    
    if (!responseData.success) {
      throw this.createError(
        RecommendationErrorType.AI_API_ERROR,
        responseData.error || 'Failed to apply improvements',
        true,
        { params, response: responseData }
      );
    }

    return {
      success: true,
      data: responseData.data,
      timestamp: Date.now()
    };
  }

  /**
   * Execute preview generation via Firebase function
    */
  async executePreviewGeneration(
    params: PreviewImprovementParams,
    requestId: string
  ): Promise<PreviewImprovementResponse> {
    console.log(`[RecommendationsExecutor] Executing preview generation for ${requestId}`);
    
    // Validate parameters
    this.validatePreviewImprovementParams(params);
    
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const previewImprovement = httpsCallable(functions, 'previewImprovement');

    const result = await previewImprovement({
      jobId: params.jobId,
      recommendationId: params.recommendationId
    });

    const responseData = result.data as any;
    
    return {
      success: true,
      data: responseData.data,
      timestamp: Date.now()
    };
  }

  /**
   * Execute placeholder customization - direct implementation (no Firebase call needed)
    */
  async executePlaceholderCustomization(
    params: CustomizePlaceholdersParams,
    requestId: string
  ): Promise<CustomizePlaceholdersResponse> {
    console.log(`[RecommendationsExecutor] Executing placeholder customization for ${requestId}`);
    
    // Validate parameters
    this.validateCustomizePlaceholdersParams(params);
    
    try {
      // Use our direct implementation instead of Firebase function
      // TODO: Implement placeholder customization
      const result = { success: false, error: 'Placeholder customization not yet implemented' };

      return {
        success: true,
        data: result,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`[RecommendationsExecutor] Placeholder customization failed for ${requestId}:`, error);
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        error instanceof Error ? error.message : 'Failed to customize placeholders',
        true,
        { params, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // ============================================================================
  // PARAMETER VALIDATION
  // ============================================================================

  /**
   * Validate parameters for getRecommendations
    */
  private validateGetRecommendationsParams(params: GetRecommendationsParams): void {
    if (!params.jobId || params.jobId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Job ID is required and cannot be empty',
        false,
        { params }
      );
    }

    if (params.industryKeywords && !Array.isArray(params.industryKeywords)) {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Industry keywords must be an array',
        false,
        { params }
      );
    }

    if (params.targetRole && typeof params.targetRole !== 'string') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Target role must be a string',
        false,
        { params }
      );
    }
  }

  /**
   * Validate parameters for applyImprovements
    */
  private validateApplyImprovementsParams(params: ApplyImprovementsParams): void {
    if (!params.jobId || params.jobId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Job ID is required and cannot be empty',
        false,
        { params }
      );
    }

    if (!params.selectedRecommendationIds || !Array.isArray(params.selectedRecommendationIds)) {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Selected recommendation IDs must be provided as an array',
        false,
        { params }
      );
    }

    if (params.selectedRecommendationIds.length === 0) {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'At least one recommendation ID must be selected',
        false,
        { params }
      );
    }

    // Validate each recommendation ID
    for (const id of params.selectedRecommendationIds) {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw this.createError(
          RecommendationErrorType.VALIDATION_ERROR,
          'All recommendation IDs must be non-empty strings',
          false,
          { params, invalidId: id }
        );
      }
    }
  }

  /**
   * Validate parameters for previewImprovement
    */
  private validatePreviewImprovementParams(params: PreviewImprovementParams): void {
    if (!params.jobId || params.jobId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Job ID is required and cannot be empty',
        false,
        { params }
      );
    }

    if (!params.recommendationId || params.recommendationId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Recommendation ID is required and cannot be empty',
        false,
        { params }
      );
    }
  }

  /**
   * Validate parameters for customizePlaceholders
    */
  private validateCustomizePlaceholdersParams(params: CustomizePlaceholdersParams): void {
    if (!params.jobId || params.jobId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Job ID is required and cannot be empty',
        false,
        { params }
      );
    }

    if (!params.recommendationId || params.recommendationId.trim() === '') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Recommendation ID is required and cannot be empty',
        false,
        { params }
      );
    }

    if (!params.placeholderValues || typeof params.placeholderValues !== 'object') {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'Placeholder values must be provided as an object',
        false,
        { params }
      );
    }

    if (Object.keys(params.placeholderValues).length === 0) {
      throw this.createError(
        RecommendationErrorType.VALIDATION_ERROR,
        'At least one placeholder value must be provided',
        false,
        { params }
      );
    }

    // Validate each placeholder value
    for (const [key, value] of Object.entries(params.placeholderValues)) {
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw this.createError(
          RecommendationErrorType.VALIDATION_ERROR,
          'All placeholder keys must be non-empty strings',
          false,
          { params, invalidKey: key }
        );
      }
      
      if (value !== null && value !== undefined && typeof value !== 'string') {
        throw this.createError(
          RecommendationErrorType.VALIDATION_ERROR,
          'All placeholder values must be strings, null, or undefined',
          false,
          { params, invalidKey: key, invalidValue: value }
        );
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Create a standardized recommendation error
    */
  private createError(
    type: RecommendationErrorType,
    message: string,
    retryable: boolean,
    context: Record<string, unknown>
  ): RecommendationError {
    const error = new Error(message) as RecommendationError;
    error.type = type;
    error.retryable = retryable;
    error.context = context;
    error.timestamp = new Date();
    return error;
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
    */
  private sanitizeParamsForLogging(params: any): any {
    const sanitized = { ...params };
    
    // Remove or mask sensitive fields if any
    if (sanitized.userId) {
      sanitized.userId = sanitized.userId.substring(0, 8) + '***';
    }
    
    return sanitized;
  }

  /**
   * Check if Firebase functions are available
    */
  async checkFirebaseFunctionsAvailability(): Promise<boolean> {
    try {
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions();
      return !!functions;
    } catch (error) {
      console.error('[RecommendationsExecutor] Firebase functions not available:', error);
      return false;
    }
  }

  /**
   * Get execution context for debugging
    */
  getExecutionContext(requestId: string): {
    requestId: string;
    timestamp: number;
    environment: string;
  } {
    return {
      requestId,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
}