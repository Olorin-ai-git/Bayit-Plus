/**
 * LLM Verification Service
 * 
 * Validates Anthropic Claude responses using OpenAI GPT-4 for quality assurance.
 * Implements retry logic with exponential backoff and comprehensive logging.
  */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/environment';

export interface CustomCriterion {
  name: string;
  description: string;
  weight: number;
}

export interface ValidationCriteria {
  accuracy: boolean;
  completeness: boolean;
  relevance: boolean;
  consistency: boolean;
  safety: boolean;
  format: boolean;
  customCriteria?: CustomCriterion[];
}

export interface VerificationRequest {
  anthropicResponse: string;
  originalPrompt: string;
  context?: string;
  history?: Array<{ role: string; content: string }>;
  service: string;
  maxRetries?: number;
  validationCriteria?: string[];
}

export interface VerificationResult {
  isValid: boolean;
  confidence: number; // 0-1 scale
  qualityScore: number; // 0-100 scale
  issues: string[];
  suggestions: string[];
  retryCount: number;
  processingTimeMs: number;
  finalResponse: string;
}

export interface VerificationConfig {
  maxRetries: number;
  timeoutMs: number;
  enableLogging: boolean;
  validationCriteria: {
    accuracy: boolean;
    completeness: boolean;
    relevance: boolean;
    consistency: boolean;
    safety: boolean;
    format: boolean;
  };
  retryDelayMs: number;
  confidenceThreshold: number;
  qualityThreshold: number;
}

