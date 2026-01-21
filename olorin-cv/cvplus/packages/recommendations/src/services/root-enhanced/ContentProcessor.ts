import { ServiceFactory, PlaceholderReplacementMap, CVRecommendation } from './compatibility';

/**
 * ContentProcessor - Handles content processing and placeholder management
 * Responsible for customizing content, managing placeholders, and content validation
  */
export class ContentProcessor {
  /**
   * Processes content with placeholder replacements
    */
  processPlaceholderContent(
    content: string,
    placeholderValues: PlaceholderReplacementMap
  ): { customizedContent: string; isValid: boolean; errors: string[] } {
    try {
      // Replace placeholders with user values
      const placeholderManager = ServiceFactory.getPlaceholderManager();
      const customizedContent = placeholderManager.replacePlaceholders(
        content,
        placeholderValues
      );

      // Validate that all placeholders have been replaced
      const validation = placeholderManager.validatePlaceholders(content, placeholderValues);
      
      return {
        customizedContent,
        isValid: validation,
        errors: validation ? [] : ['Some placeholders could not be replaced']
      };
    } catch (error: any) {
      return {
        customizedContent: content,
        isValid: false,
        errors: [`Failed to process placeholders: ${error.message}`]
      };
    }
  }

  /**
   * Customizes a recommendation with user-provided placeholder values
    */
  customizeRecommendation(
    recommendation: CVRecommendation,
    placeholderValues: PlaceholderReplacementMap
  ): CVRecommendation {
    if (!recommendation.suggestedContent) {
      throw new Error('No content to customize');
    }

    const processing = this.processPlaceholderContent(
      recommendation.suggestedContent,
      placeholderValues
    );

    if (!processing.isValid) {
      throw new Error(processing.errors.join('; '));
    }

    return {
      ...recommendation,
      customizedContent: processing.customizedContent,
      isCustomized: true
    };
  }

  /**
   * Generates content preview for a recommendation
    */
  generateContentPreview(recommendation: CVRecommendation): {
    beforeContent: string;
    afterContent: string;
    hasPlaceholders: boolean;
  } {
    const beforeContent = recommendation.currentContent || '';
    const afterContent = recommendation.customizedContent || recommendation.suggestedContent || '';
    const hasPlaceholders = this.containsPlaceholders(afterContent);

    return {
      beforeContent,
      afterContent,
      hasPlaceholders
    };
  }

  /**
   * Checks if content contains placeholder syntax
    */
  private containsPlaceholders(content: string): boolean {
    const placeholderPattern = /\{\{[^}]+\}\}/g;
    return placeholderPattern.test(content);
  }

  /**
   * Extracts placeholders from content
    */
  extractPlaceholders(content: string): string[] {
    const placeholderPattern = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderPattern.exec(content)) !== null) {
      placeholders.push(match[1].trim());
    }

    return [...new Set(placeholders)]; // Remove duplicates
  }

  /**
   * Validates content quality and completeness
    */
  validateContentQuality(content: string): {
    isValid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check minimum length
    if (content.length < 10) {
      issues.push('Content is too short');
      suggestions.push('Expand content to be more descriptive');
      score -= 30;
    }

    // Check for placeholder syntax issues
    const unclosedBrackets = (content.match(/\{\{/g) || []).length !== (content.match(/\}\}/g) || []).length;
    if (unclosedBrackets) {
      issues.push('Unclosed placeholder brackets');
      suggestions.push('Check placeholder syntax: {{placeholder}}');
      score -= 20;
    }

    // Check for common quality indicators
    const hasNumbers = /\d/.test(content);
    const hasActionWords = /\b(achieved|improved|increased|reduced|led|managed|developed|created)\b/i.test(content);
    
    if (!hasNumbers && content.length > 50) {
      suggestions.push('Consider adding quantifiable metrics');
      score -= 10;
    }

    if (!hasActionWords && content.length > 50) {
      suggestions.push('Use strong action words to describe accomplishments');
      score -= 10;
    }

    return {
      isValid: issues.length === 0,
      score: Math.max(0, score),
      issues,
      suggestions
    };
  }

  /**
   * Formats content for display with proper line breaks and formatting
    */
  formatContentForDisplay(content: string): string {
    return content
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  /**
   * Strips formatting from content for plain text use
    */
  stripFormatting(content: string): string {
    return content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .trim();
  }
}