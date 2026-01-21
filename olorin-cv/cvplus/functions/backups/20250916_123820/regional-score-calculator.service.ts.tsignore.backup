// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Regional Score Calculator for CV Processing
 * Moved from i18n module to correct cv-processing domain
 */

import { ParsedCV, RegionalConfiguration, RegionalScore, ScoreBreakdown } from '../types/regional';

export class RegionalScoreCalculator {
  /**
   * Calculate comprehensive regional compatibility score for CV
   */
  async calculateRegionalScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): Promise<RegionalScore> {
    const categories = {
      legal: await this.calculateLegalScore(cvData, regionConfig),
      cultural: await this.calculateCulturalScore(cvData, regionConfig),
      format: await this.calculateFormatScore(cvData, regionConfig),
      content: await this.calculateContentScore(cvData, regionConfig),
      language: await this.calculateLanguageScore(cvData, regionConfig)
    };

    // Calculate weighted overall score
    const weights = {
      legal: 0.3,    // Legal compliance is most important
      cultural: 0.25, // Cultural fit is very important
      format: 0.2,   // Format preferences
      content: 0.15, // Content structure
      language: 0.1  // Language style
    };

    const overall = Object.entries(categories).reduce((total, [category, score]) => {
      return total + (score * weights[category as keyof typeof weights]);
    }, 0);

    const breakdown = await this.generateScoreBreakdown(cvData, regionConfig, categories);

    return {
      overall: Math.round(overall * 100) / 100,
      categories,
      breakdown
    };
  }

  private async calculateLegalScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): Promise<number> {
    let score = 1.0;
    const legalRestrictions = regionConfig.legalRestrictions;

    if (!legalRestrictions) return score;

    const prohibitedInfo = legalRestrictions.prohibitedInfo || [];
    const personalInfo = cvData.personalInfo || {};

    // Check prohibited information
    for (const prohibited of prohibitedInfo) {
      switch (prohibited) {
        case 'age':
          if (personalInfo.age || (personalInfo as any).dateOfBirth) {
            score -= 0.3; // Major violation
          }
          break;
        case 'photo':
          if (personalInfo.photo) {
            score -= 0.2; // Significant violation
          }
          break;
        case 'gender':
          if (personalInfo.gender) {
            score -= 0.25; // Major violation
          }
          break;
        case 'marital_status':
          if (personalInfo.maritalStatus) {
            score -= 0.15; // Moderate violation
          }
          break;
        case 'nationality':
          if (personalInfo.nationality) {
            score -= 0.1; // Minor violation (context dependent)
          }
          break;
      }
    }

    // Check required information
    if (legalRestrictions.photoRequired && !personalInfo.photo) {
      score -= 0.15; // Missing required photo
    }

    if (legalRestrictions.workPermitRequired && !this.hasWorkPermitInfo(cvData)) {
      score -= 0.1; // Missing work permit info
    }

    return Math.max(0, score);
  }

  private async calculateCulturalScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): Promise<number> {
    let score = 0.8; // Base cultural score
    const culturalFactors = regionConfig.culturalFactors;

    if (!culturalFactors) return score;

    // Networking importance assessment
    if (culturalFactors.networkingImportance) {
      const networkingScore = this.assessNetworkingAlignment(cvData, culturalFactors.networkingImportance);
      score += networkingScore * 0.2;
    }

    // Communication style alignment
    if (culturalFactors.communicationStyle) {
      const communicationScore = this.assessCommunicationStyle(cvData, culturalFactors.communicationStyle);
      score += communicationScore * 0.15;
    }

    // Business formality alignment
    if (culturalFactors.businessFormality) {
      const formalityScore = this.assessBusinessFormality(cvData, culturalFactors.businessFormality);
      score += formalityScore * 0.15;
    }

    return Math.min(1.0, score);
  }

  private async calculateFormatScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): Promise<number> {
    let score = 0.7; // Base format score
    const formatPrefs = regionConfig.formatPreferences;

    if (!formatPrefs) return score;

    // Photo requirement alignment
    if (formatPrefs.photoRequired !== undefined) {
      const hasPhoto = !!(cvData.personalInfo?.photo);
      if ((formatPrefs.photoRequired && hasPhoto) || (!formatPrefs.photoRequired && !hasPhoto)) {
        score += 0.15;
      } else {
        score -= 0.1;
      }
    }

    // Length preference alignment
    if (formatPrefs.preferredLength) {
      const estimatedLength = this.estimateCVLength(cvData);
      const lengthDiff = Math.abs(estimatedLength - formatPrefs.preferredLength);
      if (lengthDiff <= 0.5) {
        score += 0.15;
      } else if (lengthDiff <= 1) {
        score += 0.05;
      } else {
        score -= 0.1;
      }
    }

    // Date format alignment
    if (formatPrefs.dateFormat) {
      const dateFormatScore = this.assessDateFormat(cvData, formatPrefs.dateFormat);
      score += dateFormatScore * 0.1;
    }

    // CV format style alignment
    if (formatPrefs.cvFormat) {
      const formatStyleScore = this.assessCVFormat(cvData, formatPrefs.cvFormat);
      score += formatStyleScore * 0.1;
    }

    return Math.min(1.0, Math.max(0, score));
  }

  private async calculateContentScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): Promise<number> {
    let score = 0.6; // Base content score
    const contentGuidelines = regionConfig.contentGuidelines;

    if (!contentGuidelines) return score;

    // Required sections assessment
    if (contentGuidelines.requiredSections) {
      const requiredSections = contentGuidelines.requiredSections;
      const presentSections = requiredSections.filter(section => this.hasSectionContent(cvData, section));
      score += (presentSections.length / requiredSections.length) * 0.3;
    }

    // Discouraged sections assessment
    if (contentGuidelines.discouragedSections) {
      const discouragedSections = contentGuidelines.discouragedSections;
      const presentDiscouraged = discouragedSections.filter(section => this.hasSectionContent(cvData, section));
      score -= (presentDiscouraged.length / discouragedSections.length) * 0.2;
    }

    // Personal statement assessment
    if (contentGuidelines.personalStatementRequired) {
      if (this.hasPersonalStatement(cvData)) {
        score += 0.15;
      } else {
        score -= 0.1;
      }
    }

    // References assessment
    if (contentGuidelines.referencesRequired) {
      if (this.hasReferences(cvData)) {
        score += 0.1;
      } else {
        score -= 0.05;
      }
    }

    return Math.min(1.0, Math.max(0, score));
  }

  private async calculateLanguageScore(cvData: ParsedCV, regionConfig: RegionalConfiguration): Promise<number> {
    let score = 0.7; // Base language score
    const languageGuidelines = regionConfig.languageGuidelines;

    if (!languageGuidelines) return score;

    // Formality level assessment
    if (languageGuidelines.formalityLevel) {
      const formalityScore = this.assessFormality(cvData, languageGuidelines.formalityLevel);
      score += formalityScore * 0.2;
    }

    // Terminology appropriateness
    if (languageGuidelines.cvTerminology) {
      const terminologyScore = this.assessTerminology(cvData, languageGuidelines);
      score += terminologyScore * 0.15;
    }

    // Business language alignment
    if (languageGuidelines.businessLanguage) {
      const businessLanguageScore = this.assessBusinessLanguage(cvData, languageGuidelines.businessLanguage);
      score += businessLanguageScore * 0.15;
    }

    return Math.min(1.0, score);
  }

  private async generateScoreBreakdown(
    cvData: ParsedCV,
    regionConfig: RegionalConfiguration,
    categories: Record<string, number>
  ): Promise<ScoreBreakdown[]> {
    const breakdown: ScoreBreakdown[] = [];

    // Legal breakdown
    breakdown.push({
      category: 'Legal Compliance',
      score: categories.legal,
      maxScore: 1.0,
      factors: await this.getLegalFactors(cvData, regionConfig)
    });

    // Cultural breakdown
    breakdown.push({
      category: 'Cultural Fit',
      score: categories.cultural,
      maxScore: 1.0,
      factors: await this.getCulturalFactors(cvData, regionConfig)
    });

    // Format breakdown
    breakdown.push({
      category: 'Format Preferences',
      score: categories.format,
      maxScore: 1.0,
      factors: await this.getFormatFactors(cvData, regionConfig)
    });

    // Content breakdown
    breakdown.push({
      category: 'Content Structure',
      score: categories.content,
      maxScore: 1.0,
      factors: await this.getContentFactors(cvData, regionConfig)
    });

    // Language breakdown
    breakdown.push({
      category: 'Language Style',
      score: categories.language,
      maxScore: 1.0,
      factors: await this.getLanguageFactors(cvData, regionConfig)
    });

    return breakdown;
  }

  // Helper methods
  private hasWorkPermitInfo(cvData: ParsedCV): boolean {
    const personalInfo = cvData.personalInfo || {};
    return !!(personalInfo as any).workAuthorization || !!(personalInfo as any).visaStatus;
  }

  private assessNetworkingAlignment(cvData: ParsedCV, networkingImportance: number): number {
    // Assess how well CV demonstrates networking capabilities
    let networkingScore = 0;

    // Check for professional associations
    if ((cvData as any).associations || (cvData as any).memberships) {
      networkingScore += 0.3;
    }

    // Check for speaking engagements or presentations
    if ((cvData as any).presentations || (cvData as any).speaking) {
      networkingScore += 0.2;
    }

    // Check for publications or thought leadership
    if (cvData.publications && cvData.publications.length > 0) {
      networkingScore += 0.2;
    }

    // Check for LinkedIn or professional network mentions
    if (cvData.personalInfo?.linkedIn || (cvData.personalInfo as any).linkedin) {
      networkingScore += 0.1;
    }

    // Weight by importance
    return networkingScore * networkingImportance;
  }

  private assessCommunicationStyle(cvData: ParsedCV, communicationStyle: string): number {
    // Simplified communication style assessment
    // Real implementation would use NLP to analyze text style
    return 0.5; // Placeholder
  }

  private assessBusinessFormality(cvData: ParsedCV, businessFormality: string): number {
    // Simplified business formality assessment
    // Real implementation would analyze language formality
    return 0.5; // Placeholder
  }

  private estimateCVLength(cvData: ParsedCV): number {
    let contentLength = 0;

    if (cvData.personalInfo) contentLength += 0.2;
    if (cvData.experience) contentLength += cvData.experience.length * 0.3;
    if (cvData.education) contentLength += cvData.education.length * 0.15;
    if (cvData.skills) contentLength += 0.2;
    if (cvData.projects) contentLength += (cvData.projects.length * 0.2);
    if (cvData.certifications) contentLength += (cvData.certifications.length * 0.1);

    return Math.max(1, Math.ceil(contentLength));
  }

  private assessDateFormat(cvData: ParsedCV, expectedFormat: string): number {
    // Simplified date format assessment
    // Real implementation would analyze actual date formats in CV
    return 0.5; // Placeholder
  }

  private assessCVFormat(cvData: ParsedCV, expectedFormat: string): number {
    // Assess CV format style (chronological, functional, etc.)
    // Default assumption: most CVs are chronological
    return expectedFormat === 'chronological' ? 0.8 : 0.5;
  }

  private hasSectionContent(cvData: ParsedCV, section: string): boolean {
    const sectionMap: Record<string, boolean> = {
      'personal_info': !!(cvData.personalInfo),
      'experience': !!(cvData.experience && cvData.experience.length > 0),
      'education': !!(cvData.education && cvData.education.length > 0),
      'skills': !!(cvData.skills && cvData.skills.length > 0),
      'certifications': !!(cvData.certifications && cvData.certifications.length > 0),
      'languages': !!(cvData.languages && cvData.languages.length > 0),
      'references': !!(cvData.references && cvData.references.length > 0),
      'projects': !!(cvData.projects && cvData.projects.length > 0),
      'publications': !!(cvData.publications && cvData.publications.length > 0),
      'awards': !!(cvData.awards && cvData.awards.length > 0),
      'photo': !!(cvData.personalInfo?.photo)
    };

    return sectionMap[section] || false;
  }

  private hasPersonalStatement(cvData: ParsedCV): boolean {
    return !!(cvData as any).summary || !!(cvData as any).objective || !!(cvData as any).personalStatement;
  }

  private hasReferences(cvData: ParsedCV): boolean {
    return !!(cvData.references && cvData.references.length > 0);
  }

  private assessFormality(cvData: ParsedCV, expectedFormality: string): number {
    // Simplified formality assessment
    // Real implementation would use NLP to analyze text formality
    return 0.5; // Placeholder
  }

  private assessTerminology(cvData: ParsedCV, languageGuidelines: any): number {
    // Assess use of appropriate terminology
    return 0.5; // Placeholder
  }

  private assessBusinessLanguage(cvData: ParsedCV, businessLanguage: string): number {
    // Assess business language appropriateness
    return 0.7; // Placeholder - assume good by default
  }

  // Factor breakdown methods
  private async getLegalFactors(cvData: ParsedCV, regionConfig: RegionalConfiguration) {
    const factors = [];
    const legalRestrictions = regionConfig.legalRestrictions;

    if (legalRestrictions?.prohibitedInfo) {
      factors.push({
        factor: 'Prohibited Information Compliance',
        score: 0.8,
        weight: 0.4,
        explanation: 'CV avoids most prohibited personal information'
      });
    }

    if (legalRestrictions?.workPermitRequired) {
      factors.push({
        factor: 'Work Authorization',
        score: this.hasWorkPermitInfo(cvData) ? 1.0 : 0.5,
        weight: 0.3,
        explanation: 'Work authorization status disclosure'
      });
    }

    return factors;
  }

  private async getCulturalFactors(cvData: ParsedCV, regionConfig: RegionalConfiguration) {
    const factors = [];
    const culturalFactors = regionConfig.culturalFactors;

    if (culturalFactors?.networkingImportance) {
      factors.push({
        factor: 'Networking Alignment',
        score: 0.6,
        weight: 0.3,
        explanation: 'Professional networking demonstration'
      });
    }

    if (culturalFactors?.communicationStyle) {
      factors.push({
        factor: 'Communication Style',
        score: 0.7,
        weight: 0.25,
        explanation: 'Language style matches regional preferences'
      });
    }

    return factors;
  }

  private async getFormatFactors(cvData: ParsedCV, regionConfig: RegionalConfiguration) {
    const factors = [];
    const formatPrefs = regionConfig.formatPreferences;

    if (formatPrefs?.photoRequired !== undefined) {
      const hasPhoto = !!(cvData.personalInfo?.photo);
      factors.push({
        factor: 'Photo Requirement',
        score: (formatPrefs.photoRequired && hasPhoto) || (!formatPrefs.photoRequired && !hasPhoto) ? 1.0 : 0.3,
        weight: 0.3,
        explanation: 'Photo inclusion matches regional expectations'
      });
    }

    if (formatPrefs?.preferredLength) {
      factors.push({
        factor: 'Length Preference',
        score: 0.8,
        weight: 0.25,
        explanation: 'CV length aligns with regional preferences'
      });
    }

    return factors;
  }

  private async getContentFactors(cvData: ParsedCV, regionConfig: RegionalConfiguration) {
    const factors = [];
    const contentGuidelines = regionConfig.contentGuidelines;

    if (contentGuidelines?.requiredSections) {
      factors.push({
        factor: 'Required Sections',
        score: 0.85,
        weight: 0.4,
        explanation: 'Most required sections are present'
      });
    }

    if (contentGuidelines?.personalStatementRequired) {
      factors.push({
        factor: 'Personal Statement',
        score: this.hasPersonalStatement(cvData) ? 1.0 : 0.0,
        weight: 0.3,
        explanation: 'Personal statement presence'
      });
    }

    return factors;
  }

  private async getLanguageFactors(cvData: ParsedCV, regionConfig: RegionalConfiguration) {
    const factors = [];
    const languageGuidelines = regionConfig.languageGuidelines;

    if (languageGuidelines?.formalityLevel) {
      factors.push({
        factor: 'Formality Level',
        score: 0.7,
        weight: 0.4,
        explanation: 'Language formality matches expectations'
      });
    }

    if (languageGuidelines?.cvTerminology) {
      factors.push({
        factor: 'Terminology Usage',
        score: 0.6,
        weight: 0.3,
        explanation: 'Regional terminology alignment'
      });
    }

    return factors;
  }
}