export class LLMVerificationService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private config: VerificationConfig;

  constructor(customConfig?: Partial<VerificationConfig>) {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY || config.openai?.apiKey || ''
    });
    
    this.anthropic = new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });

    // Default configuration
    this.config = {
      maxRetries: 3,
      timeoutMs: 30000,
      enableLogging: true,
      validationCriteria: {
        accuracy: true,
        completeness: true,
        relevance: true,
        consistency: true,
        safety: true,
        format: true
      },
      retryDelayMs: 1000,
      confidenceThreshold: 0.7,
      qualityThreshold: 75,
      ...customConfig
    };

    this.logInfo('LLM Verification Service initialized', {
      maxRetries: this.config.maxRetries,
      timeoutMs: this.config.timeoutMs,
      confidenceThreshold: this.config.confidenceThreshold,
      qualityThreshold: this.config.qualityThreshold
    });
  }

  /**
   * Verify an Anthropic response using OpenAI GPT-4
    */
  async verifyResponse(request: VerificationRequest): Promise<VerificationResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let currentResponse = request.anthropicResponse;
    let finalResult: VerificationResult;

    const maxRetries = request.maxRetries || this.config.maxRetries;

    this.logInfo('Starting LLM verification', {
      service: request.service,
      promptLength: request.originalPrompt.length,
      responseLength: request.anthropicResponse.length,
      maxRetries
    });

    while (retryCount <= maxRetries) {
      try {
        // Step 1: Validate current response with OpenAI
        const validation = await this.validateWithOpenAI(request, currentResponse, retryCount);

        finalResult = {
          isValid: validation.isValid,
          confidence: validation.confidence,
          qualityScore: validation.qualityScore,
          issues: validation.issues,
          suggestions: validation.suggestions,
          retryCount,
          processingTimeMs: Date.now() - startTime,
          finalResponse: currentResponse
        };

        // Step 2: Check if validation passed
        if (validation.isValid) {
          this.logInfo('Verification successful', {
            service: request.service,
            retryCount,
            confidence: validation.confidence,
            qualityScore: validation.qualityScore,
            processingTimeMs: finalResult.processingTimeMs
          });
          return finalResult;
        }

        // Step 3: If validation failed and we have retries left, retry with Anthropic
        if (retryCount < maxRetries) {
          this.logWarning('Verification failed, retrying with Anthropic', {
            service: request.service,
            retryCount: retryCount + 1,
            issues: validation.issues,
            suggestions: validation.suggestions
          });

          // Add delay before retry (exponential backoff)
          await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));

          currentResponse = await this.retryWithAnthropic(request, validation, retryCount + 1);
          retryCount++;
        } else {
          // Max retries reached
          this.logError('Max retries reached, verification failed', {
            service: request.service,
            maxRetries,
            finalIssues: validation.issues
          });
          return finalResult;
        }

      } catch (error) {
        this.logError('Verification process error', {
          service: request.service,
          retryCount,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Return failed result on error
        return {
          isValid: false,
          confidence: 0,
          qualityScore: 0,
          issues: [`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          suggestions: ['Check API connectivity and retry'],
          retryCount,
          processingTimeMs: Date.now() - startTime,
          finalResponse: currentResponse
        };
      }
    }

    // This should not be reached, but just in case
    return finalResult!;
  }

  /**
   * Validate response using OpenAI GPT-4
    */
  private async validateWithOpenAI(
    request: VerificationRequest, 
    responseToValidate: string, 
    retryCount: number
  ): Promise<{
    isValid: boolean;
    confidence: number;
    qualityScore: number;
    issues: string[];
    suggestions: string[];
  }> {
    const validationPrompt = this.buildValidationPrompt(request, responseToValidate, retryCount);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: validationPrompt }],
      temperature: 0.1,
      max_tokens: 1000,
      // timeout: this.config.timeoutMs // Not supported
    });

    const validationResult = response.choices[0].message.content;
    if (!validationResult) {
      throw new Error('Empty validation response from OpenAI');
    }

    return this.parseValidationResult(validationResult);
  }

  /**
   * Retry with Anthropic using feedback from OpenAI validation
    */
  private async retryWithAnthropic(
    request: VerificationRequest,
    validationFailure: { issues: string[]; suggestions: string[] },
    retryAttempt: number
  ): Promise<string> {
    const improvedPrompt = this.buildImprovedPrompt(request, validationFailure, retryAttempt);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: 'user', content: improvedPrompt }],
      // timeout: this.config.timeoutMs // Not supported
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Anthropic');
    }

    return content.text;
  }

  /**
   * Build validation prompt for OpenAI
    */
  private buildValidationPrompt(
    request: VerificationRequest, 
    responseToValidate: string, 
    retryCount: number
  ): string {
    const criteria = request.validationCriteria || Object.keys(this.config.validationCriteria);
    
    return `You are an expert AI response validator. Evaluate the following AI response for quality and correctness.

**SERVICE CONTEXT**: ${request.service}
**RETRY ATTEMPT**: ${retryCount + 1}

**ORIGINAL PROMPT**:
${request.originalPrompt}

**CONTEXT** (if provided):
${request.context || 'No additional context provided'}

**CONVERSATION HISTORY** (if provided):
${request.history ? request.history.map(h => `${h.role}: ${h.content}`).join('\n') : 'No conversation history'}

**AI RESPONSE TO VALIDATE**:
${responseToValidate}

**VALIDATION CRITERIA**:
Please evaluate the response against these criteria: ${criteria.join(', ')}

**REQUIRED OUTPUT FORMAT** (JSON only):
{
  "isValid": boolean,
  "confidence": number (0-1 scale),
  "qualityScore": number (0-100 scale),
  "issues": ["list of specific issues found"],
  "suggestions": ["specific suggestions for improvement"]
}

**VALIDATION RULES**:
- isValid: true only if response meets quality threshold (${this.config.qualityThreshold}+) and confidence threshold (${this.config.confidenceThreshold}+)
- confidence: How confident you are in your assessment
- qualityScore: Overall quality rating (0-100)
- issues: Specific problems with accuracy, completeness, relevance, format, safety
- suggestions: Actionable feedback for improvement

Respond with JSON only, no additional text.`;
  }

  /**
   * Build improved prompt for Anthropic retry
    */
  private buildImprovedPrompt(
    request: VerificationRequest,
    validationFailure: { issues: string[]; suggestions: string[] },
    retryAttempt: number
  ): string {
    return `${request.originalPrompt}

**IMPORTANT**: Your previous response was reviewed and found to have the following issues:
${validationFailure.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

**PLEASE IMPROVE**: Follow these specific suggestions:
${validationFailure.suggestions.map((suggestion, i) => `${i + 1}. ${suggestion}`).join('\n')}

**RETRY ATTEMPT**: ${retryAttempt} of ${this.config.maxRetries}

Please provide an improved response that addresses these issues while maintaining the original requirements.

${request.context ? `\n**ADDITIONAL CONTEXT**: ${request.context}` : ''}

Ensure your response is accurate, complete, relevant, properly formatted, and safe.`;
  }

  /**
   * Parse OpenAI validation result
    */
  private parseValidationResult(validationResult: string): {
    isValid: boolean;
    confidence: number;
    qualityScore: number;
    issues: string[];
    suggestions: string[];
  } {
    try {
      const parsed = JSON.parse(validationResult);
      
      return {
        isValid: Boolean(parsed.isValid),
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
        qualityScore: Math.max(0, Math.min(100, Number(parsed.qualityScore) || 0)),
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      };
    } catch (error) {
      // Fallback parsing for non-JSON responses
      this.logWarning('Failed to parse JSON validation result, using fallback parsing', {
        validationResult: validationResult.substring(0, 200)
      });

      const isValid = validationResult.toLowerCase().includes('valid') || 
                     validationResult.toLowerCase().includes('acceptable');
      
      return {
        isValid,
        confidence: isValid ? 0.6 : 0.3,
        qualityScore: isValid ? 70 : 40,
        issues: ['Could not parse detailed validation result'],
        suggestions: ['Ensure response format is correct and complete']
      };
    }
  }

  /**
   * Sanitize text by removing or masking PII
   */
  private sanitizeForLogging(text: string): string {
    if (!this.config.enableLogging) return '[LOGGING_DISABLED]';
    
    // Remove/mask common PII patterns
    return text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN]')
      .replace(/\b\d{3}-?\d{3}-?\d{4}\b/g, '[PHONE]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CREDIT_CARD]')
      .substring(0, 500) + (text.length > 500 ? '...[TRUNCATED]' : '');
  }

  /**
   * Utility methods for logging
    */
  private logInfo(message: string, data?: any): void {
    if (!this.config.enableLogging) return;
  }

  private logWarning(message: string, data?: any): void {
    if (!this.config.enableLogging) return;
  }

  private logError(message: string, data?: any): void {
    if (!this.config.enableLogging) return;
  }

  /**
   * Delay utility for exponential backoff
    */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check method
    */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const startTime = Date.now();

      // Test OpenAI connectivity
      await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Health check - respond with OK' }],
        max_tokens: 10
      }, { timeout: 5000 });

      // Test Anthropic connectivity  
      await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Health check - respond with OK' }]
      }, { timeout: 5000 });

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        details: {
          responseTimeMs: responseTime,
          openaiStatus: 'connected',
          anthropicStatus: 'connected',
          config: {
            maxRetries: this.config.maxRetries,
            confidenceThreshold: this.config.confidenceThreshold,
            qualityThreshold: this.config.qualityThreshold
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          config: {
            maxRetries: this.config.maxRetries,
            confidenceThreshold: this.config.confidenceThreshold,
            qualityThreshold: this.config.qualityThreshold
          }
        }
      };
    }
  }
}

// Create and export service instance
export const llmVerificationService = new LLMVerificationService();