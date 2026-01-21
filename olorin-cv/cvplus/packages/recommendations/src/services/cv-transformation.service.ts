/**
 * CV Transformation Service
 * Handles CV analysis, recommendations generation, and transformations
  */

import { CVParsedData, Recommendation, RecommendationType, RecommendationCategory, CVSection, ActionType, ImpactLevel } from '../types';

export interface TransformationOptions {
  targetRole?: string;
  industryKeywords?: string[];
  focusAreas?: string[];
  preserveFormatting?: boolean;
}

export interface TransformationResult {
  transformedCV: CVParsedData;
  appliedRecommendations: string[];
  summary: {
    totalChanges: number;
    sectionsModified: string[];
    estimatedImprovementScore: number;
  };
}

export class CVTransformationService {
  async generateDetailedRecommendations(
    cvData: CVParsedData, 
    targetRole?: string, 
    industryKeywords?: string[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Generate comprehensive recommendations based on CV analysis
    recommendations.push(...this.analyzePersonalInfo(cvData));
    recommendations.push(...this.analyzeProfessionalSummary(cvData, targetRole));
    recommendations.push(...this.analyzeExperience(cvData, targetRole, industryKeywords));
    recommendations.push(...this.analyzeSkills(cvData, targetRole, industryKeywords));
    recommendations.push(...this.analyzeEducation(cvData));
    recommendations.push(...this.analyzeAchievements(cvData));
    
    return recommendations;
  }
  
  async generateRoleEnhancedRecommendations(
    cvData: CVParsedData,
    enhance: boolean = true,
    targetRole?: string,
    industryKeywords?: string[]
  ): Promise<Recommendation[]> {
    const baseRecommendations = await this.generateDetailedRecommendations(cvData, targetRole, industryKeywords);
    
    if (!enhance || !targetRole) {
      return baseRecommendations;
    }
    
    // Add role-specific enhancements
    const roleSpecificRecs = this.generateRoleSpecificRecommendations(cvData, targetRole, industryKeywords);
    
    return [...baseRecommendations, ...roleSpecificRecs];
  }
  
  async applyRecommendations(
    cvData: CVParsedData, 
    recommendations: Recommendation[],
    options: TransformationOptions = {}
  ): Promise<TransformationResult> {
    const transformedCV = { ...cvData };
    const appliedRecommendations: string[] = [];
    const sectionsModified: string[] = [];
    let totalChanges = 0;
    
    for (const rec of recommendations) {
      if (rec.isSelected !== false) { // Apply if not explicitly deselected
        try {
          this.applyIndividualRecommendation(transformedCV, rec);
          appliedRecommendations.push(rec.id);
          
          if (!sectionsModified.includes(rec.section)) {
            sectionsModified.push(rec.section);
          }
          totalChanges++;
        } catch (error) {
          logger.warn(`Failed to apply recommendation ${rec.id}:`, error);
        }
      }
    }
    
    const estimatedImprovementScore = this.calculateImprovementScore(recommendations.filter(r => r.isSelected !== false));
    
    return {
      transformedCV,
      appliedRecommendations,
      summary: {
        totalChanges,
        sectionsModified,
        estimatedImprovementScore
      }
    };
  }
  
  private analyzePersonalInfo(cvData: CVParsedData): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (!cvData.personalInfo.title) {
      recommendations.push({
        id: `rec_${Date.now()}_title`,
        type: RecommendationType.CONTENT,
        category: RecommendationCategory.PROFESSIONAL_SUMMARY,
        section: CVSection.PERSONAL_INFO,
        actionRequired: ActionType.ADD,
        title: 'Add Professional Title',
        description: 'Include a professional title below your name to immediately communicate your role.',
        suggestedContent: 'Senior Software Developer', // This would be dynamic based on experience
        impact: ImpactLevel.HIGH,
        priority: 8,
        estimatedScoreImprovement: 15
      });
    }
    
    return recommendations;
  }
  
  private analyzeProfessionalSummary(cvData: CVParsedData, targetRole?: string): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (!cvData.professionalSummary || cvData.professionalSummary.length < 50) {
      recommendations.push({
        id: `rec_${Date.now()}_summary`,
        type: RecommendationType.SECTION_ADDITION,
        category: RecommendationCategory.PROFESSIONAL_SUMMARY,
        section: CVSection.PROFESSIONAL_SUMMARY,
        actionRequired: ActionType.ADD,
        title: 'Add Professional Summary',
        description: 'A compelling professional summary can significantly improve your CV\'s impact.',
        suggestedContent: this.generateSampleSummary(cvData, targetRole),
        impact: ImpactLevel.HIGH,
        priority: 9,
        estimatedScoreImprovement: 20
      });
    }
    
