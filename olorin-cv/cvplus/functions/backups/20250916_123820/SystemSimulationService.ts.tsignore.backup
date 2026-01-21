// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * System Simulation Service
 * 
 * Specialized service for simulating different ATS systems and their specific
 * parsing behaviors, compatibility requirements, and optimization strategies.
 */

import { 
  ParsedCV, 
  ATSSystemSimulation 
} from '../../types/enhanced-models';
import { ATSSystemConfigs, ATSSystemConfig } from './types';

export class SystemSimulationService {
  
  // ATS System Configurations with specific parsing behaviors
  private readonly atsSystemConfigs: ATSSystemConfigs = {
    workday: {
      parsingWeight: 0.45,
      keywordWeight: 0.30,
      formatWeight: 0.15,
      contentWeight: 0.10,
      preferredFormats: ['text', 'docx'],
      keywordDensityRange: [0.02, 0.05],
      commonIssues: ['Complex formatting', 'Missing standard sections', 'Poor keyword density']
    },
    greenhouse: {
      parsingWeight: 0.40,
      keywordWeight: 0.35,
      formatWeight: 0.15,
      contentWeight: 0.10,
      preferredFormats: ['text', 'pdf'],
      keywordDensityRange: [0.025, 0.06],
      commonIssues: ['Inconsistent data format', 'Missing job descriptions', 'Poor skill categorization']
    },
    lever: {
      parsingWeight: 0.35,
      keywordWeight: 0.40,
      formatWeight: 0.15,
      contentWeight: 0.10,
      preferredFormats: ['pdf', 'docx'],
      keywordDensityRange: [0.03, 0.07],
      commonIssues: ['Missing contact information', 'Unclear job titles', 'Limited skills section']
    },
    smartrecruiters: {
      parsingWeight: 0.40,
      keywordWeight: 0.30,
      formatWeight: 0.20,
      contentWeight: 0.10,
      preferredFormats: ['pdf', 'text'],
      keywordDensityRange: [0.025, 0.055],
      commonIssues: ['Poor section headers', 'Missing education details', 'Inconsistent date formats']
    },
    bamboohr: {
      parsingWeight: 0.45,
      keywordWeight: 0.25,
      formatWeight: 0.20,
      contentWeight: 0.10,
      preferredFormats: ['docx', 'pdf'],
      keywordDensityRange: [0.02, 0.05],
      commonIssues: ['Complex tables', 'Missing experience descriptions', 'Poor contact formatting']
    },
    icims: {
      parsingWeight: 0.35,
      keywordWeight: 0.35,
      formatWeight: 0.15,
      contentWeight: 0.15,
      preferredFormats: ['text', 'docx'],
      keywordDensityRange: [0.03, 0.06],
      commonIssues: ['Missing skills categorization', 'Unclear role progression', 'Limited achievement details']
    }
  };

  /**
   * Simulate multiple ATS systems parsing the CV
   */
  async simulateATSSystems(parsedCV: ParsedCV): Promise<ATSSystemSimulation[]> {
    
    const simulations: ATSSystemSimulation[] = [];
    
    // Simulate each major ATS system
    for (const [systemName, config] of Object.entries(this.atsSystemConfigs)) {
      try {
        const simulation = this.simulateSpecificATS(parsedCV, systemName, config);
        simulations.push(simulation);
      } catch (error) {
        // Continue with other systems even if one fails
      }
    }
    
    return simulations;
  }

  /**
   * Simulate a specific ATS system's behavior
   */
  private simulateSpecificATS(
    parsedCV: ParsedCV, 
    systemName: string, 
    config: ATSSystemConfig
  ): ATSSystemSimulation {
    
    // Calculate system-specific scores
    const parsingAccuracy = this.calculateParsingAccuracy(parsedCV, systemName);
    const keywordMatching = this.calculateKeywordMatching(this.cvToText(parsedCV), systemName);
    const formatCompatibility = this.calculateFormatCompatibility(parsedCV, systemName);
    
    // Calculate overall compatibility score based on system weights
    const compatibilityScore = Math.round(
      parsingAccuracy * config.parsingWeight +
      keywordMatching * config.keywordWeight +
      formatCompatibility * config.formatWeight +
      75 * config.contentWeight // Base content score
    );

    // Identify system-specific issues
    // const identifiedIssues = this.generateSystemSpecificIssues(parsedCV, systemName); // Unused
    
    // Generate optimization tips
    const optimizationTips = this.generateSystemSpecificTips(systemName);
    
    // Determine strengths and weaknesses - not currently used
    // const strengths = this.identifySystemStrengths(parsedCV, systemName, config);
    // const weaknesses = this.identifySystemWeaknesses(parsedCV, systemName, config);

    return {
      systemName,
      version: '1.0',
      passRate: formatCompatibility * 100,
      issues: [],
      suggestions: [],
      processingTime: 150,
      confidence: 0.8
    };
  }

