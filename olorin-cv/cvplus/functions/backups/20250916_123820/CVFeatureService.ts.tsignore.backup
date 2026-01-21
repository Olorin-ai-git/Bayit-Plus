// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV Feature Service
 *
 * Extracts features specifically from CV content including structural,
 * content quality, and formatting characteristics.
 */

import { ParsedCV } from '../../shared/types';
import { FeatureVector } from '../types/models';

export class CVFeatureService {

  /**
   * Extract comprehensive features from CV structure and content
   */
  async extractFeatures(cv: ParsedCV): Promise<FeatureVector['cvFeatures']> {

    const features = {
      keywordMatch: this.calculateKeywordMatch(cv),
      skillsAlignment: this.calculateSkillsAlignment(cv),
      experienceRelevance: this.calculateExperienceRelevance(cv),
      educationMatch: this.calculateEducationMatch(cv),
      educationLevel: this.getEducationLevel(cv.education)
    };

    return features;
  }

  /**
   * Health check for CV feature service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test feature extraction with minimal CV
      const testCV: ParsedCV = {
        personalInfo: {
          name: 'Test User',
          email: 'test@example.com',
          summary: 'Test summary with some words for testing purposes.'
        },
        experience: [{
          company: 'Test Company',
          position: 'Test Position',
          duration: '3 years',
          startDate: '2020-01',
          endDate: '2023-01',
          description: 'Test experience description'
        }],
        skills: ['JavaScript', 'Python', 'React'],
        education: [{
          institution: 'Test University',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          graduationDate: '2020'
        }]
      };

      const features = await this.extractFeatures(testCV);

      // Verify basic feature extraction worked
      return (features?.keywordMatch || 0) >= 0 &&
             (features?.skillsAlignment || 0) >= 0 &&
             (features?.educationLevel || 0) >= 0;

    } catch (error) {
      return false;
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private calculateWordCount(cv: ParsedCV): number {
    let totalWords = 0;

    // Count words in summary
    if (cv.personalInfo?.summary) {
      totalWords += this.countWordsInText(cv.personalInfo.summary);
    }

    // Count words in experience descriptions
    if (cv.experience && Array.isArray(cv.experience)) {
      cv.experience.forEach(exp => {
        if (exp.description) {
          totalWords += this.countWordsInText(exp.description);
        }
      });
    }

    // Count words in education descriptions
    if (cv.education && Array.isArray(cv.education)) {
      cv.education.forEach(edu => {
        if (edu.description) {
          totalWords += this.countWordsInText(edu.description);
        }
      });
    }

    // Count words in project descriptions
    if (cv.projects && Array.isArray(cv.projects)) {
      cv.projects.forEach(project => {
        if (project.description) {
          totalWords += this.countWordsInText(project.description);
        }
      });
    }

    return totalWords;
  }

  private countWordsInText(text: string): number {
    if (!text || typeof text !== 'string') return 0;

    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  private countCVSections(cv: ParsedCV): number {
    let sectionCount = 0;

    if (cv.personalInfo) sectionCount++;
    if (cv.experience && cv.experience.length > 0) sectionCount++;
    if (cv.skills && this.hasValidSkills(cv.skills)) sectionCount++;
    if (cv.education && cv.education.length > 0) sectionCount++;
    if (cv.projects && cv.projects.length > 0) sectionCount++;
    if (cv.certifications && cv.certifications.length > 0) sectionCount++;
    if ((cv as any).languages && (cv as any).languages.length > 0) sectionCount++;
    if ((cv as any).awards && (cv as any).awards.length > 0) sectionCount++;

    return sectionCount;
  }

  private hasValidSkills(skills: any): boolean {
    if (Array.isArray(skills)) {
      return skills.length > 0;
    } else if (skills && typeof skills === 'object') {
      return (skills.technical && skills.technical.length > 0) ||
             (skills.soft && skills.soft.length > 0) ||
             ((skills as any).languages && (skills as any).languages.length > 0);
    }
    return false;
  }

  private countSkills(skills: any): number {
    if (Array.isArray(skills)) {
      return skills.length;
    } else if (skills && typeof skills === 'object') {
      let count = 0;
      if (skills.technical && Array.isArray(skills.technical)) {
        count += skills.technical.length;
      }
      if (skills.soft && Array.isArray(skills.soft)) {
        count += skills.soft.length;
      }
      if ((skills as any).languages && Array.isArray((skills as any).languages)) {
        count += (skills as any).languages.length;
      }
      return count;
    }
    return 0;
  }

  private calculateTotalExperience(experience?: any[]): number {
    if (!experience || !Array.isArray(experience) || experience.length === 0) {
      return 0;
    }

    let totalMonths = 0;
    const currentDate = new Date();

    experience.forEach(exp => {
      if (exp.startDate) {
        const startDate = this.parseDate(exp.startDate);
        const endDate = exp.endDate && exp.endDate !== 'Present'
          ? this.parseDate(exp.endDate)
          : currentDate;

        if (startDate && endDate) {
          const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                           (endDate.getMonth() - startDate.getMonth());
          totalMonths += Math.max(0, monthsDiff);
        }
      }
    });

    return Math.round(totalMonths / 12 * 10) / 10; // Years with 1 decimal place
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;

    // Handle various date formats
    const formats = [
      /^\d{4}-\d{2}$/, // YYYY-MM
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{4}$/, // MM/YYYY
      /^\d{4}$/ // YYYY
    ];

    for (const format of formats) {
      if (format.test(dateString)) {
        if (dateString.match(/^\d{4}$/)) {
          return new Date(parseInt(dateString), 0, 1); // January 1st of the year
        } else if (dateString.match(/^\d{4}-\d{2}$/)) {
          const [year, month] = dateString.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, 1);
        } else if (dateString.match(/^\d{2}\/\d{4}$/)) {
          const [month, year] = dateString.split('/');
          return new Date(parseInt(year), parseInt(month) - 1, 1);
        } else {
          return new Date(dateString);
        }
      }
    }

    return new Date(dateString); // Fallback to native parsing
  }

  private getEducationLevel(education?: any[]): number {
    if (!education || !Array.isArray(education) || education.length === 0) {
      return 1; // No formal education
    }

    const degrees = education.map(edu => (edu.degree || '').toLowerCase());

    // Check for highest degree level
    if (degrees.some(d => d.includes('phd') || d.includes('doctorate') || d.includes('ph.d'))) {
      return 5; // Doctorate
    }

    if (degrees.some(d => d.includes('master') || d.includes('mba') || d.includes('ms') || d.includes('ma'))) {
      return 4; // Master's
    }

    if (degrees.some(d => d.includes('bachelor') || d.includes('bs') || d.includes('ba') || d.includes('bsc'))) {
      return 3; // Bachelor's
    }

    if (degrees.some(d => d.includes('associate') || d.includes('diploma'))) {
      return 2; // Associate/Diploma
    }

    return 1; // High school or equivalent
  }

  private calculateKeywordMatch(cv: ParsedCV): number {
    // Simple keyword matching score (0-1)
    const skillsCount = this.countSkills(cv.skills);
    return Math.min(skillsCount / 10, 1); // Normalize to 0-1
  }

  private calculateSkillsAlignment(cv: ParsedCV): number {
    // Calculate how well skills align with standard formats
    const skillsCount = this.countSkills(cv.skills);
    return skillsCount > 0 ? Math.min(skillsCount / 15, 1) : 0;
  }

  private calculateExperienceRelevance(cv: ParsedCV): number {
    // Calculate experience relevance score
    const yearsExp = this.calculateTotalExperience(cv.experience);
    return Math.min(yearsExp / 10, 1); // Normalize to 0-1
  }

  private calculateEducationMatch(cv: ParsedCV): number {
    // Calculate education matching score
    const eduLevel = this.getEducationLevel(cv.education);
    return eduLevel / 5; // Normalize to 0-1 (assuming max level is 5)
  }
}