// @ts-ignore - Export conflicts/**
 * Timeline Generation Service - Enhanced with Bulletproof Validation
 * Creates interactive timeline visualization from CV data with comprehensive sanitization
 * 
 * This service now uses a modular architecture with enhanced validation to ensure
 * no undefined values reach Firestore storage.
 */

import { ParsedCV } from '../types/enhanced-models';
import { timelineGenerationServiceV2 } from './timeline-generation-v2.service';

// Re-export types for backward compatibility
export interface TimelineEvent {
  id: string;
  type: 'work' | 'education' | 'achievement' | 'certification';
  title: string;
  organization: string;
  startDate: string; // ISO string for Firestore compatibility
  endDate?: string; // ISO string for Firestore compatibility
  current?: boolean;
  description?: string;
  achievements?: string[];
  skills?: string[];
  location?: string;
  logo?: string;
  impact?: {
    metric: string;
    value: string;
  }[];
}

export interface TimelineData {
  events: TimelineEvent[];
  summary: {
    totalYearsExperience: number;
    companiesWorked: number;
    degreesEarned: number;
    certificationsEarned: number;
    careerHighlights: string[];
  };
  insights: {
    careerProgression: string;
    industryFocus: string[];
    skillEvolution: string;
    nextSteps: string[];
  };
}

export class TimelineGenerationService {
  
  /**
   * Helper function to safely extract technical skills from various skill formats
   */
  private getTechnicalSkills(skills: string[] | { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills; // Assume all are technical if it's an array
    return skills.technical || [];
  }
  
  /**
   * Generate timeline data from parsed CV with bulletproof validation
   * 
   * This method now delegates to the enhanced V2 service which provides:
   * - Comprehensive input validation
   * - Bulletproof sanitization to prevent undefined values
   * - Enhanced error handling and recovery
   * - Modular architecture for maintainability
   * - Detailed logging and quality metrics
   */
  async generateTimeline(parsedCV: ParsedCV, jobId: string): Promise<TimelineData> {
    
    try {
      // Delegate to the enhanced V2 service with storage enabled for direct calls
      const result = await timelineGenerationServiceV2.generateTimeline(parsedCV, jobId, true);
      
      return result;
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Validate timeline data without storing it (for testing and validation)
   */
  async validateTimeline(parsedCV: ParsedCV): Promise<{ isValid: boolean; errors: string[]; data?: TimelineData }> {
    
    try {
      // Validation only, no storage needed
      const result = await timelineGenerationServiceV2.validateTimelineData(parsedCV);
      return result;
      
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        data: undefined
      };
    }
  }
}

// Export singleton instance for backward compatibility
export const timelineGenerationService = new TimelineGenerationService();

// Export the V2 service for advanced usage
export { timelineGenerationServiceV2 } from './timeline-generation-v2.service';