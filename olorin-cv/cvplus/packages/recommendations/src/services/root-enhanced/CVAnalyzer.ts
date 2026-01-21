import { db } from '@cvplus/core';
import { JobMatch } from '../../types/job';
import { Recommendation } from '../../types';
import { ParsedCV } from './compatibility';

/**
 * CVAnalyzer - Handles CV analysis and validation logic
 * Responsible for analyzing CV structure, content quality, and identifying improvement areas
  */
export class CVAnalyzer {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    this.db = db;
  }

  /**
   * Gets database instance for external operations
    */
  getDatabase(): FirebaseFirestore.Firestore {
    return this.db;
  }

  /**
   * Analyzes CV for missing or weak sections
    */
  analyzeCVStructure(cv: ParsedCV): {
    missingTitle: boolean;
    missingContact: boolean;
    missingAchievements: boolean;
    missingCertifications: boolean;
    missingLanguages: boolean;
    missingProjects: boolean;
    hasVolunteerExperience: boolean;
    weakSummary: boolean;
    skillsStructure: 'missing' | 'array' | 'organized';
  } {
    const analysis = {
      missingTitle: !cv.personalInfo?.title || cv.personalInfo.title.length < 5,
      missingContact: !cv.personalInfo?.email || !cv.personalInfo?.phone,
      missingAchievements: !cv.achievements || cv.achievements.length === 0,
      missingCertifications: !cv.certifications || cv.certifications.length === 0,
      missingLanguages: !cv.languages || cv.languages.length === 0,
      missingProjects: !cv.projects || cv.projects.length === 0,
      hasVolunteerExperience: (cv as any).volunteerExperience && (cv as any).volunteerExperience.length > 0,
      weakSummary: !cv.summary || cv.summary.length < 50,
      skillsStructure: this.analyzeSkillsStructure(cv)
    };

    logger.info('📊 CV Structure Analysis:', analysis);
    return analysis;
  }

  /**
   * Analyzes skills organization structure
    */
  private analyzeSkillsStructure(cv: ParsedCV): 'missing' | 'array' | 'organized' {
    if (!cv.skills) return 'missing';
    if (Array.isArray(cv.skills)) return 'array';
    if (typeof cv.skills === 'object') return 'organized';
    return 'missing';
  }

  /**
   * Validates job document access and retrieves CV data
    */
  async validateJobAccess(jobId: string, userId: string): Promise<{
    jobData: any;
    originalCV: ParsedCV;
    existingRecommendations: Recommendation[];
  }> {
    const jobDoc = await this.db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new Error('Job not found');
    }

    const jobData = jobDoc.data();
    if (jobData?.userId !== userId) {
      throw new Error('Unauthorized access to job');
    }

    const originalCV: ParsedCV = jobData?.parsedData;
    if (!originalCV) {
      throw new Error('No parsed CV found for this job');
    }

    return {
      jobData,
      originalCV,
      existingRecommendations: jobData?.cvRecommendations || []
    };
  }

  /**
   * Checks if recommendations are recent and valid
    */
  areRecommendationsRecent(lastGeneration?: string): boolean {
    if (!lastGeneration) return false;
    
    const daysSinceGeneration = (new Date().getTime() - new Date(lastGeneration).getTime()) / (24 * 60 * 60 * 1000);
    return daysSinceGeneration < 1; // 24 hours
  }

  /**
   * Validates selected recommendations exist in stored recommendations
    */
  validateSelectedRecommendations(
    selectedRecommendationIds: string[],
    storedRecommendations: Recommendation[]
  ): Recommendation[] {
    if (!Array.isArray(selectedRecommendationIds)) {
      throw new Error('Selected recommendation IDs array is required');
    }

    const selectedRecommendations = storedRecommendations.filter(rec => 
      selectedRecommendationIds.includes(rec.id)
    );

    if (selectedRecommendations.length === 0) {
      throw new Error('No valid recommendations found for the selected IDs');
    }

    return selectedRecommendations;
  }

  /**
   * Validates recommendation quality and completeness
    */
  validateRecommendationQuality(recommendations: Recommendation[]): Recommendation[] {
    return recommendations.map(rec => {
      // Ensure all required fields are present with fallback values
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
   * Sanitizes recommendations for Firestore storage
    */
  sanitizeRecommendationsForStorage(recommendations: Recommendation[]): Recommendation[] {
    return recommendations.map((rec: any) => {
      const sanitizedRec = { ...rec };
      
      if (rec.placeholders) {
        sanitizedRec.placeholders = rec.placeholders.map((placeholder: any) => {
          const sanitizedPlaceholder = { ...placeholder };
          
          // Remove validation RegExp or convert to string
          if (placeholder.validation) {
            if (placeholder.validation instanceof RegExp) {
              sanitizedPlaceholder.validation = placeholder.validation.toString();
            }
          } else {
            delete sanitizedPlaceholder.validation;
          }
          
          return sanitizedPlaceholder;
        });
      }
      
      return sanitizedRec;
    });
  }
}