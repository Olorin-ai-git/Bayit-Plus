/**
 * RequestValidator - Validates request parameters for recommendation operations
 * Broken out from ValidationEngine to comply with 200-line limit
  */
export class RequestValidator {
  /**
   * Validates request parameters for recommendation operations
    */
  validateRecommendationRequest(data: any): {
    isValid: boolean;
    errors: string[];
    sanitizedData: any;
  } {
    const errors: string[] = [];
    const sanitizedData = { ...data };

    // Validate jobId
    if (!data.jobId || typeof data.jobId !== 'string') {
      errors.push('Job ID is required and must be a string');
    }

    // Validate selectedRecommendationIds for apply operations
    if (data.selectedRecommendationIds !== undefined) {
      if (!Array.isArray(data.selectedRecommendationIds)) {
        errors.push('Selected recommendation IDs must be an array');
      } else if (data.selectedRecommendationIds.length === 0) {
        errors.push('At least one recommendation ID must be selected');
      } else {
        // Validate each ID is a string
        for (const id of data.selectedRecommendationIds) {
          if (typeof id !== 'string') {
            errors.push('All recommendation IDs must be strings');
            break;
          }
        }
      }
    }

    // Validate userId if provided
    if (data.userId && typeof data.userId !== 'string') {
      errors.push('User ID must be a string');
    }

    // Validate targetRole if provided
    if (data.targetRole && typeof data.targetRole !== 'string') {
      errors.push('Target role must be a string');
    }

    // Validate industryKeywords if provided
    if (data.industryKeywords) {
      if (!Array.isArray(data.industryKeywords)) {
        errors.push('Industry keywords must be an array');
      } else {
        for (const keyword of data.industryKeywords) {
          if (typeof keyword !== 'string') {
            errors.push('All industry keywords must be strings');
            break;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }
}