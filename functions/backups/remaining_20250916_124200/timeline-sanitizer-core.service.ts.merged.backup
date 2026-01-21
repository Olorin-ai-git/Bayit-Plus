// @ts-ignore - Export conflicts/**
 * Timeline Sanitizer Core Service
 * Core sanitization functionality for timeline data
 */

import { TimelineEvent } from '../types/timeline.types';
import { timelineValidatorService, DataQualityMetrics } from './timeline-validator.service';

export class TimelineSanitizerCoreService {
  
  /**
   * Sanitize individual timeline event with comprehensive validation
   */
  sanitizeTimelineEvent(event: TimelineEvent, index: number, metrics: DataQualityMetrics): any | null {
    try {
      
      // Validate required fields first
      const requiredFields = ['id', 'type', 'title', 'organization', 'startDate'];
      for (const field of requiredFields) {
        if (!timelineValidatorService.validateField(field, (event as any)[field], metrics)) {
          return null;
        }
      }
      
      // Start with validated required fields
      const cleanEvent: any = {
        id: event.id.trim(),
        type: event.type,
        title: event.title.trim() || 'Untitled',
        organization: event.organization.trim() || 'Unknown',
        startDate: event.startDate
      };
      
      // Process optional fields with comprehensive validation
      this.processOptionalField('endDate', event.endDate, cleanEvent, metrics);
      this.processOptionalField('current', event.current, cleanEvent, metrics);
      this.processOptionalField('description', event.description, cleanEvent, metrics);
      this.processOptionalField('location', event.location, cleanEvent, metrics);
      this.processOptionalField('logo', event.logo, cleanEvent, metrics);
      
      // Process array fields with deep sanitization
      this.processArrayField('achievements', event.achievements, cleanEvent, metrics);
      this.processArrayField('skills', event.skills, cleanEvent, metrics);
      this.processArrayField('impact', event.impact, cleanEvent, metrics);
      
      return cleanEvent;
      
    } catch (error) {
      metrics.validationErrors++;
      return null;
    }
  }
  
  /**
   * Process optional field with validation and error handling
   */
  private processOptionalField(fieldName: string, value: any, cleanEvent: any, metrics: DataQualityMetrics): void {
    try {
      if (value === undefined || value === null) {
        return; // Skip undefined/null optional fields
      }
      
      if (timelineValidatorService.validateField(fieldName, value, metrics)) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.length > 0) {
            cleanEvent[fieldName] = trimmed;
          } else {
            (metrics.fieldsRemoved as any)[fieldName]++;
          }
        } else {
          cleanEvent[fieldName] = value;
        }
      } else {
        (metrics.fieldsRemoved as any)[fieldName]++;
      }
    } catch (error) {
      (metrics.fieldsRemoved as any)[fieldName]++;
    }
  }
  
  /**
   * Process array field with deep sanitization
   */
  private processArrayField(fieldName: string, value: any, cleanEvent: any, metrics: DataQualityMetrics): void {
    try {
      if (value === undefined || value === null) {
        return; // Skip undefined/null array fields
      }
      
      const sanitizedArray = timelineValidatorService.sanitizeArray(value, fieldName, metrics);
      if (sanitizedArray && sanitizedArray.length > 0) {
        cleanEvent[fieldName] = sanitizedArray;
      }
    } catch (error) {
      (metrics.fieldsRemoved as any)[fieldName]++;
    }
  }
  
  /**
   * Recursively clean an object by removing undefined values with comprehensive validation
   */
  removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item))
                .filter(item => item !== undefined && item !== null);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          const cleanedValue = this.removeUndefinedValues(value);
          if (cleanedValue !== undefined && cleanedValue !== null) {
            // Additional validation for string fields
            if (typeof cleanedValue === 'string' && cleanedValue.trim().length === 0) {
              continue; // Skip empty strings
            }
            // Additional validation for arrays
            if (Array.isArray(cleanedValue) && cleanedValue.length === 0) {
              continue; // Skip empty arrays
            }
            cleaned[key] = cleanedValue;
          }
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : null;
    }
    
    return obj;
  }
  
  /**
   * Get minimal safe structure for catastrophic failure recovery
   */
  getMinimalSafeStructure(events: TimelineEvent[]): any {
    return {
      events: events.map((event, index) => ({
        id: event.id || `fallback-${index}`,
        type: event.type || 'work',
        title: typeof event.title === 'string' ? event.title.trim() : 'Untitled',
        organization: typeof event.organization === 'string' ? event.organization.trim() : 'Unknown',
        startDate: event.startDate || new Date().toISOString()
      })),
      summary: this.getDefaultSummary(),
      insights: this.getDefaultInsights()
    };
  }
  
  /**
   * Get default summary structure for fallback
   */
  getDefaultSummary(): any {
    return {
      totalYearsExperience: 0,
      companiesWorked: 0,
      degreesEarned: 0,
      certificationsEarned: 0,
      careerHighlights: []
    };
  }
  
  /**
   * Get default insights structure for fallback
   */
  getDefaultInsights(): any {
    return {
      careerProgression: 'Career progression analysis not available',
      industryFocus: [],
      skillEvolution: 'Skill evolution analysis not available',
      nextSteps: []
    };
  }
}

export const timelineSanitizerCoreService = new TimelineSanitizerCoreService();