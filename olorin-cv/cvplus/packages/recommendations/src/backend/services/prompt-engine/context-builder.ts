/**
 * Context Builder Module
 *
 * Builds contextual layers for prompt generation from CV data.
 * Extracted from enhanced-prompt-engine.service.ts for better modularity.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

import { ParsedCV } from '../../types/enhanced-models';

export class ContextBuilder {
  /**
   * Builds comprehensive context layer from CV data
    */
  async buildContextLayer(cv: ParsedCV): Promise<string> {
    try {
      const strengthsAnalysis = this.extractKeyStrengths(cv);
      const careerProgression = this.analyzeCareerProgression(cv);
      const technicalExpertise = this.extractTechnicalExpertise(cv);

      return `
CONTEXT LAYER - Professional Profile Analysis:

Key Strengths: ${strengthsAnalysis}

Career Progression: ${careerProgression}

Technical Expertise: ${technicalExpertise}

Professional Summary: ${cv.summary || 'Experienced professional with diverse skill set'}

Industry Focus: ${(cv.personalInfo as any)?.industry || 'General'}

Current Role: ${cv.experience?.[0]?.position || 'Professional'} at ${cv.experience?.[0]?.company || 'Current Organization'}
`.trim();
    } catch (error) {
      return this.generateFallbackContext(cv);
    }
  }

  private extractKeyStrengths(cv: ParsedCV): string {
    const strengths: string[] = [];

    // Extract from professional summary
    if (cv.summary) {
      const summary = cv.summary.toLowerCase();
      const strengthKeywords = [
        'leadership', 'management', 'strategic', 'innovative', 'experienced',
        'expert', 'skilled', 'proficient', 'accomplished', 'successful'
      ];

      strengthKeywords.forEach(keyword => {
        if (summary.includes(keyword)) {
          strengths.push(keyword);
        }
      });
    }

    // Extract from technical skills
    if (Array.isArray(cv.skills) && cv.skills.length > 0) {
      strengths.push(`technical expertise in ${cv.skills.slice(0, 3).join(', ')}`);
    }

    // Extract from work experience achievements
    if (cv.experience && cv.experience.length > 0) {
      const recentAchievements = cv.experience?.[0]?.achievements || [];
      if (recentAchievements.length > 0) {
        strengths.push('proven track record of achievements');
      }
    }

    return strengths.length > 0 ? strengths.slice(0, 5).join(', ') : 'diverse professional experience';
  }

  private analyzeCareerProgression(cv: ParsedCV): string {
    if (!cv.experience || cv.experience.length === 0) {
      return 'Building professional experience';
    }

    const experiences = cv.experience;
    const careerYears = this.calculateTotalExperience(cv);

    if (careerYears < 3) {
      return `Early-career professional with ${careerYears} years of experience, showing rapid growth in ${experiences[0]?.position || 'current role'}`;
    } else if (careerYears < 8) {
      return `Mid-level professional with ${careerYears} years of progressive experience across ${experiences.length} roles`;
    } else if (careerYears < 15) {
      return `Senior professional with ${careerYears} years of leadership experience, advancing from ${experiences[experiences.length - 1]?.position || 'early role'} to ${experiences[0]?.position || 'current role'}`;
    } else {
      return `Executive-level professional with ${careerYears}+ years of comprehensive experience, demonstrating consistent career advancement`;
    }
  }

  private extractTechnicalExpertise(cv: ParsedCV): string {
    const technical: string[] = [];

    // Programming languages
    if (Array.isArray(cv.skills)) {
      const programmingLanguages = cv.skills.filter((skill: string) =>
        ['javascript', 'python', 'java', 'typescript', 'react', 'node', 'angular', 'vue'].some(lang =>
          skill.toLowerCase().includes(lang)
        )
      );
      if (programmingLanguages.length > 0) {
        technical.push(`Programming: ${programmingLanguages.slice(0, 3).join(', ')}`);
      }
    }

    // Frameworks and tools
    // Simplified skills handling for array-based skills
    if (Array.isArray(cv.skills) && cv.skills.length > 3) {
      const toolSkills = cv.skills.filter((skill: string) => 
        skill.toLowerCase().includes('docker') || 
        skill.toLowerCase().includes('kubernetes') ||
        skill.toLowerCase().includes('git') ||
        skill.toLowerCase().includes('aws') ||
        skill.toLowerCase().includes('azure')
      );
      if (toolSkills.length > 0) {
        technical.push(`Tools & Platforms: ${toolSkills.slice(0, 3).join(', ')}`);
      }
    }

    return technical.length > 0 ? technical.join(' | ') : 'Diverse technical skill set';
  }

  private calculateTotalExperience(cv: ParsedCV): number {
    if (!cv.experience) return 0;

    let totalYears = 0;
    for (const exp of cv.experience) {
      if (exp.duration) {
        totalYears += this.parseDurationToYears(exp.duration);
      }
    }
    return totalYears;
  }

  private parseDurationToYears(duration: string): number {
    const lowerDuration = duration.toLowerCase();

    // Extract numbers from duration string
    const numbers = lowerDuration.match(/\d+/g);
    if (!numbers) return 0;

    let years = 0;

    // Handle different formats
    if (lowerDuration.includes('year')) {
      years = parseInt(numbers[0]);
    } else if (lowerDuration.includes('month')) {
      years = parseInt(numbers[0]) / 12;
    } else {
      // Assume format like "2020-2023" or "Jan 2020 - Dec 2022"
      if (numbers.length >= 2) {
        const startYear = parseInt(numbers[0]);
        const endYear = parseInt(numbers[numbers.length - 1] || '0');
        years = endYear - startYear;
      }
    }

    return Math.max(years, 0);
  }

  private generateFallbackContext(cv: ParsedCV): string {
    const name = cv.personalInfo?.name || 'Professional';
    const title = cv.experience?.[0]?.position || 'Experienced Professional';
    const company = cv.experience?.[0]?.company || 'Industry Leader';

    return `
CONTEXT LAYER - Professional Profile:

${name} is an accomplished ${title} at ${company} with a strong track record of delivering results.

Professional Focus: Demonstrated expertise in their field with a commitment to excellence and innovation.

Key Capabilities: Strategic thinking, problem-solving, and leadership across diverse professional environments.

Career Highlights: Consistent professional growth with meaningful contributions to organizational success.
`.trim();
  }
}