    return recommendations;
  }
  
  private analyzeExperience(cvData: CVParsedData, targetRole?: string, industryKeywords?: string[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Check if experience descriptions are detailed enough
    cvData.experience?.forEach((exp, index) => {
      if (!exp.description || exp.description.length < 100) {
        recommendations.push({
          id: `rec_${Date.now()}_exp_${index}`,
          type: RecommendationType.CONTENT,
          category: RecommendationCategory.EXPERIENCE,
          section: CVSection.EXPERIENCE,
          actionRequired: ActionType.MODIFY,
          title: `Enhance ${exp.title} Experience`,
          description: 'Provide more detailed description with quantifiable achievements.',
          currentContent: exp.description,
          suggestedContent: this.generateSampleExperienceDescription(exp, targetRole, industryKeywords),
          impact: ImpactLevel.HIGH,
          priority: 7,
          estimatedScoreImprovement: 12
        });
      }
    });
    
    return recommendations;
  }
  
  private analyzeSkills(cvData: CVParsedData, targetRole?: string, industryKeywords?: string[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Basic skills analysis
    if (!cvData.skills || (Array.isArray(cvData.skills) && cvData.skills.length === 0)) {
      recommendations.push({
        id: `rec_${Date.now()}_skills`,
        type: RecommendationType.SECTION_ADDITION,
        category: RecommendationCategory.SKILLS,
        section: CVSection.SKILLS,
        actionRequired: ActionType.ADD,
        title: 'Add Skills Section',
        description: 'A well-organized skills section is essential for ATS compatibility.',
        suggestedContent: this.generateSampleSkills(targetRole, industryKeywords),
        impact: ImpactLevel.HIGH,
        priority: 8,
        estimatedScoreImprovement: 18
      });
    }
    
    return recommendations;
  }
  
  private analyzeEducation(cvData: CVParsedData): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (!cvData.education || cvData.education.length === 0) {
      recommendations.push({
        id: `rec_${Date.now()}_education`,
        type: RecommendationType.SECTION_ADDITION,
        category: RecommendationCategory.EDUCATION,
        section: CVSection.EDUCATION,
        actionRequired: ActionType.ADD,
        title: 'Add Education Section',
        description: 'Include your educational background to provide a complete professional profile.',
        impact: ImpactLevel.MEDIUM,
        priority: 5,
        estimatedScoreImprovement: 10
      });
    }
    
    return recommendations;
  }
  
  private analyzeAchievements(cvData: CVParsedData): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    if (!cvData.achievements || cvData.achievements.length === 0) {
      recommendations.push({
        id: `rec_${Date.now()}_achievements`,
        type: RecommendationType.SECTION_ADDITION,
        category: RecommendationCategory.ACHIEVEMENTS,
        section: CVSection.ACHIEVEMENTS,
        actionRequired: ActionType.ADD,
        title: 'Add Key Achievements',
        description: 'Highlight your key achievements to stand out from other candidates.',
        suggestedContent: 'Add measurable achievements such as "Increased sales by 25%" or "Led team of 10 developers"',
        impact: ImpactLevel.HIGH,
        priority: 7,
        estimatedScoreImprovement: 15
      });
    }
    
    return recommendations;
  }
  
  private generateRoleSpecificRecommendations(
    cvData: CVParsedData, 
    targetRole: string, 
    industryKeywords?: string[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Role-specific keyword optimization
    recommendations.push({
      id: `rec_${Date.now()}_keywords`,
      type: RecommendationType.KEYWORD_OPTIMIZATION,
      category: RecommendationCategory.ATS_OPTIMIZATION,
      section: CVSection.PROFESSIONAL_SUMMARY, // Could be any section
      actionRequired: ActionType.MODIFY,
      title: 'Optimize for Target Role Keywords',
      description: `Incorporate keywords relevant to ${targetRole} role for better ATS matching.`,
      suggestedContent: industryKeywords?.join(', ') || 'Industry-specific keywords',
      impact: ImpactLevel.HIGH,
      priority: 9,
      estimatedScoreImprovement: 25
    });
    
    return recommendations;
  }
  
  private applyIndividualRecommendation(cvData: CVParsedData, recommendation: Recommendation): void {
    // This is a simplified implementation
    // In reality, this would have more sophisticated logic for each recommendation type
    
    switch (recommendation.section) {
      case CVSection.PERSONAL_INFO:
        if (recommendation.actionRequired === ActionType.ADD && recommendation.suggestedContent) {
          if (recommendation.title.includes('Title')) {
            cvData.personalInfo.title = recommendation.suggestedContent;
          }
        }
        break;
        
      case CVSection.PROFESSIONAL_SUMMARY:
        if (recommendation.actionRequired === ActionType.ADD && recommendation.suggestedContent) {
          cvData.professionalSummary = recommendation.suggestedContent;
        }
        break;
        
      // Add more section handling as needed
    }
  }
  
  private calculateImprovementScore(appliedRecommendations: Recommendation[]): number {
    return appliedRecommendations.reduce((total, rec) => total + rec.estimatedScoreImprovement, 0);
  }
  
  private generateSampleSummary(cvData: CVParsedData, targetRole?: string): string {
    const experience = cvData.experience?.[0];
    const roleTitle = targetRole || experience?.title || 'Professional';
    
    return `Experienced ${roleTitle} with a proven track record of delivering high-quality results. ` +
           `Strong expertise in relevant technologies and methodologies with excellent problem-solving abilities.`;
  }
  
  private generateSampleExperienceDescription(exp: any, targetRole?: string, industryKeywords?: string[]): string {
    return `${exp.description || ''} Delivered measurable results through innovative solutions and collaborative teamwork. ` +
           `Utilized ${industryKeywords?.slice(0, 3).join(', ') || 'relevant technologies'} to achieve objectives.`;
  }
  
  private generateSampleSkills(targetRole?: string, industryKeywords?: string[]): string {
    const defaultSkills = ['Communication', 'Problem Solving', 'Team Leadership', 'Project Management'];
    const skills = industryKeywords ? [...industryKeywords, ...defaultSkills] : defaultSkills;
    return skills.slice(0, 8).join(', ');
  }
}

// Re-export for compatibility
export type CVRecommendation = Recommendation;