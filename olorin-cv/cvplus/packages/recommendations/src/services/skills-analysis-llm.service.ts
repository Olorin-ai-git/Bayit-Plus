/**
 * Skills Analysis LLM Service
 *
 * Moved from admin module - contains skills analysis business logic that belongs in recommendations module.
 * This service provides skills analysis capabilities using LLM integration for career recommendations.
 */

import {
  VerifiedClaudeService,
  VerifiedMessageOptions
} from '@cvplus/admin/backend/services/verified-claude.service';
import { ValidationCriteria } from '@cvplus/admin/backend/services/llm-verification.service';

export interface SkillsAnalysisOptions {
  includeMarketAnalysis?: boolean;
  targetRole?: string;
  industry?: string;
}

export interface SkillsAnalysisResponse {
  content: string;
  verified?: boolean;
  verificationScore?: number;
  auditId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Skills Analysis LLM Service with enhanced validation
 */
export class SkillsAnalysisLLMService {
  private verifiedClaudeService: VerifiedClaudeService;

  constructor() {
    this.verifiedClaudeService = new VerifiedClaudeService();
  }

  async analyzeSkills(
    cvData: any,
    options?: SkillsAnalysisOptions
  ): Promise<SkillsAnalysisResponse> {
    const prompt = this.buildSkillsAnalysisPrompt(cvData, options);

    const verifiedRequest: VerifiedMessageOptions = {
      prompt: `You are a skills analysis expert specializing in technical and professional competencies assessment.\n\n${prompt}`,
      model: 'claude-sonnet-4-20250514',
      messages: [{
        role: 'user',
        content: `You are a skills analysis expert specializing in technical and professional competencies assessment.\n\n${prompt}`
      }],
      maxTokens: 3000,
      temperature: 0.1
    };

    try {
      const response = await this.verifiedClaudeService.createVerifiedMessage(verifiedRequest);

      return {
        content: Array.isArray(response.content) ? response.content.map(c => c.content || '').join('') : String(response.content || response.response || ''),
        verified: response.verification?.verified || false,
        verificationScore: response.verification?.confidence || 0,
        auditId: `audit-${Date.now()}`,
        usage: response.usage ? {
          inputTokens: response.usage.inputTokens || 0,
          outputTokens: response.usage.outputTokens || 0
        } : undefined
      };

    } catch (error) {
      throw error;
    }
  }

  private buildSkillsAnalysisPrompt(cvData: any, options?: SkillsAnalysisOptions): string {
    return `Analyze the skills and competencies from this CV data and provide detailed assessment.

CV DATA:
${JSON.stringify(cvData, null, 2)}

${options?.targetRole ? `TARGET ROLE: ${options.targetRole}` : ''}
${options?.industry ? `INDUSTRY: ${options.industry}` : ''}

Provide analysis in JSON format:
{
  "skillsBreakdown": {
    "technical": [
      {
        "name": string,
        "category": string,
        "proficiencyLevel": "beginner|intermediate|advanced|expert",
        "yearsOfExperience": number,
        "marketDemand": "low|medium|high",
        "evidence": [string]
      }
    ],
    "soft": [similar structure],
    "certifications": [similar structure]
  },
  "overallAssessment": {
    "strengths": [string],
    "gaps": [string],
    "recommendations": [string]
  },
  "marketAlignment": {
    "score": number,
    "analysis": string,
    "improvementAreas": [string]
  }
}`;
  }
}

// Export default instance for convenience
export const skillsAnalysisService = new SkillsAnalysisLLMService();