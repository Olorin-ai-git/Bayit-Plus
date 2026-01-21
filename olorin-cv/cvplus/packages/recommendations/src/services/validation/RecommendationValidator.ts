/**
 * RecommendationValidator - Validates recommendation data structure and content
 * Broken out from ValidationEngine to comply with 200-line limit
  */
import { CVSection, ImpactLevel } from '../../types';
import { CVRecommendation } from '../root-enhanced/compatibility';

export class RecommendationValidator {
  /**
   * Validates a single recommendation object structure and content
    */
  validateSingleRecommendation(rec: CVRecommendation): {
    isValid: boolean;
    errors: string[];
    sanitizedRecommendation: CVRecommendation;
  } {
    const errors: string[] = [];
    const sanitized: any = { ...rec };

    // Validate required fields
    if (!rec.id || typeof rec.id !== 'string') {
      errors.push('Recommendation ID is required and must be a string');
      sanitized.id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (!rec.title || typeof rec.title !== 'string') {
      errors.push('Recommendation title is required and must be a string');
      sanitized.title = 'CV Improvement Recommendation';
    }

    if (!rec.description || typeof rec.description !== 'string') {
      errors.push('Recommendation description is required and must be a string');
      sanitized.description = 'Improve your CV content to better showcase your professional experience.';
    }

    // Validate section enum
    if (!rec.section || !Object.values(CVSection).includes(rec.section as CVSection)) {
      errors.push('Recommendation section must be a valid CVSection enum value');
      sanitized.section = CVSection.PROFESSIONAL_SUMMARY;
    }

    // Validate impact level
    if (!rec.impact || !Object.values(ImpactLevel).includes(rec.impact as ImpactLevel)) {
      sanitized.impact = ImpactLevel.MEDIUM;
    }

    // Validate priority (should be 1-10)
    if (!rec.priority || typeof rec.priority !== 'number' || rec.priority < 1 || rec.priority > 10) {
      sanitized.priority = 5;
    }

    // Validate estimatedScoreImprovement (should be positive number)
    if (!rec.estimatedScoreImprovement || typeof rec.estimatedScoreImprovement !== 'number' || rec.estimatedScoreImprovement < 0) {
      sanitized.estimatedScoreImprovement = 10;
    }

    // Validate suggestedContent length if present
    if (rec.suggestedContent && typeof rec.suggestedContent === 'string' && rec.suggestedContent.length > 5000) {
      errors.push('Suggested content is too long (max 5000 characters)');
      sanitized.suggestedContent = rec.suggestedContent.substring(0, 5000) + '...';
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedRecommendation: sanitized as CVRecommendation
    };
  }

  /**
   * Validates an array of recommendations
    */
  validateRecommendations(recommendations: CVRecommendation[]): {
    isValid: boolean;
    errors: string[];
    validRecommendations: CVRecommendation[];
  } {
    if (!Array.isArray(recommendations)) {
      return {
        isValid: false,
        errors: ['Recommendations must be an array'],
        validRecommendations: []
      };
    }

    const allErrors: string[] = [];
    const validRecommendations: CVRecommendation[] = [];

    for (let i = 0; i < recommendations.length; i++) {
      const validation = this.validateSingleRecommendation(recommendations[i]);

      if (validation.isValid) {
        validRecommendations.push(validation.sanitizedRecommendation);
      } else {
        allErrors.push(`Recommendation ${i + 1}: ${validation.errors.join(', ')}`);
        // Still add the sanitized version to keep the data flow working
        validRecommendations.push(validation.sanitizedRecommendation);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      validRecommendations
    };
  }
}