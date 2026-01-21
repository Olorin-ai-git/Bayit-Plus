/**
 * Prompt Optimization Module
 *
 * Optimizes prompts based on personality profiles and industry templates.
 * Extracted from enhanced-prompt-engine.service.ts for better modularity.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

import { ParsedCV } from '../../types/enhanced-models';
import { PersonalityProfile } from './types';
import { IndustryTemplate } from '../../types/industry-specialization';

export class PromptOptimizer {
  /**
   * Builds optimization layer for prompts
    */
  async buildOptimizationLayer(
    cv: ParsedCV,
    personalityProfile: PersonalityProfile,
    industryTemplate?: IndustryTemplate
  ): Promise<string> {
    const personalityOptimization = this.buildPersonalityOptimization(personalityProfile);
    const industryOptimization = this.buildIndustryOptimization(industryTemplate);
    const communicationOptimization = this.buildCommunicationOptimization(personalityProfile);

    return `
OPTIMIZATION LAYER - Tailored Enhancement:

${personalityOptimization}

${industryOptimization}

${communicationOptimization}

Delivery Style: Optimize for ${personalityProfile.communicationStyle} communication with ${personalityProfile.careerStage}-level professional language.

Target Audience: ${this.determineTargetAudience(personalityProfile, industryTemplate)}
`.trim();
  }

  private buildPersonalityOptimization(profile: PersonalityProfile): string {
    const optimizations: string[] = [];

    // Communication style optimization
    switch (profile.communicationStyle) {
      case 'direct':
        optimizations.push('Use clear, concise language with actionable statements');
        optimizations.push('Lead with results and achievements prominently');
        break;
      case 'collaborative':
        optimizations.push('Emphasize teamwork and partnership achievements');
        optimizations.push('Include collaborative language and shared successes');
        break;
      case 'analytical':
        optimizations.push('Include data-driven accomplishments and metrics');
        optimizations.push('Focus on problem-solving and systematic approaches');
        break;
      case 'creative':
        optimizations.push('Highlight innovation and creative problem-solving');
        optimizations.push('Use engaging, inspiring language with visual elements');
        break;
    }

    // Leadership type optimization
    switch (profile.leadershipType) {
      case 'visionary':
        optimizations.push('Emphasize strategic vision and transformational initiatives');
        break;
      case 'operational':
        optimizations.push('Focus on process improvements and execution excellence');
        break;
      case 'servant':
        optimizations.push('Highlight mentoring, team development, and empowerment');
        break;
      case 'strategic':
        optimizations.push('Showcase planning, roadmap development, and strategic thinking');
        break;
    }

    // Technical depth optimization
    switch (profile.technicalDepth) {
      case 'specialist':
        optimizations.push('Include deep technical expertise and specialized knowledge');
        break;
      case 'generalist':
        optimizations.push('Emphasize versatility and cross-functional capabilities');
        break;
      case 'architect':
        optimizations.push('Focus on system design, architecture, and technical leadership');
        break;
      case 'manager':
        optimizations.push('Balance technical knowledge with management and leadership skills');
        break;
    }

    return `Personality Optimization:\n- ${optimizations.join('\n- ')}`;
  }

  private buildIndustryOptimization(template?: IndustryTemplate): string {
    if (!template) {
      return 'Industry Optimization: Apply general professional standards and cross-industry best practices';
    }

    const optimizations: string[] = [];

    // Common keywords integration
    if (template?.commonKeywords && template.commonKeywords.length > 0) {
      optimizations.push(`Incorporate industry keywords: ${template.commonKeywords.slice(0, 5).join(', ')}`);
    }

    // Vocabulary focus
    if (template?.vocabularyFocus && template.vocabularyFocus.length > 0) {
      optimizations.push(`Use focused vocabulary: ${template.vocabularyFocus.slice(0, 3).join(', ')}`);
    }

    // Avoid certain keywords
    if (template?.avoidKeywords && template.avoidKeywords.length > 0) {
      optimizations.push(`Avoid terms: ${template.avoidKeywords.slice(0, 3).join(', ')}`);
    }

    return `Industry Optimization (${template.name || 'Specialized'}):\n- ${optimizations.join('\n- ')}`;
  }

  private buildCommunicationOptimization(profile: PersonalityProfile): string {
    const optimizations: string[] = [];

    // Career stage specific optimization
    switch (profile.careerStage) {
      case 'early':
        optimizations.push('Emphasize growth potential, learning agility, and fresh perspectives');
        optimizations.push('Focus on achievements and rapid skill development');
        break;
      case 'mid':
        optimizations.push('Highlight specialized expertise and proven track record');
        optimizations.push('Balance individual contributions with team collaboration');
        break;
      case 'senior':
        optimizations.push('Showcase leadership experience and strategic thinking');
        optimizations.push('Emphasize mentoring capabilities and business impact');
        break;
      case 'executive':
        optimizations.push('Focus on organizational transformation and vision');
        optimizations.push('Highlight board-level communication and strategic leadership');
        break;
    }

    // Personality traits optimization
    if (profile.personalityTraits.length > 0) {
      const traitOptimizations = profile.personalityTraits.map(trait => {
        switch (trait) {
          case 'results-driven':
            return 'Emphasize quantifiable achievements and ROI';
          case 'innovative':
            return 'Highlight creative solutions and breakthrough thinking';
          case 'analytical':
            return 'Include data-driven decision making and systematic approaches';
          case 'collaborative':
            return 'Showcase team building and cross-functional partnerships';
          case 'detail-oriented':
            return 'Demonstrate precision, quality, and thorough execution';
          case 'leadership-focused':
            return 'Emphasize people development and organizational influence';
          default:
            return `Incorporate ${trait} characteristics naturally`;
        }
      });
      optimizations.push(...traitOptimizations.slice(0, 3));
    }

    return `Communication Optimization:\n- ${optimizations.join('\n- ')}`;
  }

  private determineTargetAudience(profile: PersonalityProfile, template?: IndustryTemplate): string {
    const audienceElements: string[] = [];

    // Industry-specific audience
    if (template?.name) {
      audienceElements.push(`${template.name} professionals`);
    } else {
      audienceElements.push(`${profile.industryFocus} stakeholders`);
    }

    // Career level appropriate audience
    switch (profile.careerStage) {
      case 'early':
        audienceElements.push('hiring managers and team leads');
        break;
      case 'mid':
        audienceElements.push('senior managers and department heads');
        break;
      case 'senior':
        audienceElements.push('executives and business leaders');
        break;
      case 'executive':
        audienceElements.push('board members and C-suite executives');
        break;
    }

    // Technical depth consideration
    if (profile.technicalDepth === 'specialist') {
      audienceElements.push('technical experts and specialists');
    } else if (profile.technicalDepth === 'architect') {
      audienceElements.push('technical leadership and architecture teams');
    }

    return audienceElements.join(', ');
  }
}