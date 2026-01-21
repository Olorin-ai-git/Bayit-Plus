// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { ParsedCV, CVRecommendation } from '../../../types/job';
import { VerifiedClaudeService } from '../../../services/verified-claude.service';

export interface ATSAnalysisResult {
  currentScore: number;
  predictedScore: number;
  issues: Array<{
    message: string;
    severity: 'error' | 'warning' | 'info';
    category: string;
    section?: string;
    fix?: string;
  }>;
  suggestions: CVRecommendation[];
  keywords: {
    missing: string[];
    present: string[];
    recommendations: string[];
  };
  formatAnalysis: {
    isATSFriendly: boolean;
    issues: string[];
    recommendations: string[];
  };
}

export class EnhancedATSAnalysisService {
  private claudeService: VerifiedClaudeService;

  constructor() {
    this.claudeService = new VerifiedClaudeService();
  }

  /**
   * Performs comprehensive ATS analysis and generates actionable recommendations
   */
  async analyzeForATS(
    parsedCV: ParsedCV,
    jobDescription?: string,
    targetRole?: string,
    industryKeywords?: string[]
  ): Promise<ATSAnalysisResult> {

    try {
      // Parallel analysis for efficiency
      const [
        scoreAnalysis,
        keywordAnalysis,
        formatAnalysis,
        contentRecommendations
      ] = await Promise.all([
        this.calculateATSScore(parsedCV, jobDescription),
        this.analyzeKeywords(parsedCV, jobDescription, industryKeywords),
        this.analyzeFormat(parsedCV),
        this.generateContentRecommendations(parsedCV, targetRole, jobDescription)
      ]);

      const issues = [
        ...scoreAnalysis.issues,
        ...keywordAnalysis.issues,
        ...formatAnalysis.issues
      ];

      const allSuggestions = [
        ...scoreAnalysis.suggestions,
        ...keywordAnalysis.suggestions,
        ...formatAnalysis.suggestions,
        ...contentRecommendations
      ];

      // Remove duplicates and prioritize
      const uniqueSuggestions = this.deduplicateAndPrioritize(allSuggestions);

      return {
        currentScore: scoreAnalysis.score,
        predictedScore: this.calculatePredictedScore(scoreAnalysis.score, uniqueSuggestions),
        issues,
        suggestions: uniqueSuggestions,
        keywords: keywordAnalysis.keywords,
        formatAnalysis: formatAnalysis.format
      };

    } catch (error) {
      throw new Error(`ATS analysis failed: ${(error as Error).message}`);
    }
  }

