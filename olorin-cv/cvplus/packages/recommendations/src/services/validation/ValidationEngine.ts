/**
 * ValidationEngine - Orchestrates validation using specialized validators
 * Refactored to use composition instead of monolithic implementation
  */
import { RequestValidator } from './RequestValidator';
import { AuthValidator } from '@cvplus/auth/firebase';
import { RecommendationValidator } from './RecommendationValidator';
import { CVValidator } from './CVValidator';
import { CVRecommendation, ParsedCV } from '../root-enhanced/compatibility';

export class ValidationEngine {
  private requestValidator: RequestValidator;
  private authValidator: AuthValidator;
  private recommendationValidator: RecommendationValidator;
  private cvValidator: CVValidator;

  constructor() {
    this.requestValidator = new RequestValidator();
    this.authValidator = new AuthValidator();
    this.recommendationValidator = new RecommendationValidator();
    this.cvValidator = new CVValidator();
  }

  /**
   * Validates request parameters for recommendation operations
    */
  validateRecommendationRequest(data: any) {
    return this.requestValidator.validateRecommendationRequest(data);
  }

  /**
   * Validates Firebase Functions authentication context
    */
  validateAuth(request: any) {
    return this.authValidator.validateAuth(request);
  }

  /**
   * Validates a single recommendation object
    */
  validateSingleRecommendation(rec: CVRecommendation) {
    return this.recommendationValidator.validateSingleRecommendation(rec);
  }

  /**
   * Validates an array of recommendations
    */
  validateRecommendations(recommendations: CVRecommendation[]) {
    return this.recommendationValidator.validateRecommendations(recommendations);
  }

  /**
   * Validates CV structure and data quality
    */
  validateCVStructure(cv: ParsedCV) {
    return this.cvValidator.validateCVStructure(cv);
  }

  /**
   * Validates transformation result
    */
  validateTransformationResult(result: any): {
    isValid: boolean;
    errors: string[];
    sanitizedResult: any;
  } {
    const errors: string[] = [];
    const sanitized = { ...result };

    // Validate basic structure
    if (!result.transformedCV) {
      errors.push('Transformed CV is required');
      sanitized.transformedCV = {};
    }

    if (!result.appliedRecommendations || !Array.isArray(result.appliedRecommendations)) {
      errors.push('Applied recommendations must be an array');
      sanitized.appliedRecommendations = [];
    }

    if (!result.summary || typeof result.summary !== 'object') {
      errors.push('Summary object is required');
      sanitized.summary = {
        totalChanges: 0,
        sectionsModified: [],
        estimatedImprovementScore: 0
      };
    }

    // Validate summary structure
    if (result.summary) {
      if (typeof result.summary.totalChanges !== 'number') {
        sanitized.summary.totalChanges = 0;
      }
      if (!Array.isArray(result.summary.sectionsModified)) {
        sanitized.summary.sectionsModified = [];
      }
      if (typeof result.summary.estimatedImprovementScore !== 'number') {
        sanitized.summary.estimatedImprovementScore = 0;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedResult: sanitized
    };
  }

  /**
   * Validates user permissions for operations
    */
  validateUserPermissions(userId: string, operation: string): boolean {
    return this.authValidator.validateUserPermissions(userId, operation);
  }
}