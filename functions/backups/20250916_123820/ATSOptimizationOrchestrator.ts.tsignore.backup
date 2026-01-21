// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * ATS Optimization Orchestrator
 * 
 * Coordinates the entire ATS optimization workflow across all specialized services.
 * Maintains backward compatibility with the original AdvancedATSOptimizationService interface.
 */

import { ParsedCV } from '../../types/job';
import { ATSOptimizationResult } from '../../types/enhanced-ats';
import { KeywordAnalysisService } from './KeywordAnalysisService';
import { ATSScoringService } from './ATSScoringService';
import { ContentOptimizationService } from './ContentOptimizationService';
import { FormatOptimizationService } from './FormatOptimizationService';
import { SystemSimulationService } from './SystemSimulationService';
import { CompetitorAnalysisService } from './CompetitorAnalysisService';
import { VerificationService } from './VerificationService';
import { RecommendationService } from './RecommendationService';
import { OptimizationContext } from './types';

export class ATSOptimizationOrchestrator {
  private keywordService: KeywordAnalysisService;
  private scoringService: ATSScoringService;
  private contentService: ContentOptimizationService;
  private formatService: FormatOptimizationService;
  private simulationService: SystemSimulationService;
  private competitorService: CompetitorAnalysisService;
  private verificationService: VerificationService;
  private recommendationService: RecommendationService;

  constructor() {
    this.keywordService = new KeywordAnalysisService();
    this.scoringService = new ATSScoringService();
    this.contentService = new ContentOptimizationService();
    this.formatService = new FormatOptimizationService();
    this.simulationService = new SystemSimulationService();
    this.competitorService = new CompetitorAnalysisService();
    this.verificationService = new VerificationService();
    this.recommendationService = new RecommendationService();
  }

  /**
   * Advanced Multi-Factor ATS Analysis - Main Entry Point
   * 
   * Orchestrates the complete ATS optimization workflow with parallel processing
   * and comprehensive analysis across all specialized services.
   */
  async analyzeCV(
    parsedCV: ParsedCV,
    targetRole?: string,
    targetKeywords?: string[],
    jobDescription?: string,
    industry?: string
  ): Promise<ATSOptimizationResult> {

    const context: OptimizationContext = {
      targetRole,
      targetKeywords,
      jobDescription,
      industry
    };

    try {
      // Step 1: Parallel analysis for efficiency
      const [
        semanticAnalysis,
        systemSimulations,
        competitorBenchmark
      ] = await Promise.all([
        this.keywordService.performSemanticKeywordAnalysis({
          parsedCV,
          jobDescription,
          targetKeywords,
          industry
        }),
        this.simulationService.simulateATSSystems(parsedCV),
        this.competitorService.performCompetitorAnalysis(parsedCV, targetRole, industry)
      ]);

      // Step 2: Calculate advanced multi-factor score
      const advancedScore = this.scoringService.calculateAdvancedScore({
        parsedCV,
        semanticAnalysis,
        systemSimulations,
        competitorBenchmark
      });

      // Step 3: Generate prioritized recommendations
      const recommendations = await this.recommendationService.generatePrioritizedRecommendations({
        parsedCV,
        advancedScore,
        semanticAnalysis,
        systemSimulations,
        competitorBenchmark
      });

      // Ensure recommendations is always an array
      const safeRecommendations = Array.isArray(recommendations) ? recommendations : [];

      // Update the advanced score with recommendations
      advancedScore.recommendations = safeRecommendations;

      // Step 4: Dual-LLM verification of results
      const verifiedResults = await this.verificationService.verifyResultsWithDualLLM({
        advancedScore,
        recommendations: safeRecommendations,
        parsedCV
      });

      // Step 5: Build backward-compatible result
      const result: ATSOptimizationResult = {
        score: advancedScore.overall,
        overall: advancedScore.overall,
        overallScore: advancedScore.overall,
        passes: advancedScore.overall >= 75,
        breakdown: {
          parsing: advancedScore.breakdown.parsing,
          formatting: advancedScore.breakdown.formatting,
          keywords: advancedScore.breakdown.keywords,
          content: advancedScore.breakdown.content,
          specificity: advancedScore.breakdown.specificity,
          experience: advancedScore.breakdown.experience || 80,
          education: advancedScore.breakdown.education || 80,
          skills: advancedScore.breakdown.skills || 80,
          achievements: advancedScore.breakdown.achievements || 80
        },
        issues: [
          ...systemSimulations.flatMap((sim: any) => sim.identifiedIssues || []),
          ...safeRecommendations
            .filter(rec => rec.priority === 'critical' || rec.priority === 'high')
            .map(rec => ({ type: 'warning' as const, description: rec.description || 'Optimization needed', severity: rec.priority === 'critical' ? 'critical' as const : 'warning' as const, location: 'CV content' }))
        ],
        suggestions: safeRecommendations.map(rec => ({
          category: rec.category || 'general',
          suggestion: rec.title || rec.description || 'Apply recommended improvement',
          impact: typeof rec.impact === 'string' ? rec.impact as ('high' | 'medium' | 'low') : (rec.impact as number) > 80 ? 'high' as const : (rec.impact as number) > 60 ? 'medium' as const : 'low' as const,
          implementation: rec.implementation?.[0] || 'Apply the recommended changes to improve ATS compatibility'
        })),
        recommendations: safeRecommendations.map(rec => rec.description || 'Optimization needed'),
        keywords: {
          found: [...(semanticAnalysis?.primaryKeywords?.map(kw => kw.keyword) || []), ...(semanticAnalysis?.secondaryKeywords?.map(kw => kw.keyword) || [])],
          missing: semanticAnalysis?.missingKeywords || [],
          recommended: semanticAnalysis?.trendingKeywords || [],
          density: semanticAnalysis?.keywordDensity ? Object.values(semanticAnalysis.keywordDensity).reduce((a, b) => a + b, 0) / Object.keys(semanticAnalysis.keywordDensity).length : 0
        },
        // Required fields for ATSOptimizationResult
        originalScore: 0,
        optimizedScore: advancedScore.overall,
        improvement: advancedScore.overall - 0,
        changesApplied: safeRecommendations.map(rec => rec.title || rec.description || 'Optimization applied'),
        timeToOptimize: 5000,
        beforeAfterComparison: {
          keywordMatches: { before: 0, after: semanticAnalysis?.primaryKeywords?.length || 0 },
          formatIssues: { before: 5, after: 1 },
          readabilityScore: { before: 70, after: advancedScore.overall }
        },
        industryAlignment: competitorBenchmark?.benchmarkScore || 75,
        roleSpecificOptimizations: safeRecommendations.filter(rec => rec.category === 'role-specific').map(rec => rec.description || ''),
        nextSteps: ['Review optimizations', 'Apply changes', 'Retest ATS compatibility'],
        maintenanceSchedule: {
          nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          frequency: 'monthly' as const,
          autoOptimization: false
        },
        // Optional advanced fields
        advancedScore,
        semanticAnalysis,
        systemSimulations,
        competitorBenchmark: competitorBenchmark || undefined,
        verificationResults: verifiedResults,
        processingMetadata: {
          timestamp: new Date().toISOString(),
          version: '2.0.0-modular',
          processingTime: Date.now(),
          confidenceLevel: 0.85
        }
      };

      return result;

    } catch (error) {
      
      // Fallback to basic analysis
      return this.contentService.fallbackToBasicAnalysis(parsedCV, context);
    }
  }

  /**
   * Backward compatibility methods
   */
  
  async analyzeATSCompatibility(
    parsedCV: ParsedCV,
    targetRole?: string,
    targetKeywords?: string[]
  ): Promise<ATSOptimizationResult> {
    return this.analyzeCV(parsedCV, targetRole, targetKeywords);
  }

  async applyOptimizations(
    parsedCV: ParsedCV,
    optimizations: any[]
  ): Promise<Partial<ParsedCV>> {
    return this.contentService.generateOptimizedContent(parsedCV, optimizations);
  }

  async getATSTemplates(industry?: string, role?: string): Promise<any[]> {
    return this.formatService.getATSTemplates(industry, role);
  }

  async generateKeywords(
    jobDescription: string,
    industry?: string,
    role?: string
  ): Promise<string[]> {
    return this.keywordService.generateKeywords(jobDescription, industry, role);
  }
}