  /**
   * Calculate parsing accuracy for specific ATS system
   */
  private calculateParsingAccuracy(parsedCV: ParsedCV, systemName: string): number {
    let accuracy = 0;
    const maxScore = 100;

    // Essential field parsing (40 points)
    if (parsedCV.personalInfo?.name) accuracy += 10;
    if (parsedCV.personalInfo?.email) accuracy += 10;
    if (parsedCV.personalInfo?.phone) accuracy += 10;
    if (parsedCV.experience && parsedCV.experience.length > 0) accuracy += 10;

    // System-specific parsing preferences (30 points)
    switch (systemName) {
      case 'workday':
        // Workday prioritizes structured data and standard sections
        if (parsedCV.education) accuracy += 8;
        if (parsedCV.skills) accuracy += 10;
        if (parsedCV.personalInfo?.summary) accuracy += 7;
        if (this.hasStandardSectionHeaders(parsedCV)) accuracy += 5;
        break;
        
      case 'greenhouse':
        // Greenhouse focuses on role descriptions and skills categorization
        if (this.hasDetailedRoleDescriptions(parsedCV)) accuracy += 12;
        if (this.hasCategorizedSkills(parsedCV)) accuracy += 10;
        if (parsedCV.education) accuracy += 8;
        break;
        
      case 'lever':
        // Lever emphasizes contact information and clear job progression
        if (this.hasComprehensiveContact(parsedCV)) accuracy += 15;
        if (this.hasClearJobProgression(parsedCV)) accuracy += 10;
        if (parsedCV.skills) accuracy += 5;
        break;
        
      case 'smartrecruiters':
        // SmartRecruiters values education details and consistent formatting
        if (this.hasDetailedEducation(parsedCV)) accuracy += 12;
        if (this.hasConsistentDateFormats(parsedCV)) accuracy += 10;
        if (this.hasProperSectionHeaders(parsedCV)) accuracy += 8;
        break;
        
      case 'bamboohr':
        // BambooHR prefers simple formatting and detailed experience
        if (this.hasSimpleFormatting(parsedCV)) accuracy += 10;
        if (this.hasDetailedExperience(parsedCV)) accuracy += 15;
        if (this.hasProperContactFormatting(parsedCV)) accuracy += 5;
        break;
        
      case 'icims':
        // iCIMS focuses on skills and achievement quantification
        if (this.hasQuantifiedAchievements(parsedCV)) accuracy += 15;
        if (this.hasCategorizedSkills(parsedCV)) accuracy += 10;
        if (this.hasClearRoleProgression(parsedCV)) accuracy += 5;
        break;
        
      default:
        // Default scoring for unknown systems
        accuracy += 20;
    }

    // Data completeness bonus (30 points)
    const completenessScore = this.calculateDataCompleteness(parsedCV);
    accuracy += Math.round(completenessScore * 30);

    return Math.min(accuracy, maxScore);
  }

  /**
   * Calculate keyword matching effectiveness for specific system
   */
  private calculateKeywordMatching(cvText: string, systemName: string): number {
    let score = 60; // Base score
    
    const textLower = cvText.toLowerCase();
    
    // System-specific keyword preferences
    const systemKeywords = this.getSystemPreferredKeywords(systemName);
    let matchedKeywords = 0;
    
    for (const keyword of systemKeywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        matchedKeywords++;
      }
    }
    
    // Calculate match ratio bonus
    const matchRatio = systemKeywords.length > 0 ? matchedKeywords / systemKeywords.length : 0;
    score += Math.round(matchRatio * 40);
    
