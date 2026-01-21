// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { ParsedCV } from '../types/job';
import { VerifiedClaudeService } from './verified-claude.service';
import { PlaceholderManager, PlaceholderInfo } from '@cvplus/core/services/placeholder-manager.service';
import { EnhancedRoleDetectionService } from './enhanced-role-detection.service';
import { RoleProfileService } from '@cvplus/core/services/role-profile.service';
import {
  RoleProfile,
  RoleMatchResult,
  RoleProfileAnalysis,
  RoleBasedRecommendation
} from '@cvplus/core/types/role-profile.types';
import { EnrichmentService, EnrichmentResult } from './external-data/enrichment/enrichment.service';
import { EnrichedCVData } from './external-data/types';

export interface CVRecommendation {
  id: string;
  type: 'content' | 'structure' | 'formatting' | 'section_addition' | 'keyword_optimization';
  category: 'professional_summary' | 'experience' | 'skills' | 'education' | 'achievements' | 'formatting' | 'ats_optimization';
  title: string;
  description: string;
  currentContent?: string;
  suggestedContent?: string;
  customizedContent?: string; // Content after user has filled placeholders
  placeholders?: PlaceholderInfo[]; // Detected placeholders in suggestedContent
  isCustomized?: boolean; // Whether user has customized placeholders
  impact: 'high' | 'medium' | 'low';
  priority: number;
  section: string;
  actionRequired: 'replace' | 'add' | 'modify' | 'reformat';
  keywords?: string[];
  estimatedScoreImprovement: number;
  // Enhanced with role profile integration
  roleBasedRecommendation?: RoleBasedRecommendation;
  roleProfileId?: string;
  enhancementTemplate?: string;
}

export interface CVTransformationResult {
  originalCV: ParsedCV;
  improvedCV: ParsedCV;
  appliedRecommendations: CVRecommendation[];
  transformationSummary: {
    totalChanges: number;
    sectionsModified: string[];
    newSections: string[];
    keywordsAdded: string[];
    estimatedScoreIncrease: number;
  };
  comparisonReport: {
    beforeAfter: Array<{
      section: string;
      before: string;
      after: string;
      improvement: string;
    }>;
  };
  // Enhanced with role profile analysis
  roleAnalysis?: RoleProfileAnalysis;
  detectedRole?: RoleMatchResult;
  roleEnhancedRecommendations?: CVRecommendation[];
}

export class CVTransformationService {
  private claudeService: VerifiedClaudeService;
  private roleDetectionService: EnhancedRoleDetectionService;
  private roleProfileService: RoleProfileService;
  private enrichmentService: EnrichmentService;

  constructor() {
    this.claudeService = new VerifiedClaudeService();
    this.roleDetectionService = new EnhancedRoleDetectionService();
    this.roleProfileService = new RoleProfileService();
    this.enrichmentService = new EnrichmentService();
  }

  /**
   * Enhanced method that combines role detection with CV recommendations
   */
  async generateRoleEnhancedRecommendations(
    parsedCV: ParsedCV,
    enableRoleDetection: boolean = true,
    targetRole?: string,
    industryKeywords?: string[],
    externalData?: Partial<EnrichedCVData>
  ): Promise<CVRecommendation[]> {
    
    try {
      let roleAnalysis: RoleProfileAnalysis | null = null;
      let roleEnhancedRecommendations: CVRecommendation[] = [];
      
      // Step 1: Perform role detection if enabled
      if (enableRoleDetection) {
        roleAnalysis = await this.roleDetectionService.detectRoles(parsedCV);
        
        if (roleAnalysis.primaryRole.confidence > 0.6) {
          
          // Convert role-based recommendations to CV recommendations
          roleEnhancedRecommendations = await this.convertRoleRecommendationsToCVRecommendations(
            roleAnalysis.enhancementSuggestions.immediate,
            roleAnalysis.primaryRole
          );
          
          // Update target role if not specified
          if (!targetRole) {
            targetRole = roleAnalysis.primaryRole.roleName;
          }
        }
      }
      
      // Step 2: Enrich CV with external data if available
      let enrichedCV = parsedCV;
      let enrichmentResult: EnrichmentResult | null = null;
      
      if (externalData) {
        try {
          console.log('Enriching CV with external data');
          enrichmentResult = await this.enrichmentService.enrichCV(parsedCV, externalData);
          enrichedCV = enrichmentResult.enrichedCV;
          console.log(`CV enriched. Quality improved by ${enrichmentResult.qualityImprovement.improvement}%`);
        } catch (error) {
          console.error('Failed to enrich CV with external data:', error);
          // Continue with original CV if enrichment fails
        }
      }
      
      // Step 3: Generate standard recommendations
      const standardRecommendations = await this.generateDetailedRecommendations(
        enrichedCV,
        targetRole,
        industryKeywords
      );
      
      // Step 4: Add enrichment-based recommendations if data was enriched
      let enrichmentRecommendations: CVRecommendation[] = [];
      if (enrichmentResult && enrichmentResult.qualityImprovement.improvement > 10) {
        enrichmentRecommendations = this.generateEnrichmentRecommendations(enrichmentResult);
      }
      
      // Step 5: Merge and prioritize all recommendations
      const mergedRecommendations = this.mergeAllRecommendations(
        standardRecommendations,
        roleEnhancedRecommendations,
        enrichmentRecommendations,
        roleAnalysis?.primaryRole
      );
      
      
      return mergedRecommendations;
      
    } catch (error) {
      
      // Try fallback to standard recommendations first
      try {
        return await this.generateDetailedRecommendations(parsedCV, targetRole, industryKeywords);
      } catch (fallbackError) {
        
        // Final fallback to quota-aware recommendations
        if (this.isQuotaExceededError(error) || this.isQuotaExceededError(fallbackError)) {
          const quotaFallbackRecs = this.generateQuotaFallbackRecommendations(parsedCV);
          return this.processRecommendationsWithPlaceholders(quotaFallbackRecs);
        }
        
        // Ultimate fallback
        const basicFallbackRecs = this.generateFallbackRecommendations(parsedCV);
        const validatedRecs = this.ensureRecommendationsValid(basicFallbackRecs);
        return this.processRecommendationsWithPlaceholders(validatedRecs);
      }
    }
  }

  /**
   * Analyzes CV and generates specific, actionable recommendations
   */
  async generateDetailedRecommendations(
    parsedCV: ParsedCV, 
    targetRole?: string,
    industryKeywords?: string[]
  ): Promise<CVRecommendation[]> {
    
    const analysisPrompt = this.buildAnalysisPrompt(parsedCV, targetRole, industryKeywords);
    
    try {
      
      const response = await this.claudeService.createVerifiedMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.3,
        system: `You are an expert CV transformation specialist. Analyze the provided CV and generate SUBSTANTIAL, impactful recommendations that dramatically improve the content quality and professional presentation.

CRITICAL REQUIREMENTS:
1. Base recommendations ONLY on the actual content provided
2. NEVER invent specific numbers, metrics, team sizes, or financial figures
3. For quantifiable improvements, use placeholder templates like "[INSERT TEAM SIZE]" or "[ADD PERCENTAGE IMPROVEMENT]"
4. Make SIGNIFICANT improvements that are clearly visible when compared side-by-side
5. Transform weak, passive descriptions into compelling, achievement-focused statements
6. Use strong action verbs and professional language throughout
7. Ensure ATS compatibility with relevant keywords from the actual CV
8. When existing content lacks metrics, suggest adding them without providing fake numbers
9. IMPORTANT: Return ONLY valid JSON - no markdown formatting, no code blocks, no explanatory text
10. Focus on HIGH-IMPACT changes that substantially enhance the CV's professional quality

Return a JSON array of recommendations following this exact structure:
{
  "recommendations": [
    {
      "id": "unique_id",
      "type": "content|structure|formatting|section_addition|keyword_optimization",
      "category": "professional_summary|experience|skills|education|achievements|formatting|ats_optimization",
      "title": "Brief title of improvement",
      "description": "Detailed explanation of why this improvement is needed",
      "currentContent": "Exact current text (if applicable)",
      "suggestedContent": "Specific improved text to replace current content",
      "impact": "high|medium|low",
      "priority": 1-10,
      "section": "Section name this applies to",
      "actionRequired": "replace|add|modify|reformat",
      "keywords": ["relevant", "keywords"],
      "estimatedScoreImprovement": 5-25
    }
  ]
}`,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        try {
          // Clean the response text to remove markdown code blocks
          let cleanText = content.text.trim();
          
          // Remove markdown code blocks if present
          if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const parsed = JSON.parse(cleanText);
          const recommendations = parsed.recommendations || [];
          
          
          // Validate and ensure all recommendations have required fields
          const validatedRecommendations = this.ensureRecommendationsValid(recommendations);
          
          // Process each recommendation to detect placeholders
          return this.processRecommendationsWithPlaceholders(validatedRecommendations);
        } catch (parseError) {
          
          // Fallback: extract recommendations from text response
          const fallbackRecs = this.extractRecommendationsFromText(content.text, parsedCV);
          const validatedRecs = this.ensureRecommendationsValid(fallbackRecs);
          return this.processRecommendationsWithPlaceholders(validatedRecs);
        }
      }

      throw new Error('Invalid response format from Claude');
    } catch (error) {
      
      // Log specific error details for debugging
      if (error?.response) {
      }
      
      if (error?.message) {
      }
      
      // Enhanced error handling for specific error types
      if (this.isQuotaExceededError(error)) {
        const quotaFallbackRecs = this.generateQuotaFallbackRecommendations(parsedCV);
        return this.processRecommendationsWithPlaceholders(quotaFallbackRecs);
      }
      
      // Return basic recommendations as fallback for other errors
      const fallbackRecs = this.generateFallbackRecommendations(parsedCV);
      const validatedFallbackRecs = this.ensureRecommendationsValid(fallbackRecs);
      return this.processRecommendationsWithPlaceholders(validatedFallbackRecs);
    }
  }

  /**
   * Applies selected recommendations to transform CV content
   */
  async applyRecommendations(
    originalCV: ParsedCV,
    selectedRecommendations: CVRecommendation[]
  ): Promise<CVTransformationResult> {
    
    // Deep clone the original CV to avoid mutations
    const improvedCV = JSON.parse(JSON.stringify(originalCV)) as ParsedCV;
    const appliedRecommendations: CVRecommendation[] = [];
    const transformationSummary = {
      totalChanges: 0,
      sectionsModified: [] as string[],
      newSections: [] as string[],
      keywordsAdded: [] as string[],
      estimatedScoreIncrease: 0
    };
    const comparisonReport: CVTransformationResult['comparisonReport'] = {
      beforeAfter: []
    };
    
    // Capture original content states for comparison
    const originalContentStates = this.captureContentStates(originalCV);

    // Group recommendations by type for efficient processing
    const groupedRecommendations = this.groupRecommendationsByType(selectedRecommendations);
    Object.entries(groupedRecommendations).forEach(([type, recs]) => {
    });

    // Apply content improvements first
    if (groupedRecommendations.content) {
      for (const rec of groupedRecommendations.content) {
        try {
          const result = await this.applyContentRecommendation(improvedCV, rec);
          if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
          
          if (!transformationSummary.sectionsModified.includes(rec.section)) {
            transformationSummary.sectionsModified.push(rec.section);
          }

            // Comparison will be generated after all transformations
          } else {
          }
        } catch (error) {
        }
      }
    }

    // Apply structural changes
    if (groupedRecommendations.structure) {
      for (const rec of groupedRecommendations.structure) {
        
        // Route skills-related structural changes to the enhanced skills handler
        const isSkillsRec = this.isSkillsSection(rec.section);
        
        let result;
        if (isSkillsRec) {
          result = { success: this.applySkillsRecommendation(improvedCV, rec) };
        } else {
          result = await this.applyStructuralRecommendation(improvedCV, rec);
        }
        
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
          
          if (!transformationSummary.sectionsModified.includes(rec.section)) {
            transformationSummary.sectionsModified.push(rec.section);
          }
          
        } else {
        }
      }
    }

    // Add new sections
    if (groupedRecommendations.section_addition) {
      for (const rec of groupedRecommendations.section_addition) {
        const result = await this.addNewSection(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.newSections.push(rec.section);
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
        } else {
        }
      }
    }

    // Apply keyword optimizations
    if (groupedRecommendations.keyword_optimization) {
      for (const rec of groupedRecommendations.keyword_optimization) {
        const result = await this.applyKeywordOptimization(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.keywordsAdded.push(...(rec.keywords || []));
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
        } else {
        }
      }
    }

    // Apply formatting improvements
    if (groupedRecommendations.formatting) {
      for (const rec of groupedRecommendations.formatting) {
        const result = await this.applyFormattingRecommendation(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
          
          if (!transformationSummary.sectionsModified.includes(rec.section)) {
            transformationSummary.sectionsModified.push(rec.section);
          }
          
        } else {
        }
      }
    }

    const successRate = appliedRecommendations.length / selectedRecommendations.length * 100;
    
    // Log any failed recommendations for debugging
    const failedRecommendations = selectedRecommendations.filter(rec => 
      !appliedRecommendations.some(applied => applied.id === rec.id)
    );
    
    if (failedRecommendations.length > 0) {
      failedRecommendations.forEach(rec => {
      });
    }
    
    // Generate proper before/after comparisons after all transformations
    const improvedContentStates = this.captureContentStates(improvedCV);
    comparisonReport.beforeAfter = this.generateComparisonReport(
      originalContentStates,
      improvedContentStates, 
      appliedRecommendations
    );
    
    return {
      originalCV,
      improvedCV,
      appliedRecommendations,
      transformationSummary,
      comparisonReport
    };
  }

  private buildAnalysisPrompt(parsedCV: ParsedCV, targetRole?: string, industryKeywords?: string[]): string {
    const roleContext = targetRole ? `\nTarget Role: ${targetRole}` : '';
    const keywordContext = industryKeywords?.length ? `\nIndustry Keywords to Consider: ${industryKeywords.join(', ')}` : '';
    
    // Optimize prompt length based on CV complexity
    const cvComplexity = this.getCVComplexity(parsedCV);
    const isComplexCV = cvComplexity === 'high';
    
    // Use condensed prompt for complex CVs to reduce processing time
    if (isComplexCV) {
      return this.buildCondensedPrompt(parsedCV, targetRole, industryKeywords);
    }
    
    return `Analyze this CV and provide detailed, actionable recommendations for improvement.${roleContext}${keywordContext}

CV TO ANALYZE:
${JSON.stringify(parsedCV, null, 2)}

Focus on these improvement areas:

1. PROFESSIONAL TITLE: If missing, unclear, or generic, generate a compelling professional title that reflects expertise and career level
2. PROFESSIONAL SUMMARY: Create/improve a compelling professional summary if missing or weak
3. EXPERIENCE BULLETS: Transform weak bullet points into achievement-focused statements with metrics
4. EDUCATION IMPROVEMENTS: Enhance education descriptions, add relevant coursework, achievements, or thesis details
5. SKILLS OPTIMIZATION: Reorganize and enhance skills presentation for ATS and readability
6. KEYWORD INTEGRATION: Add relevant industry keywords naturally throughout content
7. STRUCTURAL IMPROVEMENTS: Suggest better organization and formatting
8. MISSING SECTIONS: Identify and suggest adding key sections (summary, achievements, etc.)

For each recommendation:
- Analyze the current content (if exists)
- Provide specific, ready-to-use improved content
- Explain the improvement and expected impact
- Include relevant keywords for ATS optimization
- Estimate the ATS score improvement (5-25 points)

EXAMPLE IMPROVEMENT PATTERNS:
❌ "Responsible for managing a team"
✅ "Led cross-functional team of [INSERT TEAM SIZE], reducing project delivery time by [ADD PERCENTAGE]% and increasing client satisfaction scores"

❌ "Worked on various projects"
✅ "Spearheaded [NUMBER] high-priority client projects worth [INSERT VALUE], delivering all milestones on time and [ADD PERCENTAGE]% under budget"

❌ "Handled customer service"
✅ "Managed customer relationships resulting in [ADD SPECIFIC OUTCOME] and [INSERT METRIC] improvement in customer retention"

❌ "Bachelor's Degree in Computer Science"
✅ "Bachelor's Degree in Computer Science with focus on [INSERT SPECIALIZATION], completing capstone project on [INSERT PROJECT TOPIC] that achieved [ADD RESULT]"

IMPROVEMENT GUIDELINES:
- Make SUBSTANTIAL improvements, not minor word changes
- Transform passive descriptions into active, achievement-focused statements
- Add quantifiable metrics using placeholder templates wherever possible
- Enhance weak content with compelling, professional language
- Ensure improvements are clearly visible and impactful when compared side-by-side

Generate specific recommendations with placeholder templates that users can customize with their real data.`;
  }

  private async applyContentRecommendation(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const section = recommendation.section.toLowerCase().trim();
      
      // Handle professional summary sections
      if (this.isSummarySection(section)) {
        if (!cv.summary) cv.summary = '';
        cv.summary = recommendation.suggestedContent || cv.summary;
        return { success: true };
      }
      
      // Handle experience sections (including company-specific ones)
      if (this.isExperienceSection(section)) {
        const applied = this.applyExperienceRecommendation(cv, recommendation, section);
        if (applied) {
          return { success: true };
        }
      }
      
      // Handle skills sections
      if (this.isSkillsSection(section)) {
        const applied = this.applySkillsRecommendation(cv, recommendation);
        if (applied) {
          return { success: true };
        }
      }
      
      // Handle education sections
      if (this.isEducationSection(section)) {
        const applied = this.applyEducationRecommendation(cv, recommendation);
        if (applied) {
          return { success: true };
        }
      }
      
      // Handle achievements sections
      if (this.isAchievementsSection(section)) {
        const applied = this.applyAchievementsRecommendation(cv, recommendation);
        if (applied) {
          return { success: true };
        }
      }
      
      // Handle personal info sections (including professional title)
      if (this.isPersonalInfoSection(section)) {
        const applied = this.applyPersonalInfoRecommendation(cv, recommendation);
        if (applied) {
          return { success: true };
        }
      }
      
      // Handle custom sections
      if (this.isCustomSection(section)) {
        const applied = this.applyCustomSectionRecommendation(cv, recommendation, section);
        if (applied) {
          return { success: true };
        }
      }
      
      // As a fallback, treat as custom section
      if (!cv.customSections) cv.customSections = {};
      cv.customSections[recommendation.section] = recommendation.suggestedContent || '';
      
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async applyStructuralRecommendation(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Structural improvements like reordering sections, formatting changes
      // This could involve reorganizing experience entries, skills grouping, etc.
      
      // Example: Reorder experience by relevance or date
      if (recommendation.description.includes('chronological order') && cv.experience) {
        cv.experience.sort((a, b) => {
          const dateA = new Date(a.endDate || a.startDate || '1900-01-01');
          const dateB = new Date(b.endDate || b.startDate || '1900-01-01');
          return dateB.getTime() - dateA.getTime(); // Newest first
        });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async applyFormattingRecommendation(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const section = recommendation.section.toLowerCase().trim();
      
      // Handle formatting improvements based on section
      if (this.isExperienceSection(section)) {
        // Apply formatting to experience section
        if (cv.experience && recommendation.suggestedContent) {
          // Improve bullet point formatting, structure, etc.
        }
        return { success: true };
      }
      
      if (this.isSkillsSection(section)) {
        // Apply formatting to skills section
        if (cv.skills && recommendation.suggestedContent) {
          // Improve skills organization, grouping, etc.
        }
        return { success: true };
      }
      
      if (this.isSummarySection(section)) {
        // Apply formatting to summary section
        if (cv.summary && recommendation.suggestedContent) {
          // Improve summary formatting, structure, etc.
        }
        return { success: true };
      }
      
      if (this.isEducationSection(section)) {
        // Apply formatting to education section
        if (cv.education && recommendation.suggestedContent) {
          // Improve education formatting, structure, etc.
        }
        return { success: true };
      }
      
      // Generic formatting improvements
      return { success: true };
      
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async addNewSection(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const section = recommendation.section.toLowerCase().trim();
      
      // Handle professional summary sections
      if (this.isSummarySection(section)) {
        if (!cv.summary) {
          cv.summary = recommendation.suggestedContent || '';
          return { success: true };
        }
      }
      
      // Handle achievements sections
      if (this.isAchievementsSection(section)) {
        if (!cv.achievements) {
          cv.achievements = [];
        }
        if (recommendation.suggestedContent) {
          const achievementsList = recommendation.suggestedContent
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^[•\-*]\s*/, '').trim())
            .filter(line => line.length > 0);
          
          // Add unique achievements only
          const uniqueAchievements = achievementsList.filter(achievement => 
            !cv.achievements?.some(existing => 
              existing.toLowerCase() === achievement.toLowerCase()
            )
          );
          
          cv.achievements.push(...uniqueAchievements);
        }
        return { success: true };
      }
      
      // Handle certifications
      if (section.includes('certification') || section.includes('certificate')) {
        if (!cv.certifications) {
          cv.certifications = [];
        }
        if (recommendation.suggestedContent) {
          const certsList = recommendation.suggestedContent
            .split('\n')
            .filter(line => line.trim())
            .map(cert => ({
              name: cert.trim(),
              issuer: '',
              date: '',
              url: ''
            }));
          cv.certifications.push(...certsList);
        }
        return { success: true };
      }
      
      // Handle skills sections
      if (this.isSkillsSection(section)) {
        return { success: this.applySkillsRecommendation(cv, recommendation) };
      }
      
      // Handle education sections
      if (this.isEducationSection(section)) {
        return { success: this.applyEducationRecommendation(cv, recommendation) };
      }
      
      // Handle personal info sections (including professional title)
      if (this.isPersonalInfoSection(section)) {
        return { success: this.applyPersonalInfoRecommendation(cv, recommendation) };
      }
      
      // For all other sections, add to custom sections
      if (!cv.customSections) {
        cv.customSections = {};
      }
      cv.customSections[recommendation.section] = recommendation.suggestedContent || '';
      
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async applyKeywordOptimization(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const keywords = recommendation.keywords || [];
      
      // Add keywords to skills section
      if (!cv.skills) cv.skills = [];
      
      if (Array.isArray(cv.skills)) {
        const skillsArray = cv.skills as string[];
        const relevantKeywords = keywords.filter(kw => 
          !skillsArray.some((skill: string) => 
            skill.toLowerCase().includes(kw.toLowerCase())
          )
        );
        skillsArray.push(...relevantKeywords);
      } else {
        // Handle object-based skills
        const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
        if (!skillsObj.technical) skillsObj.technical = [];
        const relevantKeywords = keywords.filter(kw => 
          !skillsObj.technical?.some((skill: string) => 
            skill.toLowerCase().includes(kw.toLowerCase())
          )
        );
        skillsObj.technical.push(...relevantKeywords);
      }
      
      // Enhance summary with keywords naturally integrated
      if (cv.summary && keywords.length > 0) {
        const enhancedSummary = await this.integrateKeywordsNaturally(cv.summary, keywords);
        if (enhancedSummary) {
          cv.summary = enhancedSummary;
        } else {
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Processes recommendations to detect and metadata for placeholders
   */
  private processRecommendationsWithPlaceholders(
    recommendations: CVRecommendation[]
  ): CVRecommendation[] {
    return recommendations.map(rec => {
      if (rec.suggestedContent) {
        // Detect placeholders in the suggested content
        const placeholders = PlaceholderManager.detectPlaceholders(rec.suggestedContent);
        
        if (placeholders.length > 0) {
          rec.placeholders = placeholders;
          rec.isCustomized = false;
        }
      }
      
      return rec;
    });
  }

  /**
   * Naturally integrates keywords into existing content using AI
   */
  private async integrateKeywordsNaturally(
    originalContent: string, 
    keywords: string[]
  ): Promise<string | null> {
    try {
      const prompt = `Enhance the following professional summary by naturally integrating these keywords: ${keywords.join(', ')}

Original Summary:
${originalContent}

Requirements:
1. Keep the original meaning and tone
2. Integrate keywords naturally and contextually
3. Maintain professional language
4. Ensure the text flows smoothly
5. Don't force keywords that don't fit
6. Return only the enhanced summary text

Enhanced Summary:`;

      const response = await this.claudeService.createVerifiedMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.3,
        system: 'You are an expert CV writer. Enhance the provided professional summary by naturally integrating the specified keywords while maintaining the original meaning and professional tone.',
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Captures the current state of all CV content sections
   */
  private captureContentStates(cv: ParsedCV): Record<string, string> {
    const states: Record<string, string> = {};
    
    // Capture summary
    if (cv.summary) {
      states['Professional Summary'] = cv.summary;
    }
    
    // Capture experience sections  
    if (cv.experience) {
      cv.experience.forEach((exp: any) => {
        const key = `Experience - ${exp.company}`;
        states[key] = exp.description || `${exp.position} at ${exp.company}`;
      });
    }
    
    // Capture skills
    if (cv.skills) {
      if (Array.isArray(cv.skills)) {
        states['Skills'] = cv.skills.join(', ');
      } else {
        const skillsObj = cv.skills as any;
        states['Skills'] = Object.values(skillsObj).flat().join(', ');
      }
    }
    
    // Capture achievements
    if (cv.achievements && cv.achievements.length > 0) {
      states['Key Achievements'] = cv.achievements.join('\n• ');
    }
    
    // Capture custom sections
    if (cv.customSections) {
      Object.entries(cv.customSections).forEach(([key, value]) => {
        states[key] = value;
      });
    }
    
    return states;
  }
  
  /**
   * Generates proper before/after comparison report
   */
  private generateComparisonReport(
    originalStates: Record<string, string>,
    improvedStates: Record<string, string>,
    appliedRecommendations: CVRecommendation[]
  ): Array<{
    section: string;
    before: string;
    after: string;
    improvement: string;
  }> {
    const comparisons: Array<{
      section: string;
      before: string;
      after: string;
      improvement: string;
    }> = [];
    
    // Generate comparisons for each applied recommendation
    appliedRecommendations.forEach(rec => {
      let sectionKey = rec.section;
      
      // Map recommendation sections to content state keys
      if (this.isSummarySection(rec.section)) {
        sectionKey = 'Professional Summary';
      } else if (this.isSkillsSection(rec.section)) {
        sectionKey = 'Skills';
      } else if (this.isAchievementsSection(rec.section)) {
        sectionKey = 'Key Achievements';
      } else if (rec.section.includes('Experience - ')) {
        sectionKey = rec.section; // Already in correct format
      }
      
      const beforeContent = originalStates[sectionKey] || originalStates[rec.section] || '';
      const afterContent = improvedStates[sectionKey] || improvedStates[rec.section] || '';
      
      // Only add comparison if content actually changed
      if (beforeContent !== afterContent && afterContent) {
        comparisons.push({
          section: rec.section,
          before: beforeContent,
          after: afterContent,
          improvement: rec.description
        });
      }
    });
    
    return comparisons;
  }

  // Section detection helper methods
  private isSummarySection(section: string): boolean {
    const summaryPatterns = [
      'professional_summary', 'summary', 'professional summary',
      'profile', 'objective', 'career_summary', 'career summary'
    ];
    return summaryPatterns.some(pattern => section.toLowerCase().includes(pattern));
  }
  
  private isExperienceSection(section: string): boolean {
    const experiencePatterns = [
      'experience', 'work_experience', 'work experience', 'employment',
      'career', 'professional_experience', 'professional experience'
    ];
    return experiencePatterns.some(pattern => section.toLowerCase().includes(pattern));
  }
  
  private isSkillsSection(section: string): boolean {
    const skillsPatterns = [
      'skills', 'technical_skills', 'technical skills', 'core_competencies',
      'competencies', 'technologies', 'expertise'
    ];
    return skillsPatterns.some(pattern => section.toLowerCase().includes(pattern));
  }
  
  private isEducationSection(section: string): boolean {
    const educationPatterns = [
      'education', 'academic', 'qualification', 'training'
    ];
    const isEducation = educationPatterns.some(pattern => section.toLowerCase().includes(pattern));
    return isEducation;
  }
  
  private isAchievementsSection(section: string): boolean {
    const achievementPatterns = [
      'achievements', 'accomplishments', 'awards', 'honors',
      'recognition', 'key_achievements', 'key achievements'
    ];
    return achievementPatterns.some(pattern => section.includes(pattern));
  }
  
  private isPersonalInfoSection(section: string): boolean {
    const personalInfoPatterns = [
      'personal', 'personal_info', 'personal info', 'personal information',
      'contact', 'contact_info', 'contact info', 'contact information', 
      'professional_title', 'professional title', 'title', 'job_title', 'job title'
    ];
    const isPersonalInfo = personalInfoPatterns.some(pattern => section.toLowerCase().includes(pattern));
    return isPersonalInfo;
  }
  
  private isCustomSection(section: string): boolean {
    // Any section that doesn't match the standard patterns
    return !this.isSummarySection(section) && 
           !this.isExperienceSection(section) && 
           !this.isSkillsSection(section) && 
           !this.isEducationSection(section) && 
           !this.isAchievementsSection(section) &&
           !this.isPersonalInfoSection(section);
  }
  
  // Specialized application methods
  private applyExperienceRecommendation(cv: ParsedCV, recommendation: CVRecommendation, section: string): boolean {
    if (!cv.experience) return false;
    
    // Check if this is a company-specific experience section
    const companyMatch = section.match(/experience\s*-\s*(.+)/);
    const targetCompany = companyMatch ? companyMatch[1].trim().toLowerCase() : null;
    
    let applied = false;
    
    cv.experience = cv.experience.map((exp: any) => {
      // If targeting a specific company, only apply to that company
      if (targetCompany && !exp.company.toLowerCase().includes(targetCompany)) {
        return exp;
      }
      
      // Apply the recommendation
      if (recommendation.currentContent && recommendation.suggestedContent) {
        // Replace specific content
        if (exp.description && exp.description.includes(recommendation.currentContent)) {
          exp.description = exp.description.replace(
            recommendation.currentContent,
            recommendation.suggestedContent
          );
          applied = true;
        }
      } else if (recommendation.suggestedContent && !recommendation.currentContent) {
        // Add new content if no current content specified
        if (!exp.description) {
          exp.description = recommendation.suggestedContent;
          applied = true;
        } else {
          // Append to existing description
          exp.description += '\n' + recommendation.suggestedContent;
          applied = true;
        }
      }
      
      return exp;
    });
    
    return applied;
  }
  
  private applySkillsRecommendation(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    if (!recommendation.suggestedContent) return false;
    
    
    // Handle different types of skills recommendations
    if (recommendation.type === 'structure' && recommendation.actionRequired === 'modify') {
      // This is a restructuring recommendation (like categorizing skills)
      return this.applySkillsRestructuring(cv, recommendation);
    } else if (recommendation.type === 'section_addition' && recommendation.actionRequired === 'add') {
      // This is adding a new skills section or core competencies
      return this.applySkillsSectionAddition(cv, recommendation);
    } else {
      // Simple skill addition (legacy behavior)
      return this.applySimpleSkillsAddition(cv, recommendation);
    }
  }
  
  private applySkillsRestructuring(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    try {
      const suggestedContent = recommendation.suggestedContent!;
      
      // Parse markdown-style categorized skills from suggested content
      const categories = this.parseSkillsCategories(suggestedContent);
      
      if (Object.keys(categories).length === 0) {
        return false;
      }
      
      
      // Transform skills to categorized structure
      const originalSkills = Array.isArray(cv.skills) ? cv.skills as string[] : [];
      
      // Create new categorized skills object
      const newSkillsStructure = {
        technical: categories['Programming Languages'] || categories['Technical Skills'] || [],
        frontend: categories['Frontend Technologies'] || categories['Frontend Frameworks'] || [],
        backend: categories['Backend Technologies'] || categories['Backend Frameworks'] || [],
        tools: categories['Tools & Platforms'] || categories['Development Tools'] || [],
        databases: categories['Databases'] || [],
        cloud: categories['Cloud Platforms'] || categories['Cloud Services'] || [],
      };
      
      // Add any remaining original skills that weren't categorized
      const allCategorizedSkills = Object.values(newSkillsStructure).flat();
      const uncategorizedSkills = originalSkills.filter((skill: any) => 
        !allCategorizedSkills.some(catSkill => 
          catSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(catSkill.toLowerCase())
        )
      );
      
      if (uncategorizedSkills.length > 0) {
        newSkillsStructure.technical.push(...uncategorizedSkills);
      }
      
      // Filter out empty categories
      const filteredStructure = Object.fromEntries(
        Object.entries(newSkillsStructure).filter(([_, skills]) => skills.length > 0)
      );
      
      cv.skills = filteredStructure;
      return true;
      
    } catch (error) {
      return false;
    }
  }
  
  private applySkillsSectionAddition(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    try {
      const suggestedContent = recommendation.suggestedContent!;
      
      // Parse soft skills or competencies from suggested content
      const competencies = this.parseSoftSkillsList(suggestedContent);
      
      if (competencies.length === 0) {
        return false;
      }
      
      // Ensure skills is object format to add soft skills
      if (!cv.skills) {
        cv.skills = {};
      }
      
      if (Array.isArray(cv.skills)) {
        // Convert array to object format
        cv.skills = {
          technical: cv.skills as string[],
        };
      }
      
      const skillsObj = cv.skills as any;
      
      // Add soft skills or core competencies
      if (recommendation.section.toLowerCase().includes('competencies')) {
        skillsObj.competencies = competencies;
      } else {
        skillsObj.soft = competencies;
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }
  
  private applySimpleSkillsAddition(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    // Legacy behavior for simple skill additions
    const skillsToAdd = recommendation.suggestedContent!
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (skillsToAdd.length === 0) return false;
    
    // Handle both skills structures: simple array or object with categories
    if (!cv.skills) {
      cv.skills = [];
    }
    
    if (Array.isArray(cv.skills)) {
      // Simple array format
      const currentSkills = cv.skills as string[];
      const newSkills = skillsToAdd.filter((skill: any) => 
        !currentSkills.some(existing => 
          existing.toLowerCase() === skill.toLowerCase()
        )
      );
      cv.skills = [...currentSkills, ...newSkills];
    } else {
      // Object format with categories
      const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
      if (!skillsObj.technical) skillsObj.technical = [];
      
      const newSkills = skillsToAdd.filter((skill: any) => 
        !skillsObj.technical?.some(existing => 
          existing.toLowerCase() === skill.toLowerCase()
        )
      );
      skillsObj.technical.push(...newSkills);
    }
    
    return true;
  }
  
  private parseSkillsCategories(content: string): Record<string, string[]> {
    const categories: Record<string, string[]> = {};
    const lines = content.split('\n');
    let currentCategory = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for category headers (bold markdown or with colons)
      const categoryMatch = trimmed.match(/\*\*([^*]+):\*\*|([^:]+):/);
      if (categoryMatch) {
        currentCategory = (categoryMatch[1] || categoryMatch[2]).trim();
        categories[currentCategory] = [];
        continue;
      }
      
      // Look for skills in this category
      if (currentCategory && trimmed) {
        // Remove bullet points and split on commas
        const skills = trimmed
          .replace(/^[•\-*]\s*/, '')
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.includes('**'));
        
        categories[currentCategory].push(...skills);
      }
    }
    
    return categories;
  }
  
  private parseSoftSkillsList(content: string): string[] {
    const competencies: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for bullet points or list items
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const competency = trimmed
          .replace(/^[•\-*]\s*/, '')
          .trim();
        
        if (competency && !competency.includes('**') && competency.length > 3) {
          competencies.push(competency);
        }
      }
    }
    
    return competencies;
  }
  
  private applyEducationRecommendation(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    if (!recommendation.suggestedContent) return false;
    
    
    // Handle different types of education recommendations
    if (recommendation.actionRequired === 'add' || !cv.education || cv.education.length === 0) {
      // This is adding a new education entry
      return this.addEducationEntry(cv, recommendation);
    } else if (recommendation.actionRequired === 'replace') {
      // This is enhancing existing education entries
      return this.enhanceEducationEntries(cv, recommendation);
    } else if (recommendation.actionRequired === 'modify' && recommendation.currentContent && cv.education?.[0]?.description?.includes(recommendation.currentContent)) {
      // Only use legacy modify behavior if the current content actually exists in the education description
      return this.modifyEducationContent(cv, recommendation);
    } else {
      // Default to enhancing existing entries (handles 'modify' with placeholder content)
      return this.enhanceEducationEntries(cv, recommendation);
    }
  }
  
  private addEducationEntry(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    try {
      const suggestedContent = recommendation.suggestedContent!;
      
      // Parse education entry from suggested content
      const newEducation = this.parseEducationFromContent(suggestedContent);
      
      if (newEducation) {
        if (!cv.education) {
          cv.education = [];
        }
        cv.education.push(newEducation);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  private enhanceEducationEntries(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    try {
      const suggestedContent = recommendation.suggestedContent!;
      
      if (!cv.education || cv.education.length === 0) {
        return false;
      }
      
      // Parse enhanced education data from suggested content
      const enhancedData = this.parseEducationEnhancements(suggestedContent);
      
      // Apply enhancements to the first/most relevant education entry
      let applied = false;
      for (let i = 0; i < cv.education.length && !applied; i++) {
        const edu = cv.education[i];
        console.log(`Processing education entry ${i}:`, {
          institution: edu.institution,
          degree: edu.degree,
          hasDescription: !!edu.description,
          hasGpa: !!edu.gpa,
          hasHonors: !!edu.honors
        });
        
        // Enhance with additional details
        if (enhancedData.description && !edu.description) {
          edu.description = enhancedData.description;
          applied = true;
        }
        
        if (enhancedData.gpa && !edu.gpa) {
          edu.gpa = enhancedData.gpa;
          applied = true;
        }
        
        if (enhancedData.honors && !edu.honors) {
          edu.honors = enhancedData.honors;
          applied = true;
        }
        
        // Enhance institution name if it's generic
        if (enhancedData.institution && (edu.institution === 'University' || edu.institution.length < 10)) {
          edu.institution = enhancedData.institution;
          applied = true;
        } else if (enhancedData.institution) {
        }
        
        // Enhance degree name if it's generic
        if (enhancedData.degree && (edu.degree === 'Computer Science' || edu.degree.length < 15)) {
          edu.degree = enhancedData.degree;
          applied = true;
        } else if (enhancedData.degree) {
        }
        
        console.log('After processing entry:', {
          institution: edu.institution,
          degree: edu.degree,
          description: edu.description ? edu.description.substring(0, 50) + '...' : 'none',
          gpa: edu.gpa || 'none',
          honors: edu.honors || 'none'
        });
      }
      
      return applied;
    } catch (error) {
      return false;
    }
  }
  
  private modifyEducationContent(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    // Legacy behavior for specific content replacement
    if (!cv.education || !recommendation.currentContent) {
      return false;
    }
    
    let applied = false;
    cv.education = cv.education.map((edu: any) => {
      if (edu.description && edu.description.includes(recommendation.currentContent!)) {
        edu.description = edu.description.replace(
          recommendation.currentContent!,
          recommendation.suggestedContent!
        );
        applied = true;
      }
      return edu;
    });
    
    return applied;
  }
  
  private parseEducationFromContent(content: string): any | null {
    try {
      const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      let institution = '';
      let degree = '';
      let year = '';
      let gpa = '';
      let description = '';
      let honors: string[] = [];
      
      for (const line of lines) {
        // Look for degree information
        if (line.includes('Bachelor') || line.includes('Master') || line.includes('PhD') || line.includes('Associate')) {
          degree = line.replace(/\*\*/g, '').trim();
        }
        // Look for institution and year
        else if (line.includes('|') && (line.includes('Graduated') || line.includes('20'))) {
          const parts = line.split('|');
          if (parts.length >= 2) {
            institution = parts[0].replace(/\*\*/g, '').trim();
            const yearPart = parts[1].replace(/\*\*/g, '').trim();
            const yearMatch = yearPart.match(/20\d{2}/);
            if (yearMatch) {
              year = yearMatch[0];
            }
          }
        }
        // Look for GPA
        else if (line.toLowerCase().includes('gpa') && line.match(/\d\.\d/)) {
          const gpaMatch = line.match(/(\d\.\d)/);
          if (gpaMatch) {
            gpa = gpaMatch[1];
          }
        }
        // Look for coursework or achievements (combine into description)
        else if (line.startsWith('•') || line.startsWith('-')) {
          if (!description) {
            description = line.replace(/^[•\-]\s*/, '').trim();
          } else {
            description += '\n' + line.replace(/^[•\-]\s*/, '').trim();
          }
        }
      }
      
      // Return education object if we have minimum required fields
      if (degree && institution && year) {
        return {
          institution,
          degree,
          field: degree.includes('Computer Science') ? 'Computer Science' : degree.split(' ').pop(),
          year,
          gpa: gpa || undefined,
          description: description || undefined,
          honors: honors.length > 0 ? honors : undefined
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  private parseEducationEnhancements(content: string): any {
    const enhancements: any = {};
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Helper function to clean placeholders from content
    const cleanPlaceholders = (text: string): string => {
      return text.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
    };
    
    // Helper function to check if line contains only placeholders
    const isPlaceholderOnly = (text: string): boolean => {
      const cleanedText = cleanPlaceholders(text);
      return cleanedText.length === 0 || !!cleanedText.match(/^[\s\-\|:]+$/);
    };
    
    for (const line of lines) {
      // Skip lines that are only placeholders
      if (isPlaceholderOnly(line)) {
        continue;
      }
      
      // Extract enhanced degree name
      if (line.includes('Bachelor') || line.includes('Master')) {
        const cleanedDegree = cleanPlaceholders(line.replace(/\*\*/g, ''));
        if (cleanedDegree.length > 5) {
          enhancements.degree = cleanedDegree;
        }
      }
      // Extract enhanced institution name
      else if (line.includes('|') && line.includes('University')) {
        const parts = line.split('|');
        if (parts.length >= 1) {
          const cleanedInstitution = cleanPlaceholders(parts[0].replace(/\*\*/g, ''));
          if (cleanedInstitution.length > 3) {
            enhancements.institution = cleanedInstitution;
          }
        }
      }
      // Extract actual GPA (only if not a placeholder)
      else if (line.toLowerCase().includes('gpa') && !line.includes('[') && line.match(/\d\.\d/)) {
        const gpaMatch = line.match(/(\d\.\d)/);
        if (gpaMatch) {
          enhancements.gpa = gpaMatch[1];
        }
      }
      // Extract Dean's List honors
      else if (line.toLowerCase().includes("dean's list") && !line.includes('[')) {
        if (!enhancements.honors) {
          enhancements.honors = [];
        }
        enhancements.honors.push("Dean's List");
      }
      // Extract coursework for description (skip if templated)
      else if ((line.toLowerCase().includes('coursework') || line.startsWith('•')) && !line.includes('[')) {
        const cleanedLine = cleanPlaceholders(line.replace(/^[•\-]\s*/, '').replace(/\*\*/g, ''));
        if (cleanedLine.length > 10) {
          if (!enhancements.description) {
            enhancements.description = cleanedLine;
          } else {
            enhancements.description += '\n' + cleanedLine;
          }
        }
      }
      // Extract capstone/project information
      else if (line.toLowerCase().includes('capstone') || line.toLowerCase().includes('project:')) {
        const cleanedProject = cleanPlaceholders(line.replace(/\*\*/g, ''));
        if (cleanedProject.length > 10) {
          if (!enhancements.description) {
            enhancements.description = cleanedProject;
          } else {
            enhancements.description += '\n' + cleanedProject;
          }
        }
      }
    }
    
    // Add generic coursework if no specific description was found
    if (!enhancements.description && content.toLowerCase().includes('coursework')) {
      enhancements.description = 'Relevant Coursework: Data Structures & Algorithms, Software Engineering, Database Systems, Web Development, Object-Oriented Programming';
    }
    
    return enhancements;
  }
  
  private applyAchievementsRecommendation(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    if (!recommendation.suggestedContent) return false;
    
    if (!cv.achievements) {
      cv.achievements = [];
    }
    
    // Parse achievements from suggested content
    const newAchievements = recommendation.suggestedContent
      .split('\n')
      .map(line => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    // Add unique achievements only
    const uniqueAchievements = newAchievements.filter(achievement => 
      !cv.achievements?.some(existing => 
        existing.toLowerCase() === achievement.toLowerCase()
      )
    );
    
    cv.achievements.push(...uniqueAchievements);
    
    return uniqueAchievements.length > 0;
  }
  
  private applyCustomSectionRecommendation(cv: ParsedCV, recommendation: CVRecommendation, section: string): boolean {
    if (!recommendation.suggestedContent) return false;
    
    if (!cv.customSections) {
      cv.customSections = {};
    }
    
    cv.customSections[recommendation.section] = recommendation.suggestedContent;
    return true;
  }
  
  private applyPersonalInfoRecommendation(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    
    
    // Ensure personalInfo exists
    if (!cv.personalInfo) {
      cv.personalInfo = {};
    }
    
    // Detect if this is specifically about professional title
    const section = recommendation.section.toLowerCase();
    const isForTitle = section.includes('title') || section.includes('professional_title') || section.includes('job_title');
    
    if (isForTitle || this.isProfessionalTitlePlaceholder(cv.personalInfo.title)) {
      return this.generateProfessionalTitle(cv, recommendation);
    }
    
    // Handle other personal info updates (requires suggested content)
    if (!recommendation.suggestedContent) {
      return false;
    }
    
    return true;
  }
  
  private isProfessionalTitlePlaceholder(title?: string): boolean {
    if (!title) return true; // No title is considered a placeholder
    
    const placeholderPatterns = [
      'professional title',
      'job title', 
      'your title',
      'title here',
      '[insert title]',
      'add title',
      'professional'
    ];
    
    const titleLower = title.toLowerCase().trim();
    const isPlaceholder = placeholderPatterns.some(pattern => titleLower === pattern || titleLower.includes(pattern));
    
    return isPlaceholder;
  }
  
  private generateProfessionalTitle(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    
    try {
      // Extract key information for title generation
      const skills = this.extractSkillsArray(cv.skills);
      const experience = cv.experience?.[0]; // Most recent experience
      const education = cv.education?.[0]; // Highest education
      
      // Generate title based on suggested content or create from CV data
      let generatedTitle = '';
      
      if (recommendation.suggestedContent && recommendation.suggestedContent.trim()) {
        // Use LLM-provided title if available and not empty
        generatedTitle = recommendation.suggestedContent.trim();
      } else {
        // Generate title based on CV content
        generatedTitle = this.createTitleFromCVData(skills, experience, education);
      }
      
      if (generatedTitle && generatedTitle.length > 0) {
        cv.personalInfo!.title = generatedTitle;
        return true;
      } else {
        return false;
      }
      
    } catch (error) {
      return false;
    }
  }
  
  private extractSkillsArray(skills?: string[] | object): string[] {
    if (Array.isArray(skills)) {
      return skills;
    } else if (skills && typeof skills === 'object') {
      // Extract all skills from categorized structure
      const allSkills: string[] = [];
      Object.values(skills).forEach(skillArray => {
        if (Array.isArray(skillArray)) {
          allSkills.push(...skillArray);
        }
      });
      return allSkills;
    }
    return [];
  }
  
  private createTitleFromCVData(skills: string[], experience?: any, education?: any): string {
    
    // Prioritize title generation based on experience
    if (experience?.position) {
      const position = experience.position;
      // If the position is already descriptive, use it
      if (position.toLowerCase().includes('senior') || 
          position.toLowerCase().includes('lead') || 
          position.toLowerCase().includes('manager') ||
          position.toLowerCase().includes('director') ||
          position.toLowerCase().includes('engineer') ||
          position.toLowerCase().includes('developer') ||
          position.toLowerCase().includes('specialist')) {
        return position;
      }
    }
    
    // Generate title based on top skills
    if (skills.length > 0) {
      // Look for programming languages and frameworks
      const techSkills = skills.filter((skill: any) => 
        ['javascript', 'python', 'react', 'node', 'java', 'typescript', 'angular', 'vue', 'php', 'c++', 'c#', 'ruby', 'go', 'rust', 'kotlin', 'swift'].some(tech => 
          skill.toLowerCase().includes(tech)
        )
      );
      
      if (techSkills.length > 0) {
        const primaryTech = techSkills[0];
        return `${primaryTech} Developer`;
      }
      
      // Look for other professional skills
      const professionalSkills = skills.filter((skill: any) =>
        ['marketing', 'sales', 'design', 'management', 'analysis', 'consulting', 'finance', 'operations'].some(domain =>
          skill.toLowerCase().includes(domain)
        )
      );
      
      if (professionalSkills.length > 0) {
        const domain = professionalSkills[0];
        return `${domain} Specialist`;
      }
      
      // Default based on top skill
      if (skills[0]) {
        return `${skills[0]} Professional`;
      }
    }
    
    // Fallback to education-based title
    if (education?.field) {
      return `${education.field} Professional`;
    }
    
    // Ultimate fallback
    return 'Experienced Professional';
  }
  
  private groupRecommendationsByType(recommendations: CVRecommendation[]): Record<string, CVRecommendation[]> {
    return recommendations.reduce((groups, rec) => {
      if (!groups[rec.type]) {
        groups[rec.type] = [];
      }
      groups[rec.type].push(rec);
      return groups;
    }, {} as Record<string, CVRecommendation[]>);
  }

  private extractRecommendationsFromText(text: string, cv: ParsedCV): CVRecommendation[] {
    // Fallback method to extract recommendations from non-JSON response
    const recommendations: CVRecommendation[] = [];
    const lines = text.split('\n');
    
    let currentRec: Partial<CVRecommendation> = {};
    let recId = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.match(/^\d+\./)) {
        // New recommendation starts
        if (currentRec.title) {
          recommendations.push(this.completeRecommendation(currentRec, recId++));
        }
        currentRec = {
          title: trimmedLine.replace(/^\d+\.\s*/, ''),
          type: 'content',
          category: 'experience',
          impact: 'medium',
          priority: 5,
          section: 'experience',
          actionRequired: 'modify',
          estimatedScoreImprovement: 10
        };
      } else if (trimmedLine.toLowerCase().includes('current:')) {
        currentRec.currentContent = trimmedLine.replace(/current:\s*/i, '');
      } else if (trimmedLine.toLowerCase().includes('improved:')) {
        currentRec.suggestedContent = trimmedLine.replace(/improved:\s*/i, '');
      } else if (trimmedLine && currentRec.title && !currentRec.description) {
        currentRec.description = trimmedLine;
      }
    }
    
    // Add the last recommendation
    if (currentRec.title) {
      recommendations.push(this.completeRecommendation(currentRec, recId));
    }
    
    return recommendations.slice(0, 10); // Limit to 10 recommendations
  }

  private completeRecommendation(partial: Partial<CVRecommendation>, id: number): CVRecommendation {
    return {
      id: `rec_${id}`,
      type: partial.type || 'content',
      category: partial.category || 'experience',
      title: partial.title || 'CV Improvement',
      description: partial.description || 'Improve CV content',
      currentContent: partial.currentContent,
      suggestedContent: partial.suggestedContent,
      impact: partial.impact || 'medium',
      priority: partial.priority || 5,
      section: partial.section || 'experience',
      actionRequired: partial.actionRequired || 'modify',
      keywords: partial.keywords || [],
      estimatedScoreImprovement: partial.estimatedScoreImprovement || 10
    };
  }

  /**
   * Assess CV complexity to optimize processing strategy
   */
  private getCVComplexity(cv: ParsedCV): 'low' | 'medium' | 'high' {
    const jsonSize = JSON.stringify(cv).length;
    const experienceCount = cv.experience?.length || 0;
    const totalSections = [
      cv.summary, cv.skills, cv.education, cv.experience, 
      cv.achievements, cv.certifications, cv.customSections
    ].filter(Boolean).length;
    
    if (jsonSize > 15000 || experienceCount > 8 || totalSections > 6) {
      return 'high';
    } else if (jsonSize > 8000 || experienceCount > 4 || totalSections > 4) {
      return 'medium';
    }
    return 'low';
  }
  
  /**
   * Build condensed prompt for complex CVs to reduce processing time
   */
  private buildCondensedPrompt(parsedCV: ParsedCV, targetRole?: string, industryKeywords?: string[]): string {
    const roleContext = targetRole ? `\nTarget Role: ${targetRole}` : '';
    const keywordContext = industryKeywords?.length ? `\nKeywords: ${industryKeywords.join(', ')}` : '';
    
    // Create a simplified CV summary for analysis
    const simplifiedCV = {
      summary: parsedCV.summary,
      experience: parsedCV.experience?.slice(0, 3).map((exp: any) => ({
        company: exp.company,
        title: exp.position,
        description: exp.description?.substring(0, 200) + '...'
      })),
      skills: Array.isArray(parsedCV.skills) 
        ? parsedCV.skills.slice(0, 10) 
        : parsedCV.skills,
      education: parsedCV.education?.slice(0, 2)
    };
    
    return `Generate 5-8 high-impact CV improvement recommendations.${roleContext}${keywordContext}

CV Summary:
${JSON.stringify(simplifiedCV, null, 2)}

Focus on:
1. Professional title generation (if missing or generic)
2. Professional summary enhancement
3. Top experience bullets with metrics
4. Education improvements and achievements
5. Key skills optimization
6. ATS keyword integration

Return JSON only: {"recommendations": [...]} with id, type, category, title, description, section, impact, priority, estimatedScoreImprovement fields.`;
  }
  
  /**
   * Check if error is related to API quota exceeded
   */
  private isQuotaExceededError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      error?.status === 429 ||
      error?.response?.status === 429 ||
      errorMessage.includes('quota exceeded') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429')
    );
  }

  /**
   * Ensure all recommendations have required fields for validation
   */
  private ensureRecommendationsValid(recommendations: CVRecommendation[]): CVRecommendation[] {
    return recommendations.map(rec => {
      // Ensure all required fields are present and non-empty
      return {
        ...rec,
        id: rec.id || `rec_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: rec.title || 'CV Improvement Recommendation',
        description: rec.description || 'Improve your CV content to better showcase your professional experience and skills.',
        section: rec.section || 'general'
      };
    });
  }

  /**
   * Generate enhanced fallback recommendations specifically for quota exceeded scenarios
   */
  private generateQuotaFallbackRecommendations(cv: ParsedCV): CVRecommendation[] {
    const recommendations: CVRecommendation[] = [];
    let recCount = 1;
    
    // Essential recommendations that don't require AI generation
    
    // 1. Professional Title (always high priority)
    if (this.isProfessionalTitlePlaceholder(cv.personalInfo?.title)) {
      recommendations.push({
        id: `rec_quota_title_${recCount++}`,
        type: 'content',
        category: 'professional_summary',
        title: 'Add Professional Title',
        description: 'A professional title is essential for ATS systems and recruiter attention. Add a title that reflects your expertise and career level.',
        currentContent: cv.personalInfo?.title || '',
        suggestedContent: 'Professional [Your Field] Specialist',
        impact: 'high',
        priority: 1,
        section: 'professional_title',
        actionRequired: cv.personalInfo?.title ? 'replace' : 'add',
        keywords: ['professional', 'specialist', 'expert'],
        estimatedScoreImprovement: 15
      });
    }
    
    // 2. Professional Summary
    if (!cv.summary || cv.summary.length < 50) {
      recommendations.push({
        id: `rec_quota_summary_${recCount++}`,
        type: 'section_addition',
        category: 'professional_summary',
        title: 'Add Professional Summary',
        description: 'A professional summary is crucial for making a strong first impression and improving ATS compatibility.',
        suggestedContent: 'Experienced professional with proven expertise in [Your Field]. Skilled in [Key Skills] with a track record of [Key Achievement]. Passionate about [Industry Focus] and committed to delivering exceptional results.',
        impact: 'high',
        priority: 2,
        section: 'professional_summary',
        actionRequired: 'add',
        keywords: ['experienced', 'professional', 'skilled', 'expertise'],
        estimatedScoreImprovement: 20
      });
    }
    
    // 3. Experience Enhancement
    if (cv.experience && cv.experience.length > 0) {
      const hasWeakExperience = cv.experience.some(exp => 
        !exp.description || exp.description.split(' ').length < 15
      );
      
      if (hasWeakExperience) {
        recommendations.push({
          id: `rec_quota_experience_${recCount++}`,
          type: 'content',
          category: 'experience',
          title: 'Enhance Experience Descriptions',
          description: 'Transform basic job descriptions into achievement-focused statements that demonstrate your impact and value.',
          currentContent: 'Basic job responsibilities',
          suggestedContent: 'Led [Team/Project] achieving [Specific Result] through [Action Taken]. Improved [Metric] by [Percentage] while [Additional Achievement].',
          impact: 'high',
          priority: 3,
          section: 'experience',
          actionRequired: 'replace',
          keywords: ['led', 'achieved', 'improved', 'delivered'],
          estimatedScoreImprovement: 18
        });
      }
    }
    
    // 4. Skills Organization
    if (cv.skills && Array.isArray(cv.skills) && cv.skills.length > 8) {
      recommendations.push({
        id: `rec_quota_skills_${recCount++}`,
        type: 'structure',
        category: 'skills',
        title: 'Organize Skills by Category',
        description: 'Categorize your skills to improve readability and ATS scanning. Group technical skills, soft skills, and tools separately.',
        suggestedContent: 'Technical Skills: [Programming Languages, Frameworks]\nTools & Platforms: [Software, Systems]\nSoft Skills: [Leadership, Communication, Problem-solving]',
        impact: 'medium',
        priority: 4,
        section: 'skills',
        actionRequired: 'modify',
        keywords: ['technical', 'skills', 'tools', 'platforms'],
        estimatedScoreImprovement: 12
      });
    }
    
    // 5. Education Enhancement
    if (cv.education && cv.education.length > 0) {
      const hasBasicEducation = cv.education.some(edu => 
        !edu.description && !edu.gpa && !edu.honors
      );
      
      if (hasBasicEducation) {
        recommendations.push({
          id: `rec_quota_education_${recCount++}`,
          type: 'content',
          category: 'education',
          title: 'Enhance Education Details',
          description: 'Add relevant coursework, achievements, or honors to make your education section more compelling.',
          suggestedContent: 'Relevant Coursework: [Key Subjects]\nAchievements: [Academic Honors, Projects]\nGPA: [If 3.5 or higher]',
          impact: 'medium',
          priority: 5,
          section: 'education',
          actionRequired: 'add',
          keywords: ['coursework', 'achievements', 'academic'],
          estimatedScoreImprovement: 10
        });
      }
    }
    
    // 6. Achievements Section
    if (!cv.achievements || cv.achievements.length === 0) {
      recommendations.push({
        id: `rec_quota_achievements_${recCount++}`,
        type: 'section_addition',
        category: 'achievements',
        title: 'Add Key Achievements Section',
        description: 'A dedicated achievements section highlights your most impressive accomplishments and sets you apart from other candidates.',
        suggestedContent: '• [Quantifiable Achievement with Percentage/Numbers]\n• [Award or Recognition Received]\n• [Project Success or Innovation]\n• [Process Improvement or Efficiency Gain]',
        impact: 'high',
        priority: 6,
        section: 'achievements',
        actionRequired: 'add',
        keywords: ['achievements', 'accomplishments', 'awards', 'success'],
        estimatedScoreImprovement: 15
      });
    }
    
    return recommendations;
  }

  private generateFallbackRecommendations(cv: ParsedCV): CVRecommendation[] {
    const recommendations: CVRecommendation[] = [];
    
    // Check for missing or generic professional title
    if (this.isProfessionalTitlePlaceholder(cv.personalInfo?.title)) {
      recommendations.push({
        id: 'rec_professional_title',
        type: 'content',
        category: 'professional_summary',
        title: 'Generate Professional Title',
        description: 'A compelling professional title is missing or too generic. This is the first thing recruiters see.',
        currentContent: cv.personalInfo?.title || '',
        suggestedContent: '[GENERATED BASED ON CV CONTENT]',
        impact: 'high',
        priority: 1,
        section: 'professional_title',
        actionRequired: cv.personalInfo?.title ? 'replace' : 'add',
        keywords: ['professional', 'expert', 'specialist'],
        estimatedScoreImprovement: 15
      });
    }
    
    // Check for missing professional summary
    if (!cv.summary || cv.summary.length < 50) {
      recommendations.push({
        id: 'rec_summary',
        type: 'section_addition',
        category: 'professional_summary',
        title: 'Add Professional Summary',
        description: 'A compelling professional summary is missing. This is crucial for ATS and recruiter attention.',
        suggestedContent: 'Results-driven professional with proven track record in [INSERT YOUR FIELD]. Experienced in [LIST KEY SKILLS] with demonstrated ability to [DESCRIBE KEY ACHIEVEMENT]. Seeking to leverage expertise in [INSERT TARGET ROLE].',
        impact: 'high',
        priority: 2,
        section: 'professional_summary',
        actionRequired: 'add',
        keywords: ['professional', 'results-driven', 'experienced'],
        estimatedScoreImprovement: 20
      });
    }
    
    // Check for weak experience descriptions
    if (cv.experience?.some(exp => exp.description && exp.description.split(' ').length < 10)) {
      recommendations.push({
        id: 'rec_experience',
        type: 'content',
        category: 'experience',
        title: 'Enhance Experience Descriptions',
        description: 'Experience descriptions are too brief and lack quantifiable achievements.',
        currentContent: 'Responsible for team management',
        suggestedContent: 'Led cross-functional team of [INSERT TEAM SIZE], increasing productivity by [ADD PERCENTAGE]% and reducing project delivery time by [INSERT TIMEFRAME]',
        impact: 'high',
        priority: 3,
        section: 'experience',
        actionRequired: 'replace',
        keywords: ['led', 'managed', 'increased', 'delivered'],
        estimatedScoreImprovement: 15
      });
    }
    
    return recommendations;
  }

  /**
   * Converts role-based recommendations to CV recommendations format
   */
  private async convertRoleRecommendationsToCVRecommendations(
    roleRecommendations: RoleBasedRecommendation[],
    primaryRole: RoleMatchResult
  ): Promise<CVRecommendation[]> {
    const cvRecommendations: CVRecommendation[] = [];
    
    for (const roleRec of roleRecommendations) {
      const cvRec: CVRecommendation = {
        id: `role_${roleRec.id}`,
        type: this.mapRoleRecTypeToCVRecType(roleRec.type),
        category: this.mapTargetSectionToCategory(roleRec.targetSection),
        title: `[${primaryRole.roleName}] ${roleRec.title}`,
        description: `${roleRec.description} (Role-optimized for ${primaryRole.roleName})`,
        suggestedContent: roleRec.template,
        impact: roleRec.priority === 'high' ? 'high' : roleRec.priority === 'medium' ? 'medium' : 'low',
        priority: roleRec.priority === 'high' ? 1 : roleRec.priority === 'medium' ? 5 : 8,
        section: this.mapTargetSectionToString(roleRec.targetSection),
        actionRequired: this.determineActionRequired(roleRec.type),
        keywords: this.extractKeywordsFromTemplate(roleRec.template),
        estimatedScoreImprovement: roleRec.expectedImpact,
        roleBasedRecommendation: roleRec,
        roleProfileId: primaryRole.roleId,
        enhancementTemplate: roleRec.template
      };
      
      cvRecommendations.push(cvRec);
    }
    
    return cvRecommendations;
  }

  /**
   * Generate recommendations based on enrichment results
   */
  private generateEnrichmentRecommendations(enrichmentResult: EnrichmentResult): CVRecommendation[] {
    const recommendations: CVRecommendation[] = [];
    let recId = 1;
    
    // Recommend highlighting verified certifications
    if (enrichmentResult.enrichmentSummary.certifications.certificationsVerified > 0) {
      recommendations.push({
        id: `enrich_cert_${recId++}`,
        type: 'content',
        category: 'achievements',
        title: 'Highlight Verified Certifications',
        description: 'Your certifications have been verified through external sources. Consider prominently displaying them.',
        suggestedContent: 'Create a dedicated "Verified Certifications" section with credential IDs and verification links',
        impact: 'high',
        priority: 3,
        section: 'certifications',
        actionRequired: 'modify',
        keywords: ['verified', 'certified', 'credential'],
        estimatedScoreImprovement: 12
      });
    }
    
    // Recommend showcasing GitHub metrics
    if (enrichmentResult.enrichmentSummary.portfolio.newProjectsAdded > 0) {
      recommendations.push({
        id: `enrich_portfolio_${recId++}`,
        type: 'content',
        category: 'achievements',
        title: 'Showcase Open Source Contributions',
        description: 'Your GitHub projects show significant engagement. Add metrics like stars and contributions.',
        suggestedContent: 'Include project metrics: [STARS] stars, [FORKS] forks, [CONTRIBUTORS] contributors',
        impact: 'high',
        priority: 4,
        section: 'projects',
        actionRequired: 'add',
        keywords: ['open source', 'github', 'contributions'],
        estimatedScoreImprovement: 10
      });
    }
    
    // Recommend validated skills emphasis
    if (enrichmentResult.enrichmentSummary.skills.skillsValidated > 5) {
      recommendations.push({
        id: `enrich_skills_${recId++}`,
        type: 'structure',
        category: 'skills',
        title: 'Emphasize Validated Technical Skills',
        description: 'Your technical skills have been validated through actual usage in projects and repositories.',
        suggestedContent: 'Reorganize skills with proficiency levels: Expert, Advanced, Intermediate',
        impact: 'medium',
        priority: 5,
        section: 'skills',
        actionRequired: 'modify',
        keywords: ['validated', 'proficiency', 'expertise'],
        estimatedScoreImprovement: 8
      });
    }
    
    return recommendations;
  }
  
  /**
   * Merges all recommendations from different sources
   */
  private mergeAllRecommendations(
    standardRecs: CVRecommendation[],
    roleRecs: CVRecommendation[],
    enrichmentRecs: CVRecommendation[],
    primaryRole?: RoleMatchResult
  ): CVRecommendation[] {
    // First merge standard and role recommendations
    const baseRecommendations = this.mergeRecommendations(standardRecs, roleRecs, primaryRole);
    
    // Then add enrichment recommendations
    const allRecommendations = [...baseRecommendations, ...enrichmentRecs];
    
    // Sort by priority and limit
    return allRecommendations
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 15);
  }
  
  /**
   * Merges standard and role-enhanced recommendations, removing duplicates and prioritizing
   */
  private mergeRecommendations(
    standardRecs: CVRecommendation[],
    roleRecs: CVRecommendation[],
    primaryRole?: RoleMatchResult
  ): CVRecommendation[] {
    const merged: CVRecommendation[] = [];
    const seenSections = new Set<string>();
    
    // Prioritize role-enhanced recommendations
    roleRecs.forEach(rec => {
      merged.push(rec);
      seenSections.add(`${rec.section}_${rec.type}`);
    });
    
    // Add non-duplicate standard recommendations
    standardRecs.forEach(rec => {
      const key = `${rec.section}_${rec.type}`;
      if (!seenSections.has(key)) {
        // Boost priority if it aligns with detected role
        if (primaryRole && this.isRecommendationAlignedWithRole(rec, primaryRole)) {
          rec.priority = Math.max(1, rec.priority - 2);
          rec.estimatedScoreImprovement += 5;
        }
        merged.push(rec);
        seenSections.add(key);
      }
    });
    
    // Sort by priority and limit results
    return merged
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 15); // Limit to top 15 recommendations
  }

  /**
   * Helper methods for mapping between role and CV recommendation formats
   */
  private mapRoleRecTypeToCVRecType(roleType: string): CVRecommendation['type'] {
    switch (roleType) {
      case 'content': return 'content';
      case 'structure': return 'structure';
      case 'keyword': return 'keyword_optimization';
      case 'section': return 'section_addition';
      default: return 'content';
    }
  }

  private mapTargetSectionToCategory(section: any): CVRecommendation['category'] {
    const sectionStr = section.toString().toLowerCase();
    if (sectionStr.includes('summary')) return 'professional_summary';
    if (sectionStr.includes('experience')) return 'experience';
    if (sectionStr.includes('skills')) return 'skills';
    if (sectionStr.includes('education')) return 'education';
    if (sectionStr.includes('achievements')) return 'achievements';
    return 'ats_optimization';
  }

  private mapTargetSectionToString(section: any): string {
    const sectionStr = section.toString();
    // Convert enum-like values to readable strings
    return sectionStr.split('.').pop()?.toLowerCase().replace('_', ' ') || sectionStr;
  }

  private determineActionRequired(type: string): CVRecommendation['actionRequired'] {
    switch (type) {
      case 'content': return 'replace';
      case 'structure': return 'modify';
      case 'keyword': return 'add';
      case 'section': return 'add';
      default: return 'modify';
    }
  }

  private extractKeywordsFromTemplate(template: string): string[] {
    // Extract meaningful keywords from template text
    const keywords = template
      .toLowerCase()
      .replace(/\[.*?\]/g, '') // Remove placeholder brackets
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && 
        !['with', 'that', 'this', 'from', 'were', 'have', 'been', 'will', 'your'].includes(word)
      )
      .slice(0, 5);
    
    return keywords;
  }

  private isRecommendationAlignedWithRole(rec: CVRecommendation, role: RoleMatchResult): boolean {
    // Check if recommendation keywords align with role matching factors
    const roleKeywords = role.matchingFactors
      .flatMap(factor => factor.matchedKeywords)
      .map(kw => kw.toLowerCase());
    
    const recKeywords = (rec.keywords || [])
      .concat(rec.title.toLowerCase().split(' '))
      .map(kw => kw.toLowerCase());
    
    return recKeywords.some(recKw => 
      roleKeywords.some(roleKw => 
        roleKw.includes(recKw) || recKw.includes(roleKw)
      )
    );
  }

  /**
   * Enhanced apply recommendations method that includes role context
   */
  async applyRoleEnhancedRecommendations(
    originalCV: ParsedCV,
    selectedRecommendations: CVRecommendation[],
    includeRoleAnalysis: boolean = true
  ): Promise<CVTransformationResult> {
    
    // Apply standard recommendations
    const baseResult = await this.applyRecommendations(originalCV, selectedRecommendations);
    
    // Add role analysis if requested
    if (includeRoleAnalysis) {
      try {
        const roleAnalysis = await this.roleDetectionService.detectRoles(baseResult.improvedCV);
        const detectedRole = roleAnalysis.primaryRole;
        
        // Extract role-enhanced recommendations
        const roleEnhancedRecs = selectedRecommendations.filter(rec => rec.roleBasedRecommendation);
        
        const enhancedResult: CVTransformationResult = {
          ...baseResult,
          roleAnalysis,
          detectedRole,
          roleEnhancedRecommendations: roleEnhancedRecs
        };
        
        return enhancedResult;
        
      } catch (error) {
        return baseResult;
      }
    }
    
    return baseResult;
  }

  /**
   * Get role-specific enhancement templates for a CV
   */
  async getRoleEnhancementTemplates(parsedCV: ParsedCV): Promise<{
    detectedRole: RoleMatchResult | null;
    templates: {
      professionalSummary?: string;
      experienceEnhancements?: string[];
      skillsOptimization?: string[];
      achievementTemplates?: string[];
    };
  }> {
    try {
      const roleAnalysis = await this.roleDetectionService.detectRoles(parsedCV);
      const primaryRoleResult = roleAnalysis.primaryRole; // Get the primary role match result
      
      if (!primaryRoleResult || primaryRoleResult.confidence < 0.5) {
        return {
          detectedRole: null,
          templates: {}
        };
      }

      // Get the actual role profile using the role service
      const roleProfile = await this.roleProfileService.getProfileById(primaryRoleResult.roleId);
      
      if (!roleProfile) {
        return {
          detectedRole: primaryRoleResult,
          templates: {}
        };
      }
      
      return {
        detectedRole: primaryRoleResult,
        templates: {
          professionalSummary: roleProfile.enhancementTemplates.professionalSummary,
          experienceEnhancements: roleProfile.enhancementTemplates.experienceEnhancements.map((exp: any) => exp.bulletPointTemplate),
          skillsOptimization: roleProfile.enhancementTemplates.keywordOptimization,
          achievementTemplates: roleProfile.enhancementTemplates.achievementTemplates
        }
      };
      
    } catch (error) {
      return {
        detectedRole: null,
        templates: {}
      };
    }
  }
}