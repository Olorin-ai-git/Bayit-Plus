// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { timelineGenerationServiceV2 } from '../services/timeline-generation.service';
import { SafeFirestoreService } from '../services/safe-firestore.service';
import { handleFunctionError, createErrorContext, sanitizeErrorContext } from '../../shared/utils/error-handlers';

export const generateTimeline = onCall(
  {
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId } = request.data;

    try {
      // Get the job data with parsed CV
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        throw new Error('CV data not found. Please ensure CV is parsed first.');
      }

      // Check if timeline already exists
      if (jobData.enhancedFeatures?.timeline?.data) {
        return {
          success: true,
          timeline: jobData.enhancedFeatures.timeline.data,
          // HTML fragment removed with React SPA migration
        };
      }

      // Update status to processing with safe Firestore operation
      const docRef = admin.firestore().collection('jobs').doc(jobId);
      const processingResult = await SafeFirestoreService.safeTimelineUpdate(docRef, {
        'enhancedFeatures.timeline.status': 'processing',
        'enhancedFeatures.timeline.progress': 25,
        'enhancedFeatures.timeline.currentStep': 'Analyzing career progression...',
        'enhancedFeatures.timeline.startedAt': FieldValue.serverTimestamp()
      });
      
      if (!processingResult.success) {
        throw new Error('Failed to initialize timeline processing status');
      }

      // Generate timeline (without storing - we'll handle storage here)
      const timelineData = await timelineGenerationServiceV2.generateTimeline(
        jobData.parsedData,
        jobId,
        false  // Don't store in V2 service, we'll handle it here
      );

      // Update progress with safe Firestore operation
      const progressResult = await SafeFirestoreService.safeTimelineUpdate(docRef, {
        'enhancedFeatures.timeline.progress': 75,
        'enhancedFeatures.timeline.currentStep': 'Creating interactive timeline...'
      });
      
      if (!progressResult.success) {
        // Continue processing even if progress update fails
      }

      // Generate HTML fragment for progressive enhancement
      // const experience = jobData.parsedData.experience || []; // Unused variable

      // HTML generation removed - React SPA handles UI rendering;

      // Prepare final timeline update with comprehensive validation
      const finalUpdateData = {
        'enhancedFeatures.timeline.status': 'completed',
        'enhancedFeatures.timeline.progress': 100,
        'enhancedFeatures.timeline.data': timelineData, // Will be validated and sanitized by SafeFirestoreService
        'enhancedFeatures.timeline.htmlFragment': null, // HTML fragment removed with React SPA migration
        'enhancedFeatures.timeline.processedAt': FieldValue.serverTimestamp()
      };
      
      // Use safe Firestore operation with comprehensive pre-write validation
      const finalResult = await SafeFirestoreService.safeTimelineUpdate(docRef, finalUpdateData, {
        validate: true,
        sanitize: true,
        logValidation: true,
        retryAttempts: 3,
        fallbackOnError: true
      });
      
      if (!finalResult.success) {
        throw new Error(`Failed to store timeline data: ${finalResult.errors?.join(', ')}`);
      }
      
      console.log('[Timeline Generation] Timeline data stored successfully with validation:', {
        validationPassed: finalResult.validation?.isValid,
        warningsCount: finalResult.validation?.warnings?.length || 0,
        sanitizationApplied: !!finalResult.sanitizedData,
        operationTime: finalResult.operationTime
      });

      return {
        success: true,
        timeline: timelineData,
        htmlFragment: null
      };

    } catch (error: any) {
      
      // Use enhanced error handling
      try {
        // Sanitize error data for safe Firestore write
        const errorContext = createErrorContext('generateTimeline', {
          userId: jobData?.userId
        });
        const sanitizedErrorContext = sanitizeErrorContext(errorContext);
        
        // Create safe error update with comprehensive validation
        const errorUpdateData = {
          'enhancedFeatures.timeline.status': 'failed',
          'enhancedFeatures.timeline.error': error.message || 'Unknown error',
          'enhancedFeatures.timeline.errorContext': sanitizedErrorContext,
          'enhancedFeatures.timeline.processedAt': FieldValue.serverTimestamp()
        };
        
        // Use safe Firestore operation for error state
        const errorDocRef = admin.firestore().collection('jobs').doc(jobId);
        const errorResult = await SafeFirestoreService.safeTimelineUpdate(errorDocRef, errorUpdateData, {
          validate: true,
          sanitize: true,
          retryAttempts: 2, // Fewer retries for error updates
          fallbackOnError: true
        });
        
        if (!errorResult.success) {
          // Don't throw here to avoid masking the original error
        }
      } catch (updateError) {
      }
      
      // Handle error with enhanced error handling
      const errorContext = createErrorContext('generateTimeline', {
        userId: request.auth?.uid
      });
      throw handleFunctionError(error, errorContext, 'Failed to generate timeline');
    }
  });

