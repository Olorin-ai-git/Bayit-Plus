// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Role Detection Analyzer
 * 
 * Handles analysis and feature extraction for role detection
 */

import { ParsedCV } from '../types/job';
import {
  RoleProfile,
  RoleMatchResult,
  RoleDetectionConfig,
  RoleProfileAnalysis,
  MatchingFactor,
  RoleBasedRecommendation,
  CVSection,
  ExperienceLevel
} from '../../../core/src/types/role-profile.types';
import { RoleProfileService } from '../../../core/src/services/role-profile.service';
import { RoleRecommendationsService } from './role-detection-recommendations';
import {
  getCVFullText,
  calculateRecencyWeight,
  extractKeywords,
  detectHybridRoles
} from './role-detection-helpers';
import { detectExperienceLevel } from './role-detection-maps';

export class RoleDetectionAnalyzer {
  private config: RoleDetectionConfig;
  private roleProfileService: RoleProfileService;
  private recommendationsService: RoleRecommendationsService;

  constructor(config: RoleDetectionConfig, roleProfileService: RoleProfileService) {
    this.config = config;
    this.roleProfileService = roleProfileService;
    this.recommendationsService = new RoleRecommendationsService(roleProfileService);
  }

  /**
   * Analyze role compatibility between CV and role profile
   */
  async analyzeRoleCompatibility(cv: ParsedCV, profile: RoleProfile): Promise<RoleProfileAnalysis> {
    // Create a basic role match result for primary role
    const primaryRole: RoleMatchResult = {
      roleId: profile.id,
      roleName: profile.name,
      confidence: this.calculateBasicCompatibility(cv, profile),
      matchingFactors: [],
      enhancementPotential: 0.8,
      recommendations: await this.generateBasicRecommendations(cv, profile),
      scoringReasoning: 'Basic compatibility analysis',
      fitAnalysis: {
        strengths: this.identifyStrengths(cv, profile),
        gaps: this.identifySkillGaps(cv, profile),
        overallAssessment: 'Basic assessment completed'
      }
    };

    const analysis: RoleProfileAnalysis = {
      primaryRole,
      alternativeRoles: [], // No alternatives in basic analysis
      overallConfidence: primaryRole.confidence,
      enhancementSuggestions: {
        immediate: primaryRole.recommendations.slice(0, 2),
        strategic: primaryRole.recommendations.slice(2)
      },
      gapAnalysis: {
        missingSkills: this.identifySkillGaps(cv, profile),
        weakAreas: this.identifyImprovements(cv, profile),
        strengthAreas: this.identifyStrengths(cv, profile)
      },
      scoringBreakdown: {
        totalRolesAnalyzed: 1,
        adjustedThreshold: this.config.confidenceThreshold,
        originalThreshold: this.config.confidenceThreshold,
        averageConfidence: primaryRole.confidence,
        topFactors: [{
          factor: 'Basic Compatibility',
          contribution: primaryRole.confidence,
          explanation: 'Overall compatibility assessment'
        }]
      },
      detectionMetadata: {
        processingTime: 100,
        algorithmVersion: '1.0.0',
        adjustmentsMade: ['Basic analysis applied'],
        confidenceDistribution: [{
          range: '0.5-1.0',
          count: 1
        }]
      }
    };

    return analysis;
  }

