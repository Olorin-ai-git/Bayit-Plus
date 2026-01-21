// @ts-ignore - Export conflicts/**
 * Timeline Processor Service - Main Orchestrator
 * Coordinates CV data processing and analysis with modular components
 */

import { ParsedCV } from '../../../types/enhanced-models';
import { TimelineEvent, TimelineData } from '../types/timeline.types';
import { timelineProcessorCoreService } from './timeline-processor-core.service';
import { timelineProcessorInsightsService } from './timeline-processor-insights.service';
import { timelineUtilsService } from './timeline-utils.service';

export class TimelineProcessorService {
  
  /**
   * Helper function to safely extract technical skills from various skill formats
   */
  private getTechnicalSkills(skills: string[] | { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills; // Assume all are technical if it's an array
    return skills.technical || [];
  }
  
  /**
   * Process CV data into timeline events with comprehensive error handling
   */
  async processCV(parsedCV: ParsedCV): Promise<TimelineEvent[]> {
    
    try {
      const events = await timelineProcessorCoreService.processCV(parsedCV);
      return events;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate summary data from events and CV
   */
  generateSummary(events: TimelineEvent[], cv: ParsedCV): TimelineData['summary'] {
    
    try {
      const summary = timelineUtilsService.generateSummary(events, cv);
      return summary;
    } catch (error) {
      return {
        totalYearsExperience: 0,
        companiesWorked: 0,
        degreesEarned: 0,
        certificationsEarned: 0,
        careerHighlights: []
      };
    }
  }
  
  /**
   * Generate career insights from events and CV
   */
  async generateInsights(events: TimelineEvent[], cv: ParsedCV): Promise<TimelineData['insights']> {
    
    try {
      const insights = await timelineProcessorInsightsService.generateInsights(events, cv);
      return insights;
    } catch (error) {
      return {
        careerProgression: 'Career progression analysis not available',
        industryFocus: [],
        skillEvolution: 'Skill evolution analysis not available',
        nextSteps: []
      };
    }
  }
}

export const timelineProcessorService = new TimelineProcessorService();