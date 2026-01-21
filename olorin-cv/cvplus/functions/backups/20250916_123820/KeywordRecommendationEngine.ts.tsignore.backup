// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Keyword Recommendation Engine
 * 
 * Generates keyword optimization recommendations and improvement suggestions.
 */

import { KeywordMatch } from '../../../types/enhanced-models';

export class KeywordRecommendationEngine {

  /**
   * Generate keyword optimization recommendations
   */
  generateRecommendations(
    matchedKeywords: KeywordMatch[], 
    missingKeywords: string[], 
    currentDensity: number, 
    industry?: string
  ): string[] {
    const recommendations: string[] = [];
    const optimalDensity = this.getOptimalKeywordDensity(industry);

    if (missingKeywords.length > 0) {
      recommendations.push(`Add missing keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
    }

    if (currentDensity < optimalDensity * 0.8) {
      recommendations.push('Increase keyword density by incorporating more relevant terms');
    } else if (currentDensity > optimalDensity * 1.2) {
      recommendations.push('Reduce keyword density to avoid appearing as keyword stuffing');
    }

    const lowFrequencyKeywords = matchedKeywords.filter(kw => kw.frequency === 1);
    if (lowFrequencyKeywords.length > 0) {
      recommendations.push('Increase frequency of important keywords by using them in multiple sections');
    }

    return recommendations;
  }

  /**
   * Generate contextual keyword suggestions
   */
  generateContextualSuggestions(
    matchedKeywords: KeywordMatch[],
    missingKeywords: string[],
    industry?: string
  ): {
    integration: string[];
    placement: string[];
    variations: string[];
  } {
    return {
      integration: this.getIntegrationSuggestions(missingKeywords, industry),
      placement: this.getPlacementSuggestions(matchedKeywords),
      variations: this.getVariationSuggestions(matchedKeywords)
    };
  }

  /**
   * Get integration suggestions for missing keywords
   */
  private getIntegrationSuggestions(missingKeywords: string[], industry?: string): string[] {
    const suggestions: string[] = [];
    
    if (missingKeywords.length === 0) return suggestions;

    suggestions.push(`Integrate "${missingKeywords[0]}" into your professional summary`);
    
    if (missingKeywords.length > 1) {
      suggestions.push(`Add "${missingKeywords[1]}" to relevant experience descriptions`);
    }
    
    if (missingKeywords.length > 2) {
      suggestions.push(`Include "${missingKeywords[2]}" in your skills section`);
    }

    // Industry-specific suggestions
    if (industry === 'technology') {
      suggestions.push('Consider adding technical keywords to project descriptions');
    } else if (industry === 'finance') {
      suggestions.push('Include regulatory and compliance terms where relevant');
    } else if (industry === 'healthcare') {
      suggestions.push('Add clinical and patient care terminology appropriately');
    }

    return suggestions;
  }

  /**
   * Get placement suggestions for existing keywords
   */
  private getPlacementSuggestions(matchedKeywords: KeywordMatch[]): string[] {
    const suggestions: string[] = [];
    const lowFrequencyKeywords = matchedKeywords.filter(kw => kw.frequency === 1);
    
    if (lowFrequencyKeywords.length > 0) {
      const keyword = lowFrequencyKeywords[0].keyword;
      suggestions.push(`Use "${keyword}" in multiple contexts to strengthen relevance`);
      suggestions.push(`Consider adding "${keyword}" to your skills or achievements section`);
    }

    const highRelevanceKeywords = matchedKeywords.filter(kw => kw.importance > 0.8);
    if (highRelevanceKeywords.length > 0) {
      suggestions.push('Emphasize high-relevance keywords in section headers when appropriate');
    }

    return suggestions;
  }

  /**
   * Get variation suggestions for keyword diversity
   */
  private getVariationSuggestions(matchedKeywords: KeywordMatch[]): string[] {
    const suggestions: string[] = [];
    
    if (matchedKeywords.length > 0) {
      const primaryKeyword = matchedKeywords[0].keyword;
      suggestions.push(`Consider synonyms and variations of "${primaryKeyword}" for natural language flow`);
    }

    if (matchedKeywords.some(kw => kw.frequency > 3)) {
      suggestions.push('Replace some repeated keywords with synonyms to avoid over-optimization');
    }

    suggestions.push('Use both acronyms and full terms (e.g., "AI" and "Artificial Intelligence")');

    return suggestions;
  }

  /**
   * Assess keyword strategy effectiveness
   */
  assessKeywordStrategy(
    matchedKeywords: KeywordMatch[],
    missingKeywords: string[],
    currentDensity: number,
    industry?: string
  ): {
    score: number;
    strengths: string[];
    weaknesses: string[];
    priority: 'low' | 'medium' | 'high';
  } {
    let score = 50; // Base score
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    // Assess keyword coverage
    const totalKeywords = matchedKeywords.length + missingKeywords.length;
    const coverage = totalKeywords > 0 ? matchedKeywords.length / totalKeywords : 0;
    
    if (coverage > 0.8) {
      score += 20;
      strengths.push('Excellent keyword coverage');
    } else if (coverage > 0.6) {
      score += 10;
      strengths.push('Good keyword coverage');
    } else {
      score -= 10;
      weaknesses.push('Low keyword coverage - missing critical terms');
    }
    
    // Assess keyword density
    const optimalDensity = this.getOptimalKeywordDensity(industry);
    const densityRatio = currentDensity / optimalDensity;
    
    if (densityRatio >= 0.8 && densityRatio <= 1.2) {
      score += 15;
      strengths.push('Optimal keyword density');
    } else if (densityRatio < 0.6) {
      score -= 15;
      weaknesses.push('Keyword density too low');
    } else if (densityRatio > 1.5) {
      score -= 10;
      weaknesses.push('Keyword density too high');
    }
    
    // Assess keyword relevance
    const avgRelevance = matchedKeywords.length > 0 ? 
      matchedKeywords.reduce((sum, kw) => sum + kw.importance, 0) / matchedKeywords.length : 0;
    
    if (avgRelevance > 0.7) {
      score += 15;
      strengths.push('High keyword relevance');
    } else if (avgRelevance < 0.5) {
      score -= 10;
      weaknesses.push('Low keyword relevance');
    }
    
    // Determine priority
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (score < 60) {
      priority = 'high';
    } else if (score > 80) {
      priority = 'low';
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      strengths,
      weaknesses,
      priority
    };
  }

  /**
   * Get optimal keyword density for industry
   */
  private getOptimalKeywordDensity(industry?: string): number {
    const densityMap: { [key: string]: number } = {
      technology: 0.035,
      finance: 0.03,
      healthcare: 0.028,
      marketing: 0.032,
      sales: 0.03
    };

    return industry && densityMap[industry] ? densityMap[industry] : 0.03;
  }
}