/**
 * Enhanced Prompt Engine Service
 *
 * Facade for the modular prompt engine system.
 * Maintains backward compatibility while delegating to specialized modules.
 *
 * REFACTORED: Original 1,292-line file decomposed into focused modules
 * under ./prompt-engine/ directory for better maintainability.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

import { ParsedCV } from '@cvplus/core/types/enhanced-models';
import { IndustryTemplate } from '@cvplus/core/types/industry-specialization';

// Import from modular components
export * from './prompt-engine';
import {
  CorePromptEngine,
  PromptEngineOptions,
  EnhancedScriptResult,
  VideoGenerationOptions,
  PersonalityProfile,
  ScriptQualityMetrics,
  PromptEngineError,
  PromptEngineErrorType
} from './prompt-engine';

/**
 * Main Advanced Prompt Engine class
 *
 * Provides backward compatibility interface while delegating
 * to the new modular CorePromptEngine system.
  */
export class AdvancedPromptEngine {
  private coreEngine: CorePromptEngine;

  constructor() {
    this.coreEngine = new CorePromptEngine();
  }

  /**
   * Generates enhanced video script using multi-layer prompt architecture
   *
   * @param cv Parsed CV data
   * @param options Generation options
   * @param industryTemplate Optional industry-specific template
   * @returns Enhanced script result with quality metrics
    */
  async generateEnhancedScript(
    cv: ParsedCV,
    options: PromptEngineOptions = {},
    industryTemplate?: IndustryTemplate
  ): Promise<EnhancedScriptResult> {
    return this.coreEngine.generateEnhancedScript(cv, options, industryTemplate);
  }
}

/**
 * Enhanced version with fallback capabilities
 *
 * Provides additional resilience for production environments
 * with automatic fallback strategies.
  */
export class EnhancedPromptEngineWithFallbacks extends AdvancedPromptEngine {
  private fallbackAttempts: number = 0;
  private maxFallbackAttempts: number = 3;

  async generateEnhancedScript(
    cv: ParsedCV,
    options: PromptEngineOptions = {},
    industryTemplate?: IndustryTemplate
  ): Promise<EnhancedScriptResult> {
    try {
      // Reset fallback counter on new request
      this.fallbackAttempts = 0;
      return await this.generateWithFallbacks(cv, options, industryTemplate);
    } catch (error) {
      throw new PromptEngineError(
        `All fallback attempts exhausted: ${error instanceof Error ? error.message : 'Unknown error'}`,
        PromptEngineErrorType.PRODUCTION_FAILED,
        { fallbackAttempts: this.fallbackAttempts, maxAttempts: this.maxFallbackAttempts },
        error
      );
    }
  }

  private async generateWithFallbacks(
    cv: ParsedCV,
    options: PromptEngineOptions,
    industryTemplate?: IndustryTemplate,
    attemptLevel: 'enhanced' | 'simplified' | 'minimal' = 'enhanced'
  ): Promise<EnhancedScriptResult> {
    try {
      if (this.fallbackAttempts >= this.maxFallbackAttempts) {
        throw new PromptEngineError(
          'Maximum fallback attempts reached',
          PromptEngineErrorType.PRODUCTION_FAILED
        );
      }

      let result: EnhancedScriptResult;

      switch (attemptLevel) {
        case 'enhanced':
          result = await super.generateEnhancedScript(cv, options, industryTemplate);
          break;
        case 'simplified':
          result = await this.generateSimplifiedEnhanced(cv, options);
          break;
        case 'minimal':
          result = await this.generateMinimalEnhanced(cv, options);
          break;
      }

      return result;
    } catch (error) {
      this.fallbackAttempts++;

      // Try next fallback level
      if (attemptLevel === 'enhanced') {
        return this.generateWithFallbacks(cv, options, industryTemplate, 'simplified');
      } else if (attemptLevel === 'simplified') {
        return this.generateWithFallbacks(cv, options, industryTemplate, 'minimal');
      } else {
        // Final fallback - return basic script
        return this.generateBasicFallback(cv, options);
      }
    }
  }

  private async generateSimplifiedEnhanced(
    cv: ParsedCV,
    options: PromptEngineOptions
  ): Promise<EnhancedScriptResult> {
    // Simplified version with reduced complexity
    const simplifiedOptions: PromptEngineOptions = {
      ...options,
      optimizationLevel: 'basic'
    };

    return super.generateEnhancedScript(cv, simplifiedOptions);
  }

  private async generateMinimalEnhanced(
    cv: ParsedCV,
    options: PromptEngineOptions
  ): Promise<EnhancedScriptResult> {
    // Minimal version with basic features only
    const minimalOptions: PromptEngineOptions = {
      duration: options.duration || 'short',
      style: 'professional',
      optimizationLevel: 'basic'
    };

    return super.generateEnhancedScript(cv, minimalOptions);
  }

  private async generateBasicFallback(
    cv: ParsedCV,
    _options: PromptEngineOptions
  ): Promise<EnhancedScriptResult> {
    // Basic fallback script generation
    const name = cv.personalInfo?.name || 'Professional';
    const title = cv.experience?.[0]?.position || 'Experienced Professional';
    const company = cv.experience?.[0]?.company || 'their organization';

    const basicScript = `Hello, I'm ${name}, a dedicated ${title} at ${company}. ` +
      `I bring expertise and passion to everything I do, with a track record of delivering results. ` +
      `I'm always looking for opportunities to make a meaningful impact and drive success.`;

    return {
      script: basicScript,
      quality: {
        overallScore: 6.0,
        engagementScore: 6.0,
        industryAlignment: 0.6,
        personalityMatch: 0.6,
        technicalAccuracy: 0.7,
        deliveryOptimization: 0.7,
        professionalImpact: 0.6,
        feedback: ['Basic fallback script generated due to system limitations']
      },
      personalityProfile: {
        communicationStyle: 'direct',
        leadershipType: 'operational',
        technicalDepth: 'generalist',
        industryFocus: 'general',
        careerStage: 'mid',
        personalityTraits: ['professional']
      },
      metadata: {
        generationTime: 100,
        tokensUsed: 50,
        optimizationLevel: 'fallback',
        layersApplied: ['basic'],
        fallbacksUsed: this.fallbackAttempts
      }
    };
  }
}

// Export types for backward compatibility
export type {
  VideoGenerationOptions,
  PromptEngineOptions,
  PersonalityProfile,
  ScriptQualityMetrics,
  EnhancedScriptResult
};

export {
  PromptEngineErrorType,
  PromptEngineError
};