  private async calculateATSScore(
    parsedCV: ParsedCV,
    jobDescription?: string
  ): Promise<{
    score: number;
    issues: Array<{ message: string; severity: 'error' | 'warning' | 'info'; category: string; section?: string; fix?: string }>;
    suggestions: CVRecommendation[];
  }> {
    const issues: any[] = [];
    const suggestions: CVRecommendation[] = [];
    let score = 100;

    // Check for essential sections
    if (!parsedCV.personalInfo?.name) {
      score -= 20;
      issues.push({
        message: 'Missing contact name',
        severity: 'error' as const,
        category: 'personal_info',
        section: 'Personal Information',
        fix: 'Add your full name to the CV'
      });
    }

    if (!parsedCV.personalInfo?.email) {
      score -= 15;
      issues.push({
        message: 'Missing email address',
        severity: 'error' as const,
        category: 'personal_info',
        section: 'Personal Information',
        fix: 'Add a professional email address'
      });
    }

    if (!parsedCV.personalInfo?.phone) {
      score -= 10;
      issues.push({
        message: 'Missing phone number',
        severity: 'warning' as const,
        category: 'personal_info',
        section: 'Personal Information',
        fix: 'Add a phone number for contact'
      });
    }

    // Check for professional summary
    if (!parsedCV.summary && !parsedCV.personalInfo?.summary) {
      score -= 25;
      issues.push({
        message: 'Missing professional summary',
        severity: 'error' as const,
        category: 'summary',
        section: 'Professional Summary',
        fix: 'Add a compelling professional summary at the top of your CV'
      });
      
      suggestions.push({
        id: 'ats_summary_missing',
        type: 'section_addition',
        category: 'professional_summary',
        title: 'Add Professional Summary',
        description: 'ATS systems prioritize CVs with clear professional summaries. This helps both ATS and recruiters quickly understand your value proposition.',
        suggestedContent: await this.generateProfessionalSummary(parsedCV, jobDescription),
        impact: 'high',
        priority: 1,
        section: 'professional_summary',
        actionRequired: 'add',
        keywords: this.extractKeywordsFromRole(jobDescription),
        estimatedScoreImprovement: 25
      });
    }

    // Check experience section
    if (!parsedCV.experience || parsedCV.experience.length === 0) {
      score -= 30;
      issues.push({
        message: 'Missing work experience section',
        severity: 'error' as const,
        category: 'experience',
        section: 'Work Experience',
        fix: 'Add your work experience with specific achievements'
      });
    } else {
      // Check for weak experience descriptions
      const weakExperiences = parsedCV.experience.filter(exp => 
        !exp.description || exp.description.split(' ').length < 10
      );
      
      if (weakExperiences.length > 0) {
        score -= 20;
        issues.push({
          message: `${weakExperiences.length} experience entries have insufficient detail`,
          severity: 'warning' as const,
          category: 'experience',
          section: 'Work Experience',
          fix: 'Expand experience descriptions with specific achievements and metrics'
        });

        // Generate recommendations for each weak experience
        for (let i = 0; i < Math.min(weakExperiences.length, 3); i++) {
          const exp = weakExperiences[i];
          if (!exp) continue; // Skip if experience is undefined
          
          suggestions.push({
            id: `ats_experience_${i}`,
            type: 'content',
            category: 'experience',
            title: `Enhance ${exp.position} Description`,
            description: 'Current experience description lacks detail and quantifiable achievements. ATS systems and recruiters look for specific metrics and accomplishments.',
            currentContent: exp.description || 'Limited description provided',
            suggestedContent: await this.enhanceExperienceDescription(exp, jobDescription),
            impact: 'high',
            priority: 2 + i,
            section: 'experience',
            actionRequired: 'replace',
            keywords: this.extractRelevantSkills(exp.position, jobDescription),
            estimatedScoreImprovement: 15
          });
        }
      }
    }

    // Check skills section
    if (!parsedCV.skills || 
        (Array.isArray(parsedCV.skills) && parsedCV.skills.length === 0) ||
        (!Array.isArray(parsedCV.skills) && (!parsedCV.skills.technical || parsedCV.skills.technical.length === 0))) {
      score -= 20;
      issues.push({
        message: 'Missing or insufficient skills section',
        severity: 'warning' as const,
        category: 'skills',
        section: 'Skills',
        fix: 'Add relevant technical and soft skills'
      });
    }

    return { score: Math.max(score, 0), issues, suggestions };
  }

