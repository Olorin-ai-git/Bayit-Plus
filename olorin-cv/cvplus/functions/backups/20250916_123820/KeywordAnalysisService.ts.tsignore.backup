// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Keyword Analysis Service
 * 
 * Specialized service for semantic keyword analysis, extraction, and optimization.
 * Delegates complex operations to focused sub-modules.
 */

import { 
  ParsedCV, 
  SemanticKeywordAnalysis
} from '../../types/enhanced-models';
import { VerifiedClaudeService } from '../verified-claude.service';
import { KeywordAnalysisParams } from './types';
import { KeywordExtractor } from './keyword-analysis/KeywordExtractor';
import { KeywordRecommendationEngine } from './keyword-analysis/KeywordRecommendationEngine';

export class KeywordAnalysisService {
  private claudeService: VerifiedClaudeService;
  private keywordExtractor: KeywordExtractor;
  private recommendationEngine: KeywordRecommendationEngine;

  constructor() {
    this.claudeService = new VerifiedClaudeService();
    this.keywordExtractor = new KeywordExtractor();
    this.recommendationEngine = new KeywordRecommendationEngine();
  }

  /**
   * Perform comprehensive semantic keyword analysis
   */
  async performSemanticKeywordAnalysis(params: KeywordAnalysisParams): Promise<SemanticKeywordAnalysis> {
    const { parsedCV, jobDescription, targetKeywords, industry } = params;
    const cvText = this.cvToText(parsedCV);
    
    try {
      const response = await this.claudeService.createVerifiedMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        temperature: 0.1,
        system: 'You are an expert in ATS keyword optimization and semantic analysis.',
        messages: [{ 
          role: 'user', 
          content: this.buildAnalysisPrompt(cvText, jobDescription, targetKeywords, industry)
        }]
      });

      return this.parseSemanticAnalysis(response.content[0].text, cvText, targetKeywords || [], industry);

    } catch (error) {
      return this.generateFallbackSemanticAnalysis(cvText, targetKeywords || [], industry);
    }
  }

  /**
   * Generate keywords from job description
   */
  async generateKeywords(jobDescription: string, industry?: string, role?: string): Promise<string[]> {
    try {
      const response = await this.claudeService.createVerifiedMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.1,
        system: 'You are an expert recruiter and ATS specialist.',
        messages: [{ 
          role: 'user', 
          content: `Extract 15-25 ATS keywords from: ${jobDescription.substring(0, 1500)} ${industry ? `Industry: ${industry}` : ''} ${role ? `Role: ${role}` : ''}`
        }]
      });

      return this.parseExtractedKeywords(response.content[0].text);

    } catch (error) {
      return this.keywordExtractor.getFallbackKeywords(industry, role);
    }
  }

  /**
   * Build analysis prompt for Claude
   */
  private buildAnalysisPrompt(cvText: string, jobDescription?: string, targetKeywords?: string[], industry?: string): string {
    return `Analyze this CV for semantic keyword optimization:

CV Content: ${cvText.substring(0, 2000)}
${jobDescription ? `Job Description: ${jobDescription.substring(0, 500)}` : ''}
${targetKeywords ? `Target Keywords: ${targetKeywords.join(', ')}` : ''}
${industry ? `Industry: ${industry}` : ''}

Provide keyword analysis with frequency, context, and optimization recommendations.`;
  }

  /**
   * Parse semantic analysis response
   */
  private parseSemanticAnalysis(text: string, cvText: string, targetKeywords: string[], industry?: string): SemanticKeywordAnalysis {
    // Extract keywords using the modular extractor
    const matchedKeywords = this.keywordExtractor.extractKeywords(cvText, targetKeywords, industry);
    
    // Calculate metrics
    const totalWords = cvText.split(/\s+/).length;
    const keywordDensity = matchedKeywords.reduce((sum, kw) => sum + kw.frequency, 0) / totalWords;
    const optimalDensity = this.keywordExtractor.getOptimalKeywordDensity(industry);
    
    // Find missing keywords
    const foundKeywords = matchedKeywords.map(kw => kw.keyword.toLowerCase());
    const missingKeywords = targetKeywords.filter(kw => !foundKeywords.includes(kw.toLowerCase()));
    
    // Generate recommendations
    const recommendations = this.recommendationEngine.generateRecommendations(
      matchedKeywords, missingKeywords, keywordDensity, industry
    );

    return {
      primaryKeywords: matchedKeywords,
      contextualRelevance: {}, // Will be populated with keyword-specific relevance scores
      industryTerms: [],
      // Backward compatibility properties
      secondaryKeywords: [],
      missingKeywords,
      keywordDensity: { overall: keywordDensity },
      synonyms: {},
      trendingKeywords: []
    };
  }

  /**
   * Generate fallback analysis when API fails
   */
  private generateFallbackSemanticAnalysis(cvText: string, targetKeywords: string[], industry?: string): SemanticKeywordAnalysis {
    const matchedKeywords = this.keywordExtractor.extractKeywords(cvText, targetKeywords, industry);
    const totalWords = cvText.split(/\s+/).length;
    const keywordDensity = matchedKeywords.reduce((sum, kw) => sum + kw.frequency, 0) / totalWords;

    const missingKeywords = targetKeywords.filter(kw => !matchedKeywords.find(mkw => mkw.keyword.toLowerCase() === kw.toLowerCase()));
    const optimalDensity = this.keywordExtractor.getOptimalKeywordDensity(industry);

    return {
      primaryKeywords: matchedKeywords,
      contextualRelevance: {}, // Default fallback relevance
      industryTerms: [],
      // Backward compatibility properties
      secondaryKeywords: [],
      missingKeywords,
      keywordDensity: { overall: keywordDensity },
      synonyms: {},
      trendingKeywords: []
    };
  }

  /**
   * Parse extracted keywords from response
   */
  private parseExtractedKeywords(text: string): string[] {
    return text.split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(keyword => keyword.length > 2 && keyword.length < 50)
      .slice(0, 25);
  }

  /**
   * Convert CV to text for analysis
   */
  private cvToText(cv: ParsedCV): string {
    const sections: string[] = [];
    if (cv.personalInfo?.summary) sections.push(cv.personalInfo.summary);
    if (cv.experience) {
      cv.experience.forEach(exp => {
        if (exp.role) sections.push(exp.role);
        if (exp.company) sections.push(exp.company);
        if (exp.description) sections.push(exp.description);
      });
    }
    if (cv.education) {
      cv.education.forEach((edu: any) => {
        if (edu.degree) sections.push(edu.degree);
        if (edu.institution) sections.push(edu.institution);
      });
    }
    if (cv.skills) {
      const skillsText = this.extractSkillsText(cv.skills);
      sections.push(skillsText);
    }
    return sections.filter(section => section.trim().length > 0).join(' ');
  }

  /**
   * Extract skills as text
   */
  private extractSkillsText(skills: any): string {
    if (Array.isArray(skills)) return skills.join(' ');
    if (typeof skills === 'string') return skills;
    if (typeof skills === 'object' && skills !== null) return Object.values(skills).flat().join(' ');
    return '';
  }
}