export const updateTimelineEvent = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, eventId, updates } = request.data;

    try {
      // Get the job and verify ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Get current timeline data
      const timeline = jobData?.enhancedFeatures?.timeline?.data;
      if (!timeline) {
        throw new Error('Timeline not found');
      }

      // Update the specific event
      const eventIndex = timeline.events.findIndex((e: any) => e.id === eventId);
      if (eventIndex === -1) {
        throw new Error('Event not found');
      }

      timeline.events[eventIndex] = {
        ...timeline.events[eventIndex],
        ...updates
      };

      // Update timeline with safe Firestore operation
      const updateDocRef = admin.firestore().collection('jobs').doc(jobId);
      const timelineUpdateData = {
        'enhancedFeatures.timeline.data': timeline, // Will be validated and sanitized
        'enhancedFeatures.timeline.lastModified': FieldValue.serverTimestamp()
      };
      
      const updateResult = await SafeFirestoreService.safeTimelineUpdate(updateDocRef, timelineUpdateData, {
        validate: true,
        sanitize: true,
        logValidation: true,
        retryAttempts: 3,
        fallbackOnError: true
      });
      
      if (!updateResult.success) {
        throw new Error(`Failed to update timeline: ${updateResult.errors?.join(', ')}`);
      }
      
      console.log('[Timeline Update] Timeline event updated successfully:', {
        validationPassed: updateResult.validation?.isValid,
        operationTime: updateResult.operationTime
      });

      return {
        success: true,
        event: timeline.events[eventIndex]
      };

    } catch (error: any) {
      throw new Error(`Failed to update timeline event: ${error.message}`);
    }
  });

export const exportTimeline = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, format = 'json' } = request.data;

    try {
      // Get the job and verify ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      const timeline = jobData?.enhancedFeatures?.timeline?.data;
      if (!timeline) {
        throw new Error('Timeline not found');
      }

      let exportData;
      let contentType;
      let filename;

      switch (format) {
        case 'json':
          exportData = JSON.stringify(timeline, null, 2);
          contentType = 'application/json';
          filename = 'career-timeline.json';
          break;
          
        case 'csv':
          exportData = convertTimelineToCSV(timeline);
          contentType = 'text/csv';
          filename = 'career-timeline.csv';
          break;
          
        case 'html':
          exportData = generateTimelineHTML(timeline, jobData.parsedData);
          contentType = 'text/html';
          filename = 'career-timeline.html';
          break;
          
        default:
          throw new Error('Unsupported export format');
      }

      // Store export file
      const bucket = admin.storage().bucket();
      const file = bucket.file(`exports/${jobId}/timeline-${Date.now()}.${format}`);
      
      await file.save(exportData, {
        metadata: {
          contentType,
          metadata: {
            jobId,
            format,
            exportedAt: new Date().toISOString()
          }
        }
      });

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 3600000 // 1 hour
      });

      return {
        success: true,
        downloadUrl: url,
        filename,
        format,
        size: Buffer.byteLength(exportData)
      };

    } catch (error: any) {
      throw new Error(`Failed to export timeline: ${error.message}`);
    }
  });

// Helper function to convert timeline to CSV
function convertTimelineToCSV(timeline: any): string {
  const headers = ['Type', 'Title', 'Organization', 'Start Date', 'End Date', 'Duration', 'Location', 'Description'];
  const rows = [headers];

  for (const event of timeline.events) {
    const row = [
      event.type,
      event.title,
      event.organization,
      new Date(event.startDate).toLocaleDateString(),
      event.endDate ? new Date(event.endDate).toLocaleDateString() : 'Present',
      calculateDuration(event.startDate, event.endDate),
      event.location || '',
      event.description || ''
    ];
    rows.push(row);
  }

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// Helper function to calculate duration
function calculateDuration(start: string | Date, end?: string | Date): string {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                 (endDate.getMonth() - startDate.getMonth());
  
  if (months < 12) {
    return `${months} months`;
  } else {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 
      ? `${years} years, ${remainingMonths} months`
      : `${years} years`;
  }
}

// Helper function to generate HTML timeline
function generateTimelineHTML(timeline: any, cvData: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cvData.personalInfo?.name || 'Professional'} - Career Timeline</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
        }
        .summary {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .timeline {
            position: relative;
            padding: 20px 0;
        }
        .timeline::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #ddd;
            transform: translateX(-50%);
        }
        .event {
            position: relative;
            margin: 20px 0;
            display: flex;
            align-items: center;
        }
        .event:nth-child(odd) {
            flex-direction: row-reverse;
        }
        .event-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            width: 45%;
            margin: 0 20px;
        }
        .event-dot {
            width: 16px;
            height: 16px;
            background: #3498db;
            border-radius: 50%;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .event.work .event-dot { background: #3498db; }
        .event.education .event-dot { background: #9b59b6; }
        .event.achievement .event-dot { background: #2ecc71; }
        .event.certification .event-dot { background: #f39c12; }
        .event-title {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .event-org {
            color: #7f8c8d;
            font-size: 14px;
        }
        .event-date {
            color: #95a5a6;
            font-size: 12px;
            margin-top: 10px;
        }
        .insights {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-top: 30px;
        }
        @media (max-width: 768px) {
            .timeline::before {
                left: 30px;
            }
            .event {
                flex-direction: column !important;
                align-items: flex-start !important;
                margin-left: 50px;
            }
            .event-content {
                width: 100%;
                margin: 10px 0;
            }
            .event-dot {
                left: 30px;
            }
        }
    </style>
</head>
<body>
    <h1>${cvData.personalInfo?.name || 'Professional'} - Career Timeline</h1>
    
    <div class="summary">
        <h2>Career Summary</h2>
        <p><strong>${timeline.summary.totalYearsExperience}</strong> years of experience</p>
        <p><strong>${timeline.summary.companiesWorked}</strong> companies</p>
        <p><strong>${timeline.summary.degreesEarned}</strong> degrees</p>
        <p><strong>${timeline.summary.certificationsEarned}</strong> certifications</p>
    </div>
    
    <div class="timeline">
        ${timeline.events.map((event: any) => `
            <div class="event ${event.type}">
                <div class="event-dot"></div>
                <div class="event-content">
                    <div class="event-title">${event.title}</div>
                    <div class="event-org">${event.organization}</div>
                    ${event.description ? `<p>${event.description}</p>` : ''}
                    <div class="event-date">
                        ${new Date(event.startDate).toLocaleDateString()} - 
                        ${event.current ? 'Present' : event.endDate ? new Date(event.endDate).toLocaleDateString() : ''}
                    </div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="insights">
        <h2>Career Insights</h2>
        <p><strong>Progression:</strong> ${timeline.insights.careerProgression}</p>
        <p><strong>Industries:</strong> ${timeline.insights.industryFocus.join(', ')}</p>
        <p><strong>Skill Evolution:</strong> ${timeline.insights.skillEvolution}</p>
    </div>
</body>
</html>
  `;
}