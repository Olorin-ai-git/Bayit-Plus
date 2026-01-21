// @ts-ignore - Export conflicts/**
 * Timeline Processor Events Service
 * Handles individual event processing for different CV data types
 */

import { ParsedCV } from '../../../types/enhanced-models';
import { TimelineEvent } from '../types/timeline.types';
import { timelineUtilsService } from './timeline-utils.service';

export class TimelineProcessorEventsService {
  
  /**
   * Process work experience into timeline event
   */
  processWorkExperience(exp: any, eventIndex: number): TimelineEvent | null {
    if (!exp || !exp.position || !exp.company || !exp.startDate) {
      return null;
    }
    
    const workEvent: TimelineEvent = {
      id: `work-${eventIndex}`,
      type: 'work',
      title: exp.position,
      organization: exp.company,
      startDate: timelineUtilsService.parseDate(exp.startDate).toISOString()
    };
    
    // Add optional fields with validation
    if (exp.endDate && typeof exp.endDate === 'string' && exp.endDate.trim().length > 0) {
      workEvent.endDate = timelineUtilsService.parseDate(exp.endDate).toISOString();
    }
    
    if ((exp as any).current === true || (!exp.endDate && timelineUtilsService.isRecent(exp.startDate))) {
      workEvent.current = true;
    }
    
    if (exp.description && typeof exp.description === 'string' && exp.description.trim().length > 0) {
      workEvent.description = exp.description.trim();
    }
    
    if (exp.achievements && Array.isArray(exp.achievements)) {
      const validAchievements = exp.achievements.filter(a => 
        a && typeof a === 'string' && a.trim().length > 0
      );
      if (validAchievements.length > 0) {
        workEvent.achievements = validAchievements;
      }
    }
    
    if (exp.technologies && Array.isArray(exp.technologies)) {
      const validTechnologies = exp.technologies.filter(t => 
        t && typeof t === 'string' && t.trim().length > 0
      );
      if (validTechnologies.length > 0) {
        workEvent.skills = validTechnologies;
      }
    }
    
    if ((exp as any).location && typeof (exp as any).location === 'string' && (exp as any).location.trim().length > 0) {
      workEvent.location = (exp as any).location.trim();
    }
    
    // Extract impact metrics
    const impactMetrics = timelineUtilsService.extractImpactMetrics(exp.achievements || []);
    if (impactMetrics.length > 0) {
      workEvent.impact = impactMetrics;
    }
    
    return workEvent;
  }
  
  /**
   * Process education into timeline event
   */
  processEducation(edu: any, eventIndex: number): TimelineEvent | null {
    if (!edu || !edu.degree || !edu.field || !edu.institution) {
      return null;
    }
    
    const eduEvent: TimelineEvent = {
      id: `edu-${eventIndex}`,
      type: 'education',
      title: `${edu.degree} in ${edu.field}`,
      organization: edu.institution,
      startDate: ((edu as any).startDate ? timelineUtilsService.parseDate((edu as any).startDate) : timelineUtilsService.estimateEducationStartDate(edu)).toISOString()
    };
    
    // Add optional fields with validation
    if ((edu as any).endDate && typeof (edu as any).endDate === 'string' && (edu as any).endDate.trim().length > 0) {
      eduEvent.endDate = timelineUtilsService.parseDate((edu as any).endDate).toISOString();
    }
    
    if ((edu as any).location && typeof (edu as any).location === 'string' && (edu as any).location.trim().length > 0) {
      eduEvent.location = (edu as any).location.trim();
    }
    
    if ((edu as any).achievements && Array.isArray((edu as any).achievements)) {
      const validAchievements = (edu as any).achievements.filter((a: any) => 
        a && typeof a === 'string' && a.trim().length > 0
      );
      if (validAchievements.length > 0) {
        eduEvent.achievements = validAchievements;
      }
    }
    
    if (edu.gpa && typeof edu.gpa === 'string' && edu.gpa.trim().length > 0) {
      eduEvent.description = `GPA: ${edu.gpa.trim()}`;
    }
    
    return eduEvent;
  }
  
  /**
   * Process certification into timeline event
   */
  processCertification(cert: any, eventIndex: number): TimelineEvent | null {
    if (!cert || !cert.name || !cert.issuer) {
      return null;
    }
    
    const certEvent: TimelineEvent = {
      id: `cert-${eventIndex}`,
      type: 'certification',
      title: cert.name,
      organization: cert.issuer,
      startDate: (cert.date ? timelineUtilsService.parseDate(cert.date) : new Date()).toISOString()
    };
    
    // Add optional fields with validation
    if ((cert as any).expiryDate && typeof (cert as any).expiryDate === 'string' && (cert as any).expiryDate.trim().length > 0) {
      certEvent.endDate = timelineUtilsService.parseDate((cert as any).expiryDate).toISOString();
    }
    
    if (cert.credentialId && typeof cert.credentialId === 'string' && cert.credentialId.trim().length > 0) {
      certEvent.description = `Credential ID: ${cert.credentialId.trim()}`;
    }
    
    return certEvent;
  }
  
  /**
   * Process achievement into timeline event
   */
  processAchievement(achievement: string, eventIndex: number, cv: ParsedCV): TimelineEvent | null {
    if (!achievement || typeof achievement !== 'string' || achievement.trim().length === 0) {
      return null;
    }
    
    // Try to extract date from achievement text
    const dateMatch = achievement.match(/\b(19|20)\d{2}\b/);
    if (!dateMatch) {
      return null; // Skip achievements without identifiable dates
    }
    
    const achievementEvent: TimelineEvent = {
      id: `achievement-${eventIndex}`,
      type: 'achievement',
      title: timelineUtilsService.extractAchievementTitle(achievement),
      organization: timelineUtilsService.extractAchievementOrg(achievement, cv),
      startDate: new Date(parseInt(dateMatch[0]), 0, 1).toISOString()
    };
    
    achievementEvent.description = achievement.trim();
    return achievementEvent;
  }
}

export const timelineProcessorEventsService = new TimelineProcessorEventsService();