  /**
   * Calculate basic compatibility score
   */
  private calculateBasicCompatibility(cv: ParsedCV, profile: RoleProfile): number {
    let score = 0.5; // Base score
    
    // Check title match
    if (cv.personalInfo?.title && profile.name) {
      const titleWords = cv.personalInfo.title.toLowerCase().split(' ');
      const profileWords = profile.name.toLowerCase().split(' ');
      
      const commonWords = titleWords.filter(word => profileWords.includes(word));
      if (commonWords.length > 0) {
        score += 0.2;
      }
    }
    
    // Check skills match
    if (cv.skills && profile.requiredSkills) {
      const cvSkills = Array.isArray(cv.skills) 
        ? cv.skills.map(s => s.toLowerCase())
        : Object.values(cv.skills).flat().filter(Boolean).map(s => s.toLowerCase());
      
      const requiredSkills = profile.requiredSkills.map(s => s.toLowerCase());
      const matchingSkills = cvSkills.filter((skill: any) => 
        requiredSkills.some(req => skill.includes(req) || req.includes(skill))
      );
      
      score += (matchingSkills.length / requiredSkills.length) * 0.3;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Identify strength areas
   */
  private identifyStrengths(cv: ParsedCV, profile: RoleProfile): string[] {
    const strengths: string[] = [];
    
    if (cv.personalInfo?.title) {
      strengths.push('Professional title alignment');
    }
    
    if (cv.skills) {
      strengths.push('Technical skills foundation');
    }
    
    if (cv.experience && cv.experience.length > 0) {
      strengths.push('Relevant work experience');
    }
    
    return strengths;
  }

  /**
   * Identify improvement areas
   */
  private identifyImprovements(cv: ParsedCV, profile: RoleProfile): string[] {
    const improvements: string[] = [];
    
    if (!cv.personalInfo?.summary) {
      improvements.push('Add professional summary');
    }
    
    if (!cv.achievements || cv.achievements.length === 0) {
      improvements.push('Highlight key achievements');
    }
    
    if (!cv.certifications || cv.certifications.length === 0) {
      improvements.push('Consider relevant certifications');
    }
    
    return improvements;
  }

  /**
   * Generate basic recommendations
   */
  private async generateBasicRecommendations(cv: ParsedCV, profile: RoleProfile): Promise<RoleBasedRecommendation[]> {
    const recommendations: RoleBasedRecommendation[] = [];
    
    // Basic skill recommendation
    if (profile.requiredSkills && profile.requiredSkills.length > 0) {
      recommendations.push({
        id: `skill-rec-${profile.id}`,
        type: 'content',
        priority: 'high',
        title: 'Develop Core Skills',
        description: `Focus on developing skills relevant to ${profile.name}`,
        template: `Add skills: ${profile.requiredSkills.slice(0, 3).join(', ')}`,
        targetSection: 'skills' as CVSection,
        expectedImpact: 0.8
      });
    }
    
    return recommendations;
  }

  /**
   * Identify skill gaps
   */
  private identifySkillGaps(cv: ParsedCV, profile: RoleProfile): string[] {
    if (!profile.requiredSkills) return [];
    
    const cvSkills = cv.skills ? 
      (Array.isArray(cv.skills) 
        ? cv.skills.map(s => s.toLowerCase())
        : Object.values(cv.skills).flat().filter(Boolean).map(s => s.toLowerCase())
      ) : [];
    
    const requiredSkills = profile.requiredSkills.map(s => s.toLowerCase());
    
    return requiredSkills.filter(req => 
      !cvSkills.some(skill => skill.includes(req) || req.includes(skill))
    );
  }

  /**
   * Assess experience relevance
   */
  private assessExperienceRelevance(cv: ParsedCV, profile: RoleProfile): number {
    if (!cv.experience || cv.experience.length === 0) return 0;
    
    let relevanceScore = 0;
    const profileKeywords = profile.name.toLowerCase().split(' ');
    
    for (const exp of cv.experience) {
      const expText = `${exp.position} ${exp.description || ''}`.toLowerCase();
      const matchingKeywords = profileKeywords.filter(keyword => expText.includes(keyword));
      relevanceScore += matchingKeywords.length / profileKeywords.length;
    }
    
    return Math.min(relevanceScore / cv.experience.length, 1.0);
  }

  /**
   * Assess cultural fit (simplified)
   */
  private assessCulturalFit(cv: ParsedCV, profile: RoleProfile): number {
    // Simplified cultural fit assessment
    return 0.7; // Default moderate fit
  }

  /**
   * Analyze career progression
   */
  private analyzeCareerProgression(cv: ParsedCV, profile: RoleProfile): {
    isProgressive: boolean;
    experienceLevel: ExperienceLevel;
    nextSteps: string[];
  } {
    const experienceYears = this.calculateTotalExperience(cv);
    
    return {
      isProgressive: experienceYears > 0,
      experienceLevel: experienceYears >= 5 ? ExperienceLevel.SENIOR : experienceYears >= 2 ? ExperienceLevel.MID : ExperienceLevel.JUNIOR,
      nextSteps: [
        'Continue building relevant experience',
        'Develop leadership skills',
        'Pursue advanced certifications'
      ]
    };
  }

  /**
   * Calculate total years of experience
   */
  private calculateTotalExperience(cv: ParsedCV): number {
    if (!cv.experience) return 0;
    
    let totalYears = 0;
    for (const exp of cv.experience) {
      if (exp.startDate && exp.endDate) {
        const start = new Date(exp.startDate);
        const end = new Date(exp.endDate);
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        totalYears += years;
      }
    }
    
    return totalYears;
  }

  /**
   * Get analyzer configuration
   */
  getConfig(): RoleDetectionConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: RoleDetectionConfig): void {
    this.config = config;
  }
}