/**
 * Script Quality Assessment Module
 *
 * Assesses the quality of generated scripts across multiple dimensions.
 * Extracted from enhanced-prompt-engine.service.ts for better modularity.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

import OpenAI from 'openai';
import { config } from '../../../config/environment';
import { ScriptQualityMetrics, PersonalityProfile } from './types';
import { IndustryTemplate } from '../../types/industry-specialization';

export class QualityAssessor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  /**
   * Comprehensive script quality assessment
    */
  async assessScriptQuality(
    script: string,
    personalityProfile: PersonalityProfile,
    industryTemplate?: IndustryTemplate
  ): Promise<ScriptQualityMetrics> {
    const engagementScore = await this.assessEngagement(script);
    const industryAlignment = this.assessIndustryAlignment(script, industryTemplate);
    const personalityMatch = this.assessPersonalityMatch(script, personalityProfile);
    const technicalAccuracy = this.assessTechnicalAccuracy(script);
    const deliveryOptimization = this.assessDeliveryOptimization(script);
    const professionalImpact = this.assessProfessionalImpact(script);

    const overallScore = (
      engagementScore * 0.25 +
      industryAlignment * 10 * 0.15 +
      personalityMatch * 10 * 0.15 +
      technicalAccuracy * 10 * 0.15 +
      deliveryOptimization * 10 * 0.15 +
      professionalImpact * 10 * 0.15
    );

    const feedback = this.generateQualityFeedback({
      overallScore,
      engagementScore,
      industryAlignment,
      personalityMatch,
      technicalAccuracy,
      deliveryOptimization,
      professionalImpact,
      feedback: []
    });

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      engagementScore,
      industryAlignment,
      personalityMatch,
      technicalAccuracy,
      deliveryOptimization,
      professionalImpact,
      feedback
    };
  }

  private async assessEngagement(script: string): Promise<number> {
    try {
      const prompt = `Analyze this video script for engagement level on a scale of 0-10:

Script: "${script}"

Consider:
- Hook strength and opening impact
- Story flow and narrative structure
- Energy and enthusiasm level
- Call-to-action effectiveness
- Memorable moments and key takeaways

Provide only a numerical score (0-10) with one decimal place.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 50
      });

      const scoreText = response.choices[0]?.message?.content?.trim() || '5.0';
      const score = parseFloat(scoreText);
      return isNaN(score) ? this.calculateBasicEngagement(script) : Math.max(0, Math.min(10, score));
    } catch (error) {
      return this.calculateBasicEngagement(script);
    }
  }

  private assessIndustryAlignment(script: string, industryTemplate?: IndustryTemplate): number {
    if (!industryTemplate) return 0.7; // Default moderate alignment

    const scriptLower = script.toLowerCase();
    let alignmentScore = 0;
    let totalChecks = 0;

    // Check for industry-specific keywords
    if (industryTemplate?.commonKeywords) {
      const keywordMatches = industryTemplate.commonKeywords.filter((keyword: string) =>
        scriptLower.includes(keyword.toLowerCase())
      ).length;
      alignmentScore += (keywordMatches / industryTemplate.commonKeywords.length) * 0.4;
      totalChecks += 0.4;
    }

    // Check vocabulary focus alignment
    if (industryTemplate?.vocabularyFocus) {
      const vocabMatches = industryTemplate.vocabularyFocus.filter((term: string) =>
        scriptLower.includes(term.toLowerCase())
      ).length;
      alignmentScore += (vocabMatches / industryTemplate.vocabularyFocus.length) * 0.3;
      totalChecks += 0.3;
    }

    // Avoid keywords penalty
    if (industryTemplate?.avoidKeywords) {
      const avoidMatches = industryTemplate.avoidKeywords.filter((keyword: string) =>
        scriptLower.includes(keyword.toLowerCase())
      ).length;
      alignmentScore -= (avoidMatches / industryTemplate.avoidKeywords.length) * 0.2;
      totalChecks += 0.2;
    }

    // Base industry appropriateness
    alignmentScore += 0.1;
    totalChecks += 0.1;

    return Math.max(0, Math.min(1, alignmentScore / totalChecks));
  }

  private assessPersonalityMatch(script: string, personalityProfile: PersonalityProfile): number {
    const scriptLower = script.toLowerCase();
    let matchScore = 0;

    // Communication style indicators
    const styleIndicators = this.getStyleIndicators(personalityProfile.communicationStyle);
    const styleMatches = styleIndicators.filter(indicator =>
      scriptLower.includes(indicator)
    ).length;
    matchScore += (styleMatches / styleIndicators.length) * 0.3;

    // Personality traits indicators
    const traitIndicators = this.getTraitIndicators(personalityProfile.personalityTraits);
    const traitMatches = traitIndicators.filter(indicator =>
      scriptLower.includes(indicator)
    ).length;
    if (traitIndicators.length > 0) {
      matchScore += (traitMatches / traitIndicators.length) * 0.3;
    }

    // Career stage appropriateness
    const careerStageWords = {
      early: ['learning', 'growth', 'developing', 'building'],
      mid: ['expertise', 'specializing', 'contributing', 'advancing'],
      senior: ['leading', 'mentoring', 'strategy', 'guiding'],
      executive: ['vision', 'transformation', 'leadership', 'direction']
    };

    const stageWords = careerStageWords[personalityProfile.careerStage] || [];
    const stageMatches = stageWords.filter(word => scriptLower.includes(word)).length;
    if (stageWords.length > 0) {
      matchScore += (stageMatches / stageWords.length) * 0.4;
    }

    return Math.max(0, Math.min(1, matchScore));
  }

  private assessTechnicalAccuracy(script: string): number {
    // Basic heuristics for technical accuracy
    const scriptLower = script.toLowerCase();
    let accuracyScore = 0.7; // Base score

    // Check for overly technical jargon that might confuse audiences
    const jargonCount = (scriptLower.match(/\b(api|sdk|tcp|sql|rest|json|xml)\b/g) || []).length;
    if (jargonCount > 5) {
      accuracyScore -= 0.1; // Penalty for too much jargon
    }

    // Check for clear explanations
    const explanationIndicators = ['means', 'essentially', 'in other words', 'simply put'];
    const explanationCount = explanationIndicators.filter(indicator =>
      scriptLower.includes(indicator)
    ).length;
    accuracyScore += explanationCount * 0.05;

    return Math.max(0, Math.min(1, accuracyScore));
  }

  private assessDeliveryOptimization(script: string): number {
    const words = script.split(/\s+/).length;
    let deliveryScore = 0.7; // Base score

    // Optimal length check (150-200 words for short, 300-400 for medium, 500-600 for long)
    if (words >= 150 && words <= 600) {
      deliveryScore += 0.2;
    }

    // Check for natural pauses (commas, periods)
    const pauseCount = (script.match(/[,.;]/g) || []).length;
    const pauseRatio = pauseCount / words;
    if (pauseRatio >= 0.05 && pauseRatio <= 0.15) {
      deliveryScore += 0.1;
    }

    return Math.max(0, Math.min(1, deliveryScore));
  }

  private assessProfessionalImpact(script: string): number {
    const scriptLower = script.toLowerCase();
    let impactScore = 0.6; // Base score

    // Impact indicators
    const impactWords = ['achieve', 'deliver', 'transform', 'improve', 'optimize', 'innovate'];
    const impactCount = impactWords.filter(word => scriptLower.includes(word)).length;
    impactScore += (impactCount / impactWords.length) * 0.3;

    // Professional tone indicators
    const professionalWords = ['experience', 'expertise', 'professional', 'skilled', 'qualified'];
    const professionalCount = professionalWords.filter(word => scriptLower.includes(word)).length;
    impactScore += (professionalCount / professionalWords.length) * 0.1;

    return Math.max(0, Math.min(1, impactScore));
  }

  private generateQualityFeedback(metrics: ScriptQualityMetrics): string[] {
    const feedback: string[] = [];

    if (metrics.overallScore >= 8) {
      feedback.push("Excellent script quality with strong professional impact");
    } else if (metrics.overallScore >= 6) {
      feedback.push("Good script quality with room for minor improvements");
    } else {
      feedback.push("Script needs significant improvements for optimal impact");
    }

    if (metrics.engagementScore < 6) {
      feedback.push("Consider adding more engaging hooks and compelling storytelling elements");
    }

    if (metrics.industryAlignment < 0.6) {
      feedback.push("Include more industry-specific terminology and relevant examples");
    }

    if (metrics.personalityMatch < 0.6) {
      feedback.push("Adjust tone and language to better match the professional's communication style");
    }

    if (metrics.technicalAccuracy < 0.7) {
      feedback.push("Simplify technical concepts for broader audience appeal");
    }

    if (metrics.deliveryOptimization < 0.7) {
      feedback.push("Optimize script length and pacing for better video delivery");
    }

    return feedback;
  }

  private calculateBasicEngagement(script: string): number {
    const words = script.split(/\s+/).length;
    let score = 5.0; // Base score

    // Length scoring
    if (words >= 100 && words <= 300) score += 1.0;
    if (words > 300 && words <= 500) score += 0.5;

    // Engagement elements
    const questions = (script.match(/\?/g) || []).length;
    if (questions > 0) score += 0.5;

    const exclamations = (script.match(/!/g) || []).length;
    if (exclamations > 0) score += 0.3;

    return Math.min(10, score);
  }

  private getStyleIndicators(style: string): string[] {
    const indicators = {
      direct: ['delivered', 'achieved', 'implemented', 'managed', 'led'],
      collaborative: ['collaborated', 'partnered', 'worked with', 'facilitated', 'coordinated'],
      analytical: ['analyzed', 'evaluated', 'researched', 'optimized', 'measured'],
      creative: ['designed', 'created', 'innovated', 'developed', 'conceptualized']
    };
    return indicators[style as keyof typeof indicators] || [];
  }

  private getTraitIndicators(traits: string[]): string[] {
    const traitIndicators: { [key: string]: string[] } = {
      'results-driven': ['results', 'achievement', 'success', 'delivered'],
      'innovative': ['innovation', 'creative', 'new', 'pioneered'],
      'analytical': ['data', 'analysis', 'research', 'metrics'],
      'collaborative': ['team', 'collaboration', 'partnership', 'together'],
      'detail-oriented': ['detail', 'thorough', 'precise', 'careful'],
      'leadership-focused': ['leadership', 'guided', 'directed', 'mentored']
    };

    return traits.flatMap(trait => traitIndicators[trait] || []);
  }
}