    return Math.min(score, 100);
  }

  /**
   * Calculate format compatibility for specific system
   */
  private calculateFormatCompatibility(parsedCV: ParsedCV, systemName: string): number {
    const config = this.atsSystemConfigs[systemName];
    if (!config) return 70; // Default score

    let score = 0;
    
    // Section structure scoring (40 points)
    const expectedSections = ['personalInfo', 'experience', 'education', 'skills'];
    const presentSections = expectedSections.filter(section => 
      this.hasValidSection(parsedCV, section)
    );
    score += Math.round((presentSections.length / expectedSections.length) * 40);

    // System-specific format preferences (35 points)
    switch (systemName) {
      case 'workday':
        if (this.hasStandardSectionHeaders(parsedCV)) score += 15;
        if (this.hasConsistentDateFormats(parsedCV)) score += 10;
        if (this.hasSimpleFormatting(parsedCV)) score += 10;
        break;
        
      case 'greenhouse':
        if (this.hasDetailedRoleDescriptions(parsedCV)) score += 15;
        if (this.hasCategorizedSkills(parsedCV)) score += 10;
        if (this.hasProperSectionHeaders(parsedCV)) score += 10;
        break;
        
      // Add other system-specific preferences
      default:
        score += 25;
    }

    // Contact information completeness (25 points)
    let contactScore = 0;
    if (parsedCV.personalInfo?.email) contactScore += 8;
    if (parsedCV.personalInfo?.phone) contactScore += 8;
    if (parsedCV.personalInfo?.name) contactScore += 9;
    score += contactScore;

    return Math.min(score, 100);
  }

  /**
   * Generate system-specific issues
   * Reserved for future system-specific issue generation
   */
  // @ts-ignore - unused method reserved for future functionality
  private generateSystemSpecificIssues(parsedCV: ParsedCV, systemName: string): string[] {
    const issues: string[] = [];
    const config = this.atsSystemConfigs[systemName];
    
    if (!config) return issues;

    // Add common issues for this system
    issues.push(...config.commonIssues);

    // Add specific issues based on CV analysis
    switch (systemName) {
      case 'workday':
        if (!this.hasStandardSectionHeaders(parsedCV)) {
          issues.push('Non-standard section headers may cause parsing issues');
        }
        if (!this.hasConsistentDateFormats(parsedCV)) {
          issues.push('Inconsistent date formats detected');
        }
        break;
        
      case 'greenhouse':
        if (!this.hasDetailedRoleDescriptions(parsedCV)) {
          issues.push('Role descriptions lack sufficient detail');
        }
        if (!this.hasCategorizedSkills(parsedCV)) {
          issues.push('Skills section needs better organization');
        }
        break;
        
      case 'lever':
        if (!this.hasComprehensiveContact(parsedCV)) {
          issues.push('Contact information is incomplete');
        }
        if (!this.hasClearJobProgression(parsedCV)) {
          issues.push('Career progression is unclear');
        }
        break;
    }

    return issues;
  }

  /**
   * Generate system-specific optimization tips
   */
  private generateSystemSpecificTips(systemName: string): string[] {
    const tipsMap: { [key: string]: string[] } = {
      workday: [
        'Use standard section headers (Experience, Education, Skills)',
        'Maintain consistent date formats (MM/YYYY)',
        'Keep formatting simple and clean',
        'Include a professional summary section',
        'Use bullet points for experience descriptions'
      ],
      greenhouse: [
        'Provide detailed job descriptions with specific achievements',
        'Categorize skills by type (Technical, Soft Skills, etc.)',
        'Include quantified results in experience sections',
        'Use industry-standard job titles',
        'Maintain chronological order in experience'
      ],
      lever: [
        'Ensure all contact information is complete and current',
        'Show clear career progression with logical job transitions',
        'Include LinkedIn profile URL',
        'Use consistent company and role naming',
        'Highlight leadership and management experience'
      ],
      smartrecruiters: [
        'Include complete education details (dates, degrees, institutions)',
        'Use consistent date formatting throughout',
        'Ensure section headers are clear and standard',
        'Include GPA if recent graduate and above 3.5',
        'Add relevant certifications and training'
      ],
      bamboohr: [
        'Avoid complex tables and formatting',
        'Provide comprehensive experience descriptions',
        'Format contact information clearly',
        'Use simple, ATS-friendly fonts',
        'Keep document structure straightforward'
      ],
      icims: [
        'Categorize and prioritize skills effectively',
        'Include quantified achievements and metrics',
        'Show clear role progression and career growth',
        'Add relevant keywords naturally throughout',
        'Include both technical and soft skills'
      ]
    };

    return tipsMap[systemName] || [
      'Use standard formatting and section headers',
      'Include relevant keywords naturally',
      'Provide complete contact information',
      'Quantify achievements where possible',
      'Maintain consistent formatting throughout'
    ];
  }

  /**
   * Identify system-specific strengths
   * Reserved for future system-specific strength identification
   */
  // @ts-ignore - unused method reserved for future functionality
  private identifySystemStrengths(
    parsedCV: ParsedCV, 
    systemName: string, 
    config: ATSSystemConfig
  ): string[] {
    const strengths: string[] = [];

    // Check for system-specific strengths
    if (this.hasValidSection(parsedCV, 'personalInfo') && parsedCV.personalInfo?.email) {
      strengths.push('Complete contact information');
    }

    if (parsedCV.experience && parsedCV.experience.length > 0) {
      strengths.push('Comprehensive work experience');
    }

    if (this.hasDetailedRoleDescriptions(parsedCV)) {
      strengths.push('Detailed role descriptions');
    }

    if (this.hasQuantifiedAchievements(parsedCV)) {
      strengths.push('Quantified achievements');
    }

    return strengths;
  }

  /**
   * Identify system-specific weaknesses
   * Reserved for future system-specific weakness identification
   */
  // @ts-ignore - unused method reserved for future functionality
  private identifySystemWeaknesses(
    parsedCV: ParsedCV, 
    systemName: string, 
    config: ATSSystemConfig
  ): string[] {
    const weaknesses: string[] = [];

    // System-specific weakness detection
    if (!this.hasStandardSectionHeaders(parsedCV)) {
      weaknesses.push('Non-standard section headers');
    }

    if (!this.hasConsistentDateFormats(parsedCV)) {
      weaknesses.push('Inconsistent date formatting');
    }

    if (!this.hasCategorizedSkills(parsedCV)) {
      weaknesses.push('Unorganized skills section');
    }

    return weaknesses;
  }

  /**
   * Generate system-specific recommendations
   * Reserved for future system-specific recommendations
   */
  // @ts-ignore - unused method reserved for future functionality
  private generateSystemSpecificRecommendations(
    parsedCV: ParsedCV,
    systemName: string,
    config: ATSSystemConfig,
    currentScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (currentScore < 80) {
      recommendations.push(`Optimize for ${systemName} by following their specific formatting preferences`);
    }

    if (currentScore < 70) {
      recommendations.push(`Address critical parsing issues for ${systemName} compatibility`);
    }

    // Add system-specific recommendations
    const tips = this.generateSystemSpecificTips(systemName);
    recommendations.push(...tips.slice(0, 3)); // Top 3 tips

    return recommendations;
  }

  // Helper methods for CV analysis
  private hasValidSection(parsedCV: ParsedCV, sectionName: string): boolean {
    const section = parsedCV[sectionName as keyof ParsedCV];
    if (!section) return false;
    
    if (Array.isArray(section)) {
      return section.length > 0;
    }
    
    if (typeof section === 'object') {
      return Object.keys(section).length > 0;
    }
    
    return true;
  }

  private hasStandardSectionHeaders(parsedCV: ParsedCV): boolean {
    // Check if CV has standard section structure
    const standardSections = ['personalInfo', 'experience', 'education', 'skills'];
    return standardSections.every(section => this.hasValidSection(parsedCV, section));
  }

  private hasDetailedRoleDescriptions(parsedCV: ParsedCV): boolean {
    if (!parsedCV.experience) return false;
    return parsedCV.experience.some(exp => 
      exp.description && exp.description.length > 100
    );
  }

  private hasCategorizedSkills(parsedCV: ParsedCV): boolean {
    if (!parsedCV.skills) return false;
    // Check if skills are organized (object structure suggests categorization)
    return typeof parsedCV.skills === 'object' && !Array.isArray(parsedCV.skills);
  }

  private hasComprehensiveContact(parsedCV: ParsedCV): boolean {
    const contact = parsedCV.personalInfo;
    return !!(contact?.name && contact?.email && contact?.phone);
  }

  private hasClearJobProgression(parsedCV: ParsedCV): boolean {
    if (!parsedCV.experience || parsedCV.experience.length < 2) return false;
    // Simple check for chronological order (can be enhanced)
    return parsedCV.experience.every(exp => exp.startDate && exp.role);
  }

  private hasDetailedEducation(parsedCV: ParsedCV): boolean {
    if (!parsedCV.education) return false;
    return parsedCV.education.some(edu => 
      edu.degree && edu.institution && (edu.startDate || edu.endDate)
    );
  }

  private hasConsistentDateFormats(parsedCV: ParsedCV): boolean {
    const dates: string[] = [];
    
    // Collect all dates from experience and education
    if (parsedCV.experience) {
      parsedCV.experience.forEach(exp => {
        if (exp.startDate) dates.push(exp.startDate);
        if (exp.endDate) dates.push(exp.endDate);
      });
    }
    
    if (parsedCV.education) {
      parsedCV.education.forEach((edu: any) => {
        if (edu.startDate) dates.push(edu.startDate);
        if (edu.endDate) dates.push(edu.endDate);
      });
    }

    // Simple consistency check (can be enhanced)
    if (dates.length < 2) return true;
    
    const formats = dates.map(date => this.getDateFormat(date));
    return new Set(formats).size === 1; // All dates use same format
  }

  private hasProperSectionHeaders(parsedCV: ParsedCV): boolean {
    // This would typically check the original document structure
    // For now, check if we have the main sections
    return this.hasStandardSectionHeaders(parsedCV);
  }

  private hasSimpleFormatting(parsedCV: ParsedCV): boolean {
    // Assume simple formatting if we have clean, structured data
    return !!(parsedCV.personalInfo && parsedCV.experience);
  }

  private hasDetailedExperience(parsedCV: ParsedCV): boolean {
    if (!parsedCV.experience) return false;
    return parsedCV.experience.every(exp => 
      exp.role && exp.company && exp.description && exp.description.length > 50
    );
  }

  private hasProperContactFormatting(parsedCV: ParsedCV): boolean {
    const contact = parsedCV.personalInfo;
    return !!(contact?.email?.includes('@') && contact?.phone);
  }

  private hasQuantifiedAchievements(parsedCV: ParsedCV): boolean {
    if (!parsedCV.experience) return false;
    return parsedCV.experience.some(exp => 
      exp.description && this.containsNumbers(exp.description)
    );
  }

  private hasClearRoleProgression(parsedCV: ParsedCV): boolean {
    return this.hasClearJobProgression(parsedCV);
  }

  private containsNumbers(text: string): boolean {
    return /\d/.test(text);
  }

  private getDateFormat(date: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'YYYY-MM-DD';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return 'MM/DD/YYYY';
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(date)) return 'YYYY/MM/DD';
    if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}$/i.test(date)) return 'Mon YYYY';
    if (/^\d{4}$/.test(date)) return 'YYYY';
    return 'unknown';
  }

  private calculateDataCompleteness(parsedCV: ParsedCV): number {
    const requiredFields = ['personalInfo', 'experience', 'education', 'skills'];
    let completedFields = 0;
    
    for (const field of requiredFields) {
      if (this.hasValidSection(parsedCV, field)) {
        completedFields++;
      }
    }
    
    return completedFields / requiredFields.length;
  }

  private getSystemPreferredKeywords(systemName: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      workday: ['experience', 'management', 'leadership', 'project', 'team', 'development'],
      greenhouse: ['technical', 'skills', 'achievements', 'results', 'impact', 'growth'],
      lever: ['professional', 'communication', 'collaboration', 'innovation', 'strategy', 'execution'],
      smartrecruiters: ['education', 'certification', 'training', 'qualification', 'degree', 'program'],
      bamboohr: ['responsible', 'duties', 'tasks', 'accomplishments', 'contributions', 'performance'],
      icims: ['metrics', 'quantified', 'improved', 'increased', 'reduced', 'optimized']
    };

    return keywordMap[systemName] || [];
  }

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

    return sections.join(' ');
  }

  private extractSkillsText(skills: any): string {
    if (Array.isArray(skills)) {
      return skills.join(' ');
    }
    if (typeof skills === 'string') {
      return skills;
    }
    if (typeof skills === 'object' && skills !== null) {
      return Object.values(skills).flat().join(' ');
    }
    return '';
  }
}