// @ts-ignore - Export conflicts/**
 * Timeline Utilities Service
 * Main orchestrator for timeline utility functions
 */

import { ParsedCV } from '../../../types/enhanced-models';
import { TimelineEvent, TimelineData } from '../types/timeline.types';
import { timelineUtilsCoreService } from './timeline-utils-core.service';

export class TimelineUtilsService {
  
  /**
   * Parse date string to Date object with comprehensive error handling
   */
  parseDate(dateStr: string): Date {
    return timelineUtilsCoreService.parseDate(dateStr);
  }
  
  /**
   * Check if date represents recent/current position
   */
  isRecent(dateStr: string): boolean {
    return timelineUtilsCoreService.isRecent(dateStr);
  }
  
  /**
   * Estimate education start date
   */
  estimateEducationStartDate(edu: any): Date {
    return timelineUtilsCoreService.estimateEducationStartDate(edu);
  }
  
  /**
   * Extract impact metrics from achievements
   */
  extractImpactMetrics(achievements: string[]): { metric: string; value: string }[] {
    return timelineUtilsCoreService.extractImpactMetrics(achievements);
  }
  
  /**
   * Extract achievement title
   */
  extractAchievementTitle(achievement: string): string {
    return timelineUtilsCoreService.extractAchievementTitle(achievement);
  }
  
  /**
   * Extract organization from achievement
   */
  extractAchievementOrg(achievement: string, cv: ParsedCV): string {
    if (!achievement || typeof achievement !== 'string') return 'Achievement';
    
    try {
      // Check if any company names are mentioned
      if (cv.experience && Array.isArray(cv.experience)) {
        for (const exp of cv.experience) {
          if (exp?.company && achievement.toLowerCase().includes(exp.company.toLowerCase())) {
            return exp.company;
          }
        }
      }
      
      // Look for organization patterns
      const patterns = [
        /(?:at|from|by)\s+([A-Z][A-Za-z\s&]+)/,
        /([A-Z][A-Za-z\s&]+)\s+(?:Award|Prize|Recognition)/
      ];
      
      for (const pattern of patterns) {
        const match = achievement.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      return 'Achievement';
    } catch {
      return 'Achievement';
    }
  }
  
  /**
   * Generate summary data
   */
  generateSummary(events: TimelineEvent[], cv: ParsedCV): TimelineData['summary'] {
    try {
      const workEvents = events.filter(e => e?.type === 'work');
      const eduEvents = events.filter(e => e?.type === 'education');
      const certEvents = events.filter(e => e?.type === 'certification');
      
      // Calculate experience
      let totalMonths = 0;
      for (const event of workEvents) {
        try {
          const start = new Date(event.startDate);
          const end = event.endDate ? new Date(event.endDate) : new Date();
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          if (months >= 0 && months <= 600) totalMonths += months;
        } catch {
          continue;
        }
      }
      
      const totalYears = Math.round(totalMonths / 12 * 10) / 10;
      
      // Generate highlights
      const highlights: string[] = [];
      const currentRole = workEvents.find(e => e?.current);
      if (currentRole?.title && currentRole?.organization) {
        highlights.push(`Currently ${currentRole.title} at ${currentRole.organization}`);
      }
      
      if (cv.achievements && Array.isArray(cv.achievements)) {
        highlights.push(...cv.achievements.slice(0, 2).filter(a => a && typeof a === 'string'));
      }
      
      return {
        totalYearsExperience: Math.max(0, totalYears),
        companiesWorked: new Set(workEvents.map(e => e.organization).filter(Boolean)).size,
        degreesEarned: eduEvents.length,
        certificationsEarned: certEvents.length,
        careerHighlights: highlights.slice(0, 5)
      };
    } catch {
      return {
        totalYearsExperience: 0,
        companiesWorked: 0,
        degreesEarned: 0,
        certificationsEarned: 0,
        careerHighlights: []
      };
    }
  }
}

export const timelineUtilsService = new TimelineUtilsService();