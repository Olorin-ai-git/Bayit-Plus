/**
 * @cvplus/recommendations - AI Integration Service
 * 
 * Comprehensive AI service wrapper for Anthropic Claude with advanced features:
 * - Role-based CV analysis and recommendations
 * - Skills gap identification
 * - Career path mapping
 * - Industry-specific optimization
 * - Smart content generation with placeholders
 * - Rate limiting and quota management
 * 
 * @author Gil Klainert
 * @version 1.0.0 - Full Implementation
  */

import type { 
  AIRequestParams, 
  AIResponse, 
  RateLimitConfig,
  CVParsedData,
  Recommendation,
  RecommendationType,
  RecommendationCategory,
  CVSection,
  ActionType,
  ImpactLevel,
  Placeholder,
  PlaceholderType,
  CVAnalysisResult,
  RoleMatchingResult,
  MatchingFactor,
  GapAnalysis
} from '../types';

// ============================================================================
// AI PROMPT TEMPLATES
// ============================================================================

const AI_PROMPTS = {
  CV_ANALYSIS: `
Analyze the provided CV data and generate comprehensive improvement recommendations.

CV Data:
{cvData}

Target Role: {targetRole}
Industry Keywords: {industryKeywords}

Please provide:
1. Overall CV score (0-100)
2. Section-by-section analysis
3. Specific improvement recommendations
4. Skills gap identification
5. ATS optimization suggestions
6. Career advancement opportunities

Format as structured JSON with the following structure:
{
  "overallScore": number,
  "sectionScores": { "section": score },
  "recommendations": [{
    "type": "content|structure|keyword_optimization|section_addition|formatting|ats_optimization",
    "category": "professional_summary|experience|skills|achievements|education|ats_optimization|general",
    "section": "section_name",
    "action": "add|modify|remove|reformat|reorganize",
    "title": "Brief title",
    "description": "Detailed explanation",
    "suggestedContent": "Specific content suggestion",
    "currentContent": "Current content (if modifying)",
    "impact": "high|medium|low",
    "priority": 1-10,
    "estimatedScoreImprovement": number,
    "placeholders": [{
      "name": "placeholder_name",
      "type": "text|number|dropdown|multiline|date",
      "description": "What user should enter",
      "required": boolean,
      "options": ["option1", "option2"] // for dropdown type
    }]
  }],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "missingElements": ["element1", "element2"],
  "atsCompatibility": number
}
`,

  ROLE_MATCHING: `
Analyze how well the CV matches the target role and provide specific recommendations.

CV Data:
{cvData}

Target Role: {targetRole}
Role Requirements: {roleRequirements}
Industry: {industry}

Provide detailed role matching analysis including:
1. Overall match score (0-100)
2. Matching factors breakdown
3. Gap analysis
4. Role-specific recommendations
5. Career development roadmap

Format as JSON.
`,

  CONTENT_ENHANCEMENT: `
Enhance the following CV content for maximum impact:

Original Content:
{originalContent}

Section: {section}
Target Role: {targetRole}
Industry Context: {industryContext}
Optimization Goals: {goals}

Provide:
1. Enhanced content with industry keywords
2. Action-oriented language
3. Quantifiable achievements where possible
4. ATS-friendly formatting
5. Multiple variations to choose from

Format as structured response with original and enhanced versions.
`,

  SKILLS_GAP_ANALYSIS: `
Perform comprehensive skills gap analysis:

Current Skills:
{currentSkills}

Target Role Requirements:
{roleRequirements}

Industry Trends:
{industryTrends}

Provide:
1. Missing critical skills
2. Skills to improve/advance
3. Learning recommendations with priorities
4. Certification suggestions
5. Timeline for skill development

Format as actionable development plan.
`
};

// ============================================================================
// RATE LIMITING & QUOTA MANAGEMENT
// ============================================================================

interface RateLimiter {
  canMakeRequest(): boolean;
  recordRequest(tokensUsed: number): void;
  getRemainingQuota(): { requests: number; tokens: number };
  resetQuota(): void;
}

class TokenBucketRateLimiter implements RateLimiter {
  private requestTokens: number;
  private tokenUsageCount: number;
  private lastRefill: number;
  private readonly maxRequests: number;
  private readonly maxTokens: number;
  private readonly refillInterval: number;

  constructor(config: RateLimitConfig) {
    this.maxRequests = config.requestsPerMinute;
    this.maxTokens = config.tokenLimitPerMinute;
    this.refillInterval = 60000; // 1 minute
    this.requestTokens = this.maxRequests;
    this.tokenUsageCount = 0;
    this.lastRefill = Date.now();
  }

  canMakeRequest(): boolean {
    this.refillTokens();
    return this.requestTokens > 0 && this.tokenUsageCount < this.maxTokens;
  }

  recordRequest(tokensUsed: number): void {
    this.requestTokens--;
    this.tokenUsageCount += tokensUsed;
  }

  getRemainingQuota() {
    this.refillTokens();
    return {
      requests: Math.max(0, this.requestTokens),
      tokens: Math.max(0, this.maxTokens - this.tokenUsageCount)
    };
  }

  resetQuota(): void {
    this.requestTokens = this.maxRequests;
    this.tokenUsageCount = 0;
    this.lastRefill = Date.now();
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed >= this.refillInterval) {
      const intervals = Math.floor(elapsed / this.refillInterval);
      this.requestTokens = Math.min(this.maxRequests, this.requestTokens + intervals);
      this.tokenUsageCount = Math.max(0, this.tokenUsageCount - (intervals * this.maxTokens));
      this.lastRefill = now;
    }
  }
}

// ============================================================================
// AI INTEGRATION SERVICE
// ============================================================================

export class AIIntegrationService {
  private rateLimiter: RateLimiter;
  private defaultConfig: RateLimitConfig;
  private apiKey: string;
  private baseUrl: string;

  constructor(config?: { apiKey?: string; rateLimit?: RateLimitConfig }) {
    this.defaultConfig = {
      requestsPerMinute: 50,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      tokenLimitPerMinute: 100000,
      tokenLimitPerHour: 500000
    };
    
    this.rateLimiter = new TokenBucketRateLimiter(config?.rateLimit || this.defaultConfig);
    this.apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    
    if (!this.apiKey) {
      logger.warn('[AIIntegrationService] No API key provided. Using mock responses.');
    }
  }

  // ============================================================================
  // CORE AI METHODS
  // ============================================================================

  /**
   * Generate comprehensive CV recommendations using Claude AI
    */
  async generateRecommendations(params: AIRequestParams): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.rateLimiter.canMakeRequest()) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      const prompt = this.buildPrompt(AI_PROMPTS.CV_ANALYSIS, {
        cvData: JSON.stringify(params.cvData, null, 2),
        targetRole: params.targetRole || 'General',
        industryKeywords: params.industryKeywords?.join(', ') || 'N/A'
      });

      const response = await this.makeAIRequest({
        prompt,
        maxTokens: params.maxTokens || 4000,
        temperature: params.temperature || 0.3
      });

      this.rateLimiter.recordRequest(response.tokensUsed);

      return {
        ...response,
        processingTime: Date.now() - startTime,
        confidence: 0.92 // High confidence for structured analysis
      };
    } catch (error) {
      logger.error('[AIIntegrationService] Error generating recommendations:', error);
      return this.createErrorResponse(error as Error, Date.now() - startTime);
    }
  }

  /**
   * Analyze CV-role compatibility and provide matching insights
    */
  async analyzeRoleMatch(
    cvData: CVParsedData, 
    targetRole: string, 
    roleRequirements?: string[],
    industry?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.rateLimiter.canMakeRequest()) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      const prompt = this.buildPrompt(AI_PROMPTS.ROLE_MATCHING, {
        cvData: JSON.stringify(cvData, null, 2),
        targetRole,
        roleRequirements: roleRequirements?.join('\n- ') || 'Not specified',
        industry: industry || 'General'
      });

      const response = await this.makeAIRequest({
        prompt,
        maxTokens: 3000,
        temperature: 0.2
      });

      this.rateLimiter.recordRequest(response.tokensUsed);

      return {
        ...response,
        processingTime: Date.now() - startTime,
        confidence: 0.88
      };
    } catch (error) {
      logger.error('[AIIntegrationService] Error analyzing role match:', error);
      return this.createErrorResponse(error as Error, Date.now() - startTime);
    }
  }

  /**
   * Enhance specific CV content with AI-powered improvements
    */
  async enhanceContent(
    originalContent: string,
    section: CVSection,
    targetRole?: string,
    industryContext?: string,
    goals?: string[]
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.rateLimiter.canMakeRequest()) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      const prompt = this.buildPrompt(AI_PROMPTS.CONTENT_ENHANCEMENT, {
        originalContent,
        section,
        targetRole: targetRole || 'General',
        industryContext: industryContext || 'General',
        goals: goals?.join(', ') || 'General improvement'
      });

      const response = await this.makeAIRequest({
        prompt,
        maxTokens: 2000,
        temperature: 0.4
      });

      this.rateLimiter.recordRequest(response.tokensUsed);

      return {
        ...response,
        processingTime: Date.now() - startTime,
        confidence: 0.85
      };
    } catch (error) {
      logger.error('[AIIntegrationService] Error enhancing content:', error);
      return this.createErrorResponse(error as Error, Date.now() - startTime);
    }
  }

  /**
   * Perform comprehensive skills gap analysis
    */
  async analyzeSkillsGap(
    currentSkills: string[],
    roleRequirements: string[],
    industryTrends?: string[]
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.rateLimiter.canMakeRequest()) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      const prompt = this.buildPrompt(AI_PROMPTS.SKILLS_GAP_ANALYSIS, {
        currentSkills: currentSkills.join('\n- '),
        roleRequirements: roleRequirements.join('\n- '),
        industryTrends: industryTrends?.join('\n- ') || 'Standard industry practices'
      });

      const response = await this.makeAIRequest({
        prompt,
        maxTokens: 3000,
        temperature: 0.3
      });

      this.rateLimiter.recordRequest(response.tokensUsed);

      return {
        ...response,
        processingTime: Date.now() - startTime,
        confidence: 0.90
      };
    } catch (error) {
      logger.error('[AIIntegrationService] Error analyzing skills gap:', error);
      return this.createErrorResponse(error as Error, Date.now() - startTime);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check API availability and quotas
    */
  getServiceHealth() {
    const quota = this.rateLimiter.getRemainingQuota();
    return {
      available: !!this.apiKey,
      quotas: {
        remainingRequests: quota.requests,
        remainingTokens: quota.tokens
      },
      rateLimit: this.defaultConfig
    };
  }

  /**
   * Reset rate limiting quotas (for testing)
    */
  resetQuota(): void {
    this.rateLimiter.resetQuota();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private buildPrompt(template: string, variables: Record<string, string>): string {
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return prompt;
  }

  private async makeAIRequest(params: {
    prompt: string;
    maxTokens: number;
    temperature: number;
  }): Promise<AIResponse> {
    // If no API key, return mock response for development
    if (!this.apiKey) {
      return this.createMockResponse(params.prompt);
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          messages: [{
            role: 'user',
            content: params.prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.content[0]?.text || '',
        model: data.model || 'claude-3-sonnet',
        tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens || 0,
        processingTime: 0, // Will be set by caller
        confidence: 0.90,
        finishReason: data.stop_reason || 'stop'
      };
    } catch (error) {
      logger.error('[AIIntegrationService] API request failed:', error);
      throw error;
    }
  }

  private createMockResponse(prompt: string): AIResponse {
    // Generate realistic mock responses based on prompt type
    let mockContent = '';
    
    if (prompt.includes('CV_ANALYSIS')) {
      mockContent = JSON.stringify({
        overallScore: 75,
        sectionScores: {
          personalInfo: 85,
          professionalSummary: 70,
          experience: 80,
          skills: 75,
          education: 85,
          formatting: 65
        },
        recommendations: [
          {
            type: 'content',
            category: 'professional_summary',
            section: 'professional_summary',
            action: 'modify',
            title: 'Enhance Professional Summary',
            description: 'Add more specific achievements and quantifiable results to make your summary more compelling.',
            suggestedContent: 'Results-driven {role} with {years} years of experience in {industry}, achieving {achievement} and leading teams of {team_size}+ professionals.',
            impact: 'high',
            priority: 9,
            estimatedScoreImprovement: 12,
            placeholders: [
              { name: 'role', type: 'text', description: 'Your target role/title', required: true },
              { name: 'years', type: 'number', description: 'Years of experience', required: true },
              { name: 'industry', type: 'text', description: 'Your industry/field', required: true },
              { name: 'achievement', type: 'text', description: 'Key achievement with metrics', required: false },
              { name: 'team_size', type: 'number', description: 'Size of teams managed', required: false }
            ]
          }
        ],
        strengths: ['Strong technical background', 'Diverse experience', 'Good educational foundation'],
        weaknesses: ['Missing quantifiable achievements', 'Generic professional summary', 'Limited industry keywords'],
        missingElements: ['Key performance indicators', 'Industry certifications', 'Leadership examples'],
        atsCompatibility: 72
      }, null, 2);
    } else {
      mockContent = 'Mock AI response for development purposes.';
    }

    return {
      content: mockContent,
      model: 'mock-claude-3-sonnet',
      tokensUsed: Math.floor(Math.random() * 1000) + 500,
      processingTime: Math.floor(Math.random() * 2000) + 1000,
      confidence: 0.88,
      finishReason: 'stop'
    };
  }

  private createErrorResponse(error: Error, processingTime: number): AIResponse {
    return {
      content: JSON.stringify({ error: error.message }),
      model: 'error',
      tokensUsed: 0,
      processingTime,
      confidence: 0,
      finishReason: 'error'
    };
  }
}