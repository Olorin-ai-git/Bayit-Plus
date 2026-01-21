// @ts-ignore - Export conflicts/**
 * Timeline Storage Service
 * Handles Firestore storage with enhanced error handling and retry logic
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { SafeFirestoreService } from '../../../utils/safe-firestore.service';
import { FirestoreValidationService } from '../../../utils/firestore-validation.service';

export class TimelineStorageService {
  
  /**
   * Validate timeline data before any storage operation
   */
  async validateTimelineData(data: any, context: string = 'unknown'): Promise<{
    isValid: boolean;
    sanitizedData: any;
    errors: string[];
    warnings: string[];
  }> {
    
    const validation = FirestoreValidationService.validateForFirestore(
      data,
      `timeline-validation:${context}`,
      'update',
      {
        strict: false,
        sanitizeOnValidation: true,
        allowUndefined: false,
        allowNullValues: true
      }
    );
    
    return {
      isValid: validation.isValid,
      sanitizedData: validation.sanitizedData,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }
  
  /**
   * Store timeline data in Firestore with comprehensive pre-write validation
   * Enhanced for Phase 1.3 with SafeFirestoreService integration
   */
  async storeTimelineData(jobId: string, timelineData: any): Promise<void> {
    try {
      
      // Pre-validation check
      if (!timelineData) {
        throw new Error('Timeline data is null or undefined');
      }
      
      // Comprehensive pre-write validation
      const validationResult = FirestoreValidationService.validateForFirestore(
        timelineData,
        `timeline-storage:${jobId}`,
        'update',
        {
          strict: false,
          sanitizeOnValidation: true,
          allowUndefined: false,
          allowNullValues: true,
          requiredFields: [], // Timeline fields are flexible
          maxDepth: 15 // Timeline can have nested structures
        }
      );
      
      // Log comprehensive validation report
      
      // Prepare final data for storage
      let finalData = timelineData;
      if (validationResult.isValid) {
        finalData = validationResult.sanitizedData;
      } else {
        
        // Check if we have critical errors that prevent storage
        const criticalErrors = validationResult.errors.filter(error => 
          error.includes('undefined') || 
          error.includes('Unsupported') || 
          error.includes('exceeds')
        );
        
        if (criticalErrors.length > 0) {
          throw new Error(`Critical validation errors prevent storage: ${criticalErrors.join(', ')}`);
        }
        
        // Use sanitized data even with warnings
        finalData = validationResult.sanitizedData;
      }
      
      // Prepare complete timeline structure
      const timelineUpdate = {
        'enhancedFeatures.timeline': {
          enabled: true,
          status: 'completed',
          data: finalData,
          generatedAt: FieldValue.serverTimestamp(),
          dataQuality: {
            eventsCount: finalData?.events?.length || 0,
            validationPassed: validationResult.isValid,
            cleaningVersion: '2.1.0', // Updated for Phase 1.3
            validationWarnings: validationResult.warnings.length,
            undefinedFieldsRemoved: validationResult.validationContext.undefinedFieldsRemoved
          }
        }
      };
      
      // Use SafeFirestoreService for the actual storage
      const docRef = admin.firestore().collection('jobs').doc(jobId);
      const result = await SafeFirestoreService.safeTimelineUpdate(docRef, timelineUpdate, {
        validate: true, // Double validation
        sanitize: true,
        logValidation: true,
        retryAttempts: 3,
        fallbackOnError: true,
        validationOptions: {
          strict: false,
          allowNullValues: true
        }
      });
      
      if (!result.success) {
        
        // Attempt fallback storage
        await this.attemptFallbackStorage(jobId, finalData);
        return;
      }
      
      
    } catch (error: any) {
      
      // Final fallback attempt
      await this.attemptFallbackStorage(jobId, timelineData);
    }
  }
  
  /**
   * Attempt fallback storage when primary storage fails
   */
  private async attemptFallbackStorage(jobId: string, originalData: any): Promise<void> {
    
    try {
      // Create minimal safe fallback data
      const fallbackData = this.createSafeFallbackData(originalData);
      
      // Validate fallback data
      const fallbackValidation = FirestoreValidationService.validateForFirestore(
        fallbackData,
        `fallback-storage:${jobId}`,
        'update',
        {
          strict: true, // Strict mode for fallback
          sanitizeOnValidation: true
        }
      );
      
      if (!fallbackValidation.isValid) {
        throw new Error('Fallback data is also invalid');
      }
      
      // Use basic Firestore operation for fallback (SafeFirestore already failed)
      const fallbackUpdate = {
        'enhancedFeatures.timeline': {
          enabled: true,
          status: 'completed',
          data: fallbackValidation.sanitizedData,
          generatedAt: FieldValue.serverTimestamp(),
          dataQuality: {
            eventsCount: fallbackValidation.sanitizedData?.events?.length || 0,
            validationPassed: true,
            cleaningVersion: '2.1.0-fallback',
            isFallback: true,
            originalDataFailed: true
          }
        }
      };
      
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update(fallbackUpdate);
      
      
    } catch (fallbackError: any) {
      
      // Last resort: store minimal structure
      try {
        const minimalData = this.getMinimalFallbackData();
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update({
            'enhancedFeatures.timeline': {
              enabled: true,
              status: 'failed',
              error: 'Storage validation failed',
              data: minimalData,
              generatedAt: FieldValue.serverTimestamp(),
              dataQuality: {
                eventsCount: 0,
                validationPassed: false,
                cleaningVersion: '2.1.0-minimal',
                isMinimalFallback: true
              }
            }
          });
      } catch (minimalError) {
        throw new Error(`Complete storage failure for job ${jobId}: ${minimalError}`);
      }
    }
  }
  
  /**
   * Create safe fallback data from original data
   */
  private createSafeFallbackData(originalData: any): any {
    try {
      // Extract safe elements from original data
      const events = Array.isArray(originalData?.events) ? 
        originalData.events.filter((event: any) => 
          event && typeof event === 'object' && event.id
        ).map((event: any) => ({
          id: String(event.id || ''),
          type: String(event.type || 'work'),
          title: String(event.title || 'Experience'),
          organization: String(event.organization || ''),
          startDate: event.startDate || new Date().toISOString(),
          endDate: event.endDate || null,
          current: Boolean(event.current),
          description: String(event.description || '')
        })) : [];
      
      return {
        events,
        summary: {
          totalYearsExperience: Number(originalData?.summary?.totalYearsExperience) || 0,
          companiesWorked: Number(originalData?.summary?.companiesWorked) || 0,
          degreesEarned: Number(originalData?.summary?.degreesEarned) || 0,
          certificationsEarned: Number(originalData?.summary?.certificationsEarned) || 0,
          careerHighlights: Array.isArray(originalData?.summary?.careerHighlights) ? 
            originalData.summary.careerHighlights.filter((h: any) => h && typeof h === 'string').map(String) : []
        },
        insights: {
          careerProgression: String(originalData?.insights?.careerProgression || 'Career progression analysis'),
          industryFocus: Array.isArray(originalData?.insights?.industryFocus) ? 
            originalData.insights.industryFocus.filter((i: any) => i && typeof i === 'string').map(String) : [],
          skillEvolution: String(originalData?.insights?.skillEvolution || 'Skill evolution analysis'),
          nextSteps: Array.isArray(originalData?.insights?.nextSteps) ? 
            originalData.insights.nextSteps.filter((s: any) => s && typeof s === 'string').map(String) : []
        }
      };
    } catch (error) {
      return this.getMinimalFallbackData();
    }
  }
  
  /**
   * Get minimal fallback data structure (last resort)
   */
  private getMinimalFallbackData(): any {
    return {
      events: [],
      summary: {
        totalYearsExperience: 0,
        companiesWorked: 0,
        degreesEarned: 0,
        certificationsEarned: 0,
        careerHighlights: []
      },
      insights: {
        careerProgression: 'Timeline generation failed - data not available',
        industryFocus: [],
        skillEvolution: 'Timeline generation failed - data not available',
        nextSteps: []
      }
    };
  }
}