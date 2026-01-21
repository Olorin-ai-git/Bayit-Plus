// @ts-ignore - Export conflicts/**
 * Timeline Processor Core Service
 * Core CV data processing orchestrator
 */

import { ParsedCV } from '../../../types/enhanced-models';
import { TimelineEvent } from '../types/timeline.types';
import { timelineProcessorEventsService } from './timeline-processor-events.service';

export class TimelineProcessorCoreService {
  
  /**
   * Process CV data into timeline events with comprehensive error handling
   */
  async processCV(parsedCV: ParsedCV): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];
    let processingErrors = 0;
    
    
    // Process work experience
    if (parsedCV.experience) {
      for (const exp of parsedCV.experience) {
        try {
          const workEvent = timelineProcessorEventsService.processWorkExperience(exp, events.length);
          if (workEvent) {
            events.push(workEvent);
          }
        } catch (error) {
          processingErrors++;
        }
      }
    }
    
    // Process education
    if (parsedCV.education) {
      for (const edu of parsedCV.education) {
        try {
          const eduEvent = timelineProcessorEventsService.processEducation(edu, events.length);
          if (eduEvent) {
            events.push(eduEvent);
          }
        } catch (error) {
          processingErrors++;
        }
      }
    }
    
    // Process certifications
    if (parsedCV.certifications) {
      for (const cert of parsedCV.certifications) {
        try {
          const certEvent = timelineProcessorEventsService.processCertification(cert, events.length);
          if (certEvent) {
            events.push(certEvent);
          }
        } catch (error) {
          processingErrors++;
        }
      }
    }
    
    // Process achievements
    if (parsedCV.achievements && Array.isArray(parsedCV.achievements)) {
      for (const achievement of parsedCV.achievements) {
        try {
          const achievementEvent = timelineProcessorEventsService.processAchievement(achievement, events.length, parsedCV);
          if (achievementEvent) {
            events.push(achievementEvent);
          }
        } catch (error) {
          processingErrors++;
        }
      }
    }
    
    // Sort events by start date
    try {
      events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } catch (error) {
    }
    
    return events;
  }
}

export const timelineProcessorCoreService = new TimelineProcessorCoreService();