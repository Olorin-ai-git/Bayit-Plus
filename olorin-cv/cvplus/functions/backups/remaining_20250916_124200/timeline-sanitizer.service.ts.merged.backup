// @ts-ignore - Export conflicts/**
 * Timeline Data Sanitizer Service
 * Handles deep cleaning and sanitization of timeline data for Firestore storage
 */

import { TimelineData } from '../types/timeline.types';
import { timelineValidatorService, DataQualityMetrics } from './timeline-validator.service';
import { timelineSanitizerCoreService } from './timeline-sanitizer-core.service';

export class TimelineSanitizerService {
  
  /**
   * Enhanced timeline data cleaning with comprehensive validation and sanitization
   */
  cleanTimelineData(timelineData: TimelineData): any {
    const startTime = Date.now();
    
    // Initialize quality metrics
    const qualityMetrics: DataQualityMetrics = {
      totalEvents: timelineData.events.length,
      cleanedEvents: 0,
      validationErrors: 0,
      fieldsRemoved: {
        location: 0,
        description: 0,
        achievements: 0,
        skills: 0,
        logo: 0,
        impact: 0,
        endDate: 0,
        current: 0
      },
      processingTime: 0
    };
    
    try {
      // Clean events with comprehensive validation
      const cleanEvents = timelineData.events
        .map((event, index) => timelineSanitizerCoreService.sanitizeTimelineEvent(event, index, qualityMetrics))
        .filter(event => event !== null);
      
      qualityMetrics.cleanedEvents = cleanEvents.length;
      
      // Clean summary with error handling
      let cleanSummary;
      try {
        cleanSummary = this.sanitizeSummaryData(timelineData.summary, qualityMetrics);
      } catch (error) {
        cleanSummary = timelineSanitizerCoreService.getDefaultSummary();
        qualityMetrics.validationErrors++;
      }
      
      // Clean insights with error handling
      let cleanInsights;
      try {
        cleanInsights = this.sanitizeInsightsData(timelineData.insights, qualityMetrics);
      } catch (error) {
        cleanInsights = timelineSanitizerCoreService.getDefaultInsights();
        qualityMetrics.validationErrors++;
      }
      
      const result = {
        events: cleanEvents,
        summary: cleanSummary,
        insights: cleanInsights
      };
      
      // Apply final deep cleaning to ensure no undefined values remain
      const finalResult = timelineSanitizerCoreService.removeUndefinedValues(result);
      
      // Calculate processing time and log metrics
      qualityMetrics.processingTime = Date.now() - startTime;
      timelineValidatorService.logDataQualityMetrics(qualityMetrics);
      
      return finalResult;
      
    } catch (error) {
      qualityMetrics.processingTime = Date.now() - startTime;
      qualityMetrics.validationErrors++;
      timelineValidatorService.logDataQualityMetrics(qualityMetrics);
      
      // Return minimal safe structure on catastrophic failure
      return timelineSanitizerCoreService.getMinimalSafeStructure(timelineData.events.length > 0 ? [timelineData.events[0]] : []);
    }
  }
  
  /**
   * Sanitize summary data with validation
   */
  private sanitizeSummaryData(summary: any, metrics: DataQualityMetrics): any {
    try {
      const cleanSummary = {
        totalYearsExperience: typeof summary.totalYearsExperience === 'number' ? summary.totalYearsExperience : 0,
        companiesWorked: typeof summary.companiesWorked === 'number' ? summary.companiesWorked : 0,
        degreesEarned: typeof summary.degreesEarned === 'number' ? summary.degreesEarned : 0,
        certificationsEarned: typeof summary.certificationsEarned === 'number' ? summary.certificationsEarned : 0,
        careerHighlights: timelineValidatorService.sanitizeArray(summary.careerHighlights || [], 'careerHighlights', metrics) || []
      };
      
      return timelineSanitizerCoreService.removeUndefinedValues(cleanSummary);
    } catch (error) {
      return timelineSanitizerCoreService.getDefaultSummary();
    }
  }
  
  /**
   * Sanitize insights data with validation
   */
  private sanitizeInsightsData(insights: any, metrics: DataQualityMetrics): any {
    try {
      const cleanInsights = {
        careerProgression: typeof insights.careerProgression === 'string' && insights.careerProgression.trim().length > 0 
          ? insights.careerProgression.trim() 
          : 'Career progression data not available',
        industryFocus: timelineValidatorService.sanitizeArray(insights.industryFocus || [], 'industryFocus', metrics) || [],
        skillEvolution: typeof insights.skillEvolution === 'string' && insights.skillEvolution.trim().length > 0 
          ? insights.skillEvolution.trim() 
          : 'Skill evolution data not available',
        nextSteps: timelineValidatorService.sanitizeArray(insights.nextSteps || [], 'nextSteps', metrics) || []
      };
      
      return timelineSanitizerCoreService.removeUndefinedValues(cleanInsights);
    } catch (error) {
      return timelineSanitizerCoreService.getDefaultInsights();
    }
  }
}

export const timelineSanitizerService = new TimelineSanitizerService();