  private async analyzeKeywords(
    parsedCV: ParsedCV,
    jobDescription?: string,
    industryKeywords?: string[]
  ): Promise<{
    keywords: { missing: string[]; present: string[]; recommendations: string[] };
    issues: Array<{ message: string; severity: 'error' | 'warning' | 'info'; category: string; section?: string; fix?: string }>;
    suggestions: CVRecommendation[];
  }> {
    const issues: any[] = [];
    const suggestions: CVRecommendation[] = [];

    if (!jobDescription && !industryKeywords?.length) {
      return {
        keywords: { missing: [], present: [], recommendations: [] },
        issues,
        suggestions
      };
    }

    try {
      const keywordAnalysisPrompt = `Analyze this CV against the job requirements and identify missing keywords that should be added for ATS optimization.

CV Content:
${JSON.stringify(parsedCV, null, 2)}

${jobDescription ? `Job Description:\n${jobDescription}` : ''}
${industryKeywords?.length ? `Industry Keywords: ${industryKeywords.join(', ')}` : ''}

Return a JSON response with:
{
  "presentKeywords": ["list", "of", "keywords", "found", "in", "cv"],
  "missingKeywords": ["critical", "keywords", "missing", "from", "cv"],
  "recommendedKeywords": ["specific", "keywords", "to", "add"],
  "keywordPlacements": {
    "summary": ["keywords", "for", "summary"],
    "skills": ["keywords", "for", "skills"],
    "experience": ["keywords", "for", "experience"]
  }
}`;

      const response = await this.claudeService.createVerifiedMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.2,
        system: 'You are an ATS optimization expert. Analyze CVs for keyword optimization and provide specific, actionable recommendations for improving ATS compatibility.',
        messages: [
          {
            role: 'user',
            content: keywordAnalysisPrompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        try {
          const analysis = JSON.parse(content.text);
          
          if (analysis.missingKeywords?.length > 0) {
            issues.push({
              message: `Missing ${analysis.missingKeywords.length} important keywords`,
              severity: 'warning' as const,
              category: 'keywords',
              section: 'Overall',
              fix: `Add keywords: ${analysis.missingKeywords.slice(0, 5).join(', ')}`
            });

            // Create keyword optimization recommendations
            if (analysis.keywordPlacements?.skills?.length > 0) {
              suggestions.push({
                id: 'ats_keywords_skills',
                type: 'keyword_optimization',
                category: 'skills',
                title: 'Optimize Skills with Key Industry Terms',
                description: `Add ${analysis.keywordPlacements.skills.length} industry-relevant keywords to your skills section to improve ATS matching.`,
                currentContent: this.getSkillsAsString(parsedCV.skills),
                suggestedContent: this.mergeSkillsWithKeywords(parsedCV.skills, analysis.keywordPlacements.skills),
                impact: 'high',
                priority: 3,
                section: 'skills',
                actionRequired: 'modify',
                keywords: analysis.keywordPlacements.skills,
                estimatedScoreImprovement: 15
              });
            }

            if (analysis.keywordPlacements?.summary?.length > 0 && (!parsedCV.summary && !parsedCV.personalInfo?.summary)) {
              suggestions.push({
                id: 'ats_keywords_summary',
                type: 'keyword_optimization',
                category: 'professional_summary',
                title: 'Create Keyword-Optimized Summary',
                description: 'Add a professional summary with targeted keywords to improve ATS ranking.',
                suggestedContent: await this.generateKeywordOptimizedSummary(parsedCV, analysis.keywordPlacements.summary),
                impact: 'high',
                priority: 1,
                section: 'professional_summary',
                actionRequired: 'add',
                keywords: analysis.keywordPlacements.summary,
                estimatedScoreImprovement: 20
              });
            }
          }

          return {
            keywords: {
              missing: analysis.missingKeywords || [],
              present: analysis.presentKeywords || [],
              recommendations: analysis.recommendedKeywords || []
            },
            issues,
            suggestions
          };

        } catch (parseError) {
        }
      }
    } catch (error) {
    }

    return {
      keywords: { missing: [], present: [], recommendations: [] },
      issues,
      suggestions
    };
  }

  private analyzeFormat(parsedCV: ParsedCV): {
    format: { isATSFriendly: boolean; issues: string[]; recommendations: string[] };
    issues: Array<{ message: string; severity: 'error' | 'warning' | 'info'; category: string; section?: string; fix?: string }>;
    suggestions: CVRecommendation[];
  } {
    const issues: any[] = [];
    const suggestions: CVRecommendation[] = [];
    const formatIssues: string[] = [];
    const formatRecommendations: string[] = [];

    // Check for consistent date formats
    if (parsedCV.experience) {
      const inconsistentDates = parsedCV.experience.some(exp => 
        !exp.startDate || !exp.endDate || exp.duration?.includes('undefined')
      );
      
      if (inconsistentDates) {
        formatIssues.push('Inconsistent date formats in experience section');
        formatRecommendations.push('Use consistent date format: MM/YYYY - MM/YYYY');
        
        issues.push({
          message: 'Inconsistent date formats detected',
          severity: 'warning' as const,
          category: 'formatting',
          section: 'Work Experience',
          fix: 'Use consistent date format throughout CV'
        });
      }
    }

    // Check for section organization
    const hasProperStructure = parsedCV.personalInfo && parsedCV.experience;
    if (!hasProperStructure) {
      formatIssues.push('Missing essential CV sections');
      formatRecommendations.push('Include all essential sections: Contact Info, Summary, Experience, Skills, Education');
    }

    const isATSFriendly = formatIssues.length === 0;

    return {
      format: {
        isATSFriendly,
        issues: formatIssues,
        recommendations: formatRecommendations
      },
      issues,
      suggestions
    };
  }

  private async generateContentRecommendations(
    parsedCV: ParsedCV,
    targetRole?: string,
    jobDescription?: string
  ): Promise<CVRecommendation[]> {
    const recommendations: CVRecommendation[] = [];

    try {
      const contentPrompt = `Analyze this CV and provide specific content improvement recommendations for ${targetRole || 'the target role'}.

CV Data:
${JSON.stringify(parsedCV, null, 2)}

${jobDescription ? `\nJob Description:\n${jobDescription}` : ''}

Focus on:
1. Quantifying achievements with specific metrics
2. Using strong action verbs
3. Highlighting relevant accomplishments
4. Improving bullet point impact

Provide 3-5 specific recommendations with exact current content and improved versions.`;

      const response = await this.claudeService.createVerifiedMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        temperature: 0.3,
        system: `You are a professional CV writer specializing in ATS optimization. Provide specific, actionable content improvements with exact text replacements.

Return recommendations in this JSON format:
{
  "recommendations": [
    {
      "title": "Brief improvement title",
      "description": "Why this improvement is needed",
      "section": "Section name",
      "currentContent": "Exact current text",
      "suggestedContent": "Specific improved text",
      "impact": "high|medium|low",
      "keywords": ["relevant", "keywords"]
    }
  ]
}`,
        messages: [
          {
            role: 'user',
            content: contentPrompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        try {
          const analysis = JSON.parse(content.text);
          
          if (analysis.recommendations?.length > 0) {
            analysis.recommendations.forEach((rec: any, index: number) => {
              recommendations.push({
                id: `content_improvement_${index}`,
                type: 'content',
                category: this.mapSectionToCategory(rec.section),
                title: rec.title || 'Content Improvement',
                description: rec.description || 'Improve content quality',
                currentContent: rec.currentContent,
                suggestedContent: rec.suggestedContent,
                impact: rec.impact || 'medium',
                priority: 5 + index,
                section: rec.section || 'experience',
                actionRequired: 'replace',
                keywords: rec.keywords || [],
                estimatedScoreImprovement: rec.impact === 'high' ? 15 : rec.impact === 'medium' ? 10 : 5
              });
            });
          }
        } catch (parseError) {
        }
      }
    } catch (error) {
    }

    return recommendations;
  }

  // Helper methods
  private async generateProfessionalSummary(parsedCV: ParsedCV, _jobDescription?: string): Promise<string> {
    const role = this.inferRoleFromExperience(parsedCV.experience);
    const skills = this.getTopSkills(parsedCV.skills, 5);
    const experience = parsedCV.experience?.[0];
    
    return `Results-driven ${role} with ${this.calculateYearsOfExperience(parsedCV.experience)}+ years of experience in ${skills.slice(0, 3).join(', ')}. Proven track record of ${experience?.company ? `delivering exceptional results at ${experience.company}` : 'delivering high-impact projects'}. Expertise in ${skills.join(', ')} with demonstrated ability to drive innovation and efficiency. Seeking to leverage technical excellence and leadership skills in a challenging ${role} position.`;
  }

  private async enhanceExperienceDescription(exp: any, _jobDescription?: string): Promise<string> {
    const actionVerbs = ['Led', 'Developed', 'Implemented', 'Managed', 'Delivered', 'Optimized', 'Increased', 'Reduced'];
    const randomVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
    
    return `${randomVerb} ${exp.position.toLowerCase()} initiatives at ${exp.company}, delivering measurable business impact through strategic implementation of key technologies. Collaborated with cross-functional teams of [INSERT TEAM SIZE] to achieve [ADD PERCENTAGE]% improvement in operational efficiency. Successfully managed projects worth [INSERT BUDGET] budget, completing all deliverables [INSERT TIMEFRAME] ahead of schedule with [ADD PERCENTAGE]% cost savings.`;
  }

  private async generateKeywordOptimizedSummary(parsedCV: ParsedCV, keywords: string[]): Promise<string> {
    const role = this.inferRoleFromExperience(parsedCV.experience);
    const topKeywords = keywords.slice(0, 6);
    
    return `Experienced ${role} specializing in ${topKeywords.slice(0, 3).join(', ')} with proven expertise in ${topKeywords.slice(3).join(', ')}. Track record of delivering high-impact solutions and driving business growth through innovative technology implementations. Demonstrated leadership in managing complex projects and cross-functional teams.`;
  }

  private deduplicateAndPrioritize(suggestions: CVRecommendation[]): CVRecommendation[] {
    const seen = new Set<string>();
    const deduplicated = suggestions.filter(suggestion => {
      const key = `${suggestion.type}-${suggestion.section}-${suggestion.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduplicated
      .sort((a, b) => {
        // Sort by priority first, then by impact
        if (a.priority !== b.priority) return a.priority - b.priority;
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      })
      .slice(0, 10); // Limit to top 10 recommendations
  }

  private calculatePredictedScore(currentScore: number, suggestions: CVRecommendation[]): number {
    const totalImprovement = suggestions.reduce((sum, rec) => sum + rec.estimatedScoreImprovement, 0);
    return Math.min(currentScore + totalImprovement, 100);
  }

  // Utility methods
  private extractKeywordsFromRole(jobDescription?: string): string[] {
    if (!jobDescription) return [];
    
    const commonKeywords = ['leadership', 'collaboration', 'innovation', 'efficiency', 'results-driven'];
    const words = jobDescription.toLowerCase().split(/\W+/);
    const relevantWords = words.filter(word => word.length > 4 && !['experience', 'required', 'preferred'].includes(word));
    
    return [...new Set([...commonKeywords, ...relevantWords.slice(0, 5)])];
  }

  private extractRelevantSkills(position: string, jobDescription?: string): string[] {
    const positionKeywords = position.toLowerCase().split(/\s+/);
    const jobKeywords = jobDescription ? jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 4) : [];
    
    return [...new Set([...positionKeywords, ...jobKeywords.slice(0, 5)])];
  }

  private getSkillsAsString(skills: any): string {
    if (Array.isArray(skills)) {
      return skills.join(', ');
    } else if (skills && typeof skills === 'object') {
      return Object.values(skills).flat().join(', ');
    }
    return '';
  }

  private mergeSkillsWithKeywords(currentSkills: any, keywords: string[]): string {
    const currentSkillsArray = Array.isArray(currentSkills) 
      ? currentSkills 
      : currentSkills?.technical || [];
    
    const merged = [...new Set([...currentSkillsArray, ...keywords])];
    return merged.join(', ');
  }

  private inferRoleFromExperience(experience?: any[]): string {
    if (!experience || experience.length === 0) return 'Professional';
    
    const latestRole = experience[0]?.position || 'Professional';
    const commonTitles = ['Developer', 'Engineer', 'Manager', 'Analyst', 'Specialist', 'Consultant'];
    
    for (const title of commonTitles) {
      if (latestRole.toLowerCase().includes(title.toLowerCase())) {
        return title;
      }
    }
    
    return latestRole.split(' ')[0] || 'Professional';
  }

  private getTopSkills(skills: any, count: number): string[] {
    if (Array.isArray(skills)) {
      return skills.slice(0, count);
    } else if (skills && typeof skills === 'object') {
      const allSkills = Object.values(skills).flat() as string[];
      return allSkills.slice(0, count);
    }
    return [];
  }

  private calculateYearsOfExperience(experience?: any[]): string {
    if (!experience || experience.length === 0) return '2';
    
    // Simple calculation based on number of roles
    const years = Math.max(2, Math.min(15, experience.length * 2));
    return years.toString();
  }

  private mapSectionToCategory(section: string): CVRecommendation['category'] {
    const mapping: Record<string, CVRecommendation['category']> = {
      'experience': 'experience',
      'work experience': 'experience',
      'professional experience': 'experience',
      'skills': 'skills',
      'education': 'education',
      'summary': 'professional_summary',
      'professional summary': 'professional_summary',
      'achievements': 'achievements',
      'accomplishments': 'achievements'
    };
    
    return mapping[section.toLowerCase()] || 'experience';
  }
}