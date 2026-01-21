/**
 * Core Prompt Engine
 *
 * Main orchestrator for the enhanced prompt generation system.
 * Coordinates all modules to generate optimized video scripts.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

import OpenAI from 'openai';
import { config } from '../../../config/environment';
import { ParsedCV } from '../../types/enhanced-models';
import { IndustryTemplate } from '../../types/industry-specialization';
import {
  PromptEngineOptions,
  EnhancedScriptResult,
  PromptEngineError,
  PromptEngineErrorType
} from './types';
import { PersonalityAnalyzer } from './personality-analyzer';
import { ContextBuilder } from './context-builder';
import { PromptOptimizer } from './prompt-optimizer';
import { QualityAssessor } from './quality-assessor';

export class CorePromptEngine {
  private openai: OpenAI;
  private personalityAnalyzer: PersonalityAnalyzer;
  private contextBuilder: ContextBuilder;
  private promptOptimizer: PromptOptimizer;
  private qualityAssessor: QualityAssessor;
  private qualityThresholds: Map<string, number>;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });

    this.personalityAnalyzer = new PersonalityAnalyzer();
    this.contextBuilder = new ContextBuilder();
    this.promptOptimizer = new PromptOptimizer();
    this.qualityAssessor = new QualityAssessor();

    this.qualityThresholds = new Map([
      ['basic', 6.0],
      ['enhanced', 7.5],
      ['premium', 8.5]
    ]);
  }

  /**
   * Generates enhanced video script using multi-layer prompt architecture
    */
  async generateEnhancedScript(
    cv: ParsedCV,
    options: PromptEngineOptions = {},
    industryTemplate?: IndustryTemplate
  ): Promise<EnhancedScriptResult> {
    const startTime = Date.now();

    try {
      // Step 1: Build context layer
      const contextLayer = await this.contextBuilder.buildContextLayer(cv);

      // Step 2: Analyze personality
      const personalityProfile = options.customPersonality ||
        await this.personalityAnalyzer.analyzePersonality(cv);

      // Step 3: Build optimization layer
      const optimizationLayer = await this.promptOptimizer.buildOptimizationLayer(
        cv,
        personalityProfile,
        industryTemplate
      );

      // Step 4: Build production layer
      const productionLayer = this.buildProductionLayer(options);

      // Step 5: Synthesize final script
      const script = await this.synthesizeScript(
        contextLayer,
        optimizationLayer,
        productionLayer,
        options
      );

      // Step 6: Assess quality
      const quality = await this.qualityAssessor.assessScriptQuality(
        script,
        personalityProfile,
        industryTemplate
      );

      // Step 7: Optimize if needed
      const optimizedScript = await this.optimizeScriptQuality(
        script,
        quality,
        options.optimizationLevel || 'enhanced'
      );

      const generationTime = Date.now() - startTime;

      return {
        script: optimizedScript,
        quality,
        personalityProfile,
        metadata: {
          generationTime,
          tokensUsed: this.estimateTokens(optimizedScript),
          optimizationLevel: options.optimizationLevel || 'enhanced',
          layersApplied: ['context', 'optimization', 'production', 'quality']
        }
      };
    } catch (error) {
      throw new PromptEngineError(
        `Script generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PromptEngineErrorType.PRODUCTION_FAILED,
        { cv: cv.personalInfo?.name, options },
        error
      );
    }
  }

  private buildProductionLayer(options: PromptEngineOptions): string {
    const duration = options.duration || 'medium';
    const style = options.style || 'professional';
    const durationSpecs = this.getDurationSpecs(duration);

    return `
PRODUCTION LAYER - Video Generation Requirements:

Video Duration: ${durationSpecs}
Style: ${style.charAt(0).toUpperCase() + style.slice(1)} tone with engaging delivery
Format: Professional video script optimized for ${options.avatarStyle || 'corporate'} avatar
Background: ${options.background || 'modern'} setting
${options.includeSubtitles ? 'Include: Subtitle-friendly pacing and clear enunciation' : ''}
${options.includeNameCard ? 'Include: Name card introduction moment' : ''}

Script Requirements:
- Natural, conversational flow suitable for video delivery
- Clear pronunciation markers for AI voice generation
- Appropriate pauses for visual emphasis
- Professional yet approachable tone
- Strong opening hook and compelling conclusion
`.trim();
  }

  private async synthesizeScript(
    contextLayer: string,
    optimizationLayer: string,
    productionLayer: string,
    options: PromptEngineOptions
  ): Promise<string> {
    const prompt = `You are an expert video script writer specializing in professional introduction videos. Create a compelling video script based on the following layered analysis:

${contextLayer}

${optimizationLayer}

${productionLayer}

Generate a professional video script that:
1. Opens with a strong, engaging hook
2. Presents the professional's key strengths and value proposition
3. Includes specific achievements and expertise
4. Maintains audience engagement throughout
5. Ends with a compelling call-to-action or memorable closing

The script should sound natural when spoken aloud and be optimized for ${options.duration || 'medium'} duration video.

Script:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: this.getMaxTokensForDuration(options.duration || 'medium')
      });

      return response.choices[0]?.message?.content?.trim() ||
        'Hello, I\'m a dedicated professional with a passion for delivering exceptional results...';
    } catch (error) {
      throw new PromptEngineError(
        `Script synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PromptEngineErrorType.PRODUCTION_FAILED,
        { prompt: prompt.substring(0, 200) + '...' },
        error
      );
    }
  }

  private async optimizeScriptQuality(
    script: string,
    quality: any,
    optimizationLevel: string
  ): Promise<string> {
    const threshold = this.qualityThresholds.get(optimizationLevel) || 7.0;

    if (quality.overallScore >= threshold) {
      return script; // Quality is acceptable
    }

    // Apply optimization based on quality feedback
    const optimizationPrompt = `Improve this video script based on the following quality assessment:

Original Script: "${script}"

Quality Issues:
${quality.feedback.join('\n')}

Please rewrite the script to address these specific issues while maintaining the core message and professional tone. Focus on improving engagement, clarity, and professional impact.

Improved Script:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: optimizationPrompt }],
        temperature: 0.5,
        max_tokens: 500
      });

      return response.choices[0]?.message?.content?.trim() || script;
    } catch (error) {
      // Return original script if optimization fails
      return script;
    }
  }

  private getDurationSpecs(duration: string): string {
    switch (duration) {
      case 'short':
        return '30-60 seconds (approximately 75-150 words)';
      case 'medium':
        return '60-90 seconds (approximately 150-225 words)';
      case 'long':
        return '90-120 seconds (approximately 225-300 words)';
      default:
        return '60-90 seconds (approximately 150-225 words)';
    }
  }

  private getMaxTokensForDuration(duration: string): number {
    switch (duration) {
      case 'short': return 200;
      case 'medium': return 350;
      case 'long': return 500;
      default: return 350;
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}