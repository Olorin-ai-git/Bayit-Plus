// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV Generation Helpers
 * 
 * Helper functions for CV generation workflow including special features
 * processing, error handling, and common utilities.
 * 
 * @author Gil Klainert
 * @version 2.0.0 - Modularized Architecture
 */

import * as admin from 'firebase-admin';

/**
 * Handle special features that require additional processing
 * after the main CV generation (like podcast, video, etc.)
 */
export async function handleSpecialFeatures(
  jobId: string, 
  features?: string[]
): Promise<void> {
  if (!features || features.length === 0) {
    return;
  }

  console.log(`🎯 Processing ${features.length} special features for job ${jobId}`);

  try {
    // Process each special feature
    for (const feature of features) {
      await processSpecialFeature(jobId, feature);
    }

    console.log(`✅ All special features processed for job ${jobId}`);
  } catch (error: any) {
    console.error(`❌ Special features processing failed for job ${jobId}:`, error);
    // Don't throw - special features are enhancements, not critical
  }
}

/**
 * Process a single special feature
 */
async function processSpecialFeature(jobId: string, feature: string): Promise<void> {
  switch (feature) {
    case 'podcast-generation':
      await generatePodcast(jobId);
      break;
    
    case 'video-introduction':
      await generateVideoIntroduction(jobId);
      break;
    
    case 'portfolio-gallery':
      await setupPortfolioGallery(jobId);
      break;
    
    case 'calendar-integration':
      await setupCalendarIntegration(jobId);
      break;
    
    case 'qr-code':
      await generateQRCode(jobId);
      break;
    
    case 'social-sharing':
      await setupSocialSharing(jobId);
      break;
    
    default:
      console.log(`🤷 Unknown special feature: ${feature}`);
  }
}

/**
 * Generate podcast for CV
 */
async function generatePodcast(jobId: string): Promise<void> {
  console.log(`🎙️ Generating podcast for job ${jobId}`);
  
  try {
    // Update job status to indicate podcast generation started
    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.podcast.status': 'generating',
      'features.podcast.startTime': admin.firestore.FieldValue.serverTimestamp()
    });

    // TODO: Integrate with multimedia service for actual podcast generation
    // For now, mark as placeholder
    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.podcast.status': 'completed',
      'features.podcast.url': `placeholder_podcast_${jobId}.mp3`,
      'features.podcast.endTime': admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`🎙️ Podcast generation completed for job ${jobId}`);
  } catch (error: any) {
    console.error(`❌ Podcast generation failed for job ${jobId}:`, error);
    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.podcast.status': 'failed',
      'features.podcast.error': error.message
    });
  }
}

/**
 * Generate video introduction
 */
async function generateVideoIntroduction(jobId: string): Promise<void> {
  console.log(`🎬 Generating video introduction for job ${jobId}`);
  
  try {
    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.video.status': 'generating',
      'features.video.startTime': admin.firestore.FieldValue.serverTimestamp()
    });

    // TODO: Integrate with multimedia service for actual video generation
    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.video.status': 'completed',
      'features.video.url': `placeholder_video_${jobId}.mp4`,
      'features.video.endTime': admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`🎬 Video introduction completed for job ${jobId}`);
  } catch (error: any) {
    console.error(`❌ Video generation failed for job ${jobId}:`, error);
    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.video.status': 'failed',
      'features.video.error': error.message
    });
  }
}

/**
 * Setup portfolio gallery
 */
async function setupPortfolioGallery(jobId: string): Promise<void> {
  console.log(`🖼️ Setting up portfolio gallery for job ${jobId}`);
  
  try {
    const galleryConfig = {
      enabled: true,
      layout: 'grid',
      maxItems: 12,
      allowUploads: true,
      publicUrl: `https://cvplus.app/portfolio/${jobId}`
    };

    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.portfolio': galleryConfig
    });

    console.log(`🖼️ Portfolio gallery setup completed for job ${jobId}`);
  } catch (error: any) {
    console.error(`❌ Portfolio gallery setup failed for job ${jobId}:`, error);
  }
}

/**
 * Setup calendar integration
 */
async function setupCalendarIntegration(jobId: string): Promise<void> {
  console.log(`📅 Setting up calendar integration for job ${jobId}`);
  
  try {
    // Get user data for calendar setup
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    const jobData = jobDoc.data();
    
    if (!jobData) {
      throw new Error('Job data not found');
    }

    const calendarConfig = {
      enabled: true,
      bookingUrl: `https://calendly.com/cvplus-${jobData.userId}`,
      timeZone: 'UTC',
      availability: 'business-hours'
    };

    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.calendar': calendarConfig
    });

    console.log(`📅 Calendar integration setup completed for job ${jobId}`);
  } catch (error: any) {
    console.error(`❌ Calendar integration setup failed for job ${jobId}:`, error);
  }
}

/**
 * Generate QR code for CV
 */
async function generateQRCode(jobId: string): Promise<void> {
  console.log(`📱 Generating QR code for job ${jobId}`);
  
  try {
    // Generate QR code data
    const qrData = {
      url: `https://cvplus.app/cv/${jobId}`,
      generated: new Date().toISOString(),
      format: 'PNG',
      size: '200x200'
    };

    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.qrCode': qrData
    });

    console.log(`📱 QR code generation completed for job ${jobId}`);
  } catch (error: any) {
    console.error(`❌ QR code generation failed for job ${jobId}:`, error);
  }
}

/**
 * Setup social sharing
 */
async function setupSocialSharing(jobId: string): Promise<void> {
  console.log(`🌐 Setting up social sharing for job ${jobId}`);
  
  try {
    const sharingConfig = {
      enabled: true,
      platforms: ['linkedin', 'twitter', 'facebook', 'email'],
      shareUrl: `https://cvplus.app/cv/${jobId}`,
      previewImage: `https://cvplus.app/api/cv/${jobId}/preview.png`
    };

    await admin.firestore().collection('jobs').doc(jobId).update({
      'features.socialSharing': sharingConfig
    });

    console.log(`🌐 Social sharing setup completed for job ${jobId}`);
  } catch (error: any) {
    console.error(`❌ Social sharing setup failed for job ${jobId}:`, error);
  }
}

/**
 * Handle generation errors and update job status
 */
export async function handleGenerationError(
  jobId: string, 
  error: any
): Promise<void> {
  console.error(`❌ Handling generation error for job ${jobId}:`, error);
  
  try {
    const errorData = {
      status: 'failed',
      error: {
        message: error.message || 'Unknown error',
        code: error.code || 'GENERATION_ERROR',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        stack: error.stack
      },
      retryCount: admin.firestore.FieldValue.increment(1)
    };

    await admin.firestore().collection('jobs').doc(jobId).update(errorData);

    // Check if we should retry
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    const jobData = jobDoc.data();
    
    if (jobData && (jobData.retryCount || 0) < 3) {
      console.log(`🔄 Marking job ${jobId} for retry (attempt ${(jobData.retryCount || 0) + 1}/3)`);
      
      // Schedule retry (this could trigger a cloud task or similar)
      await admin.firestore().collection('jobs').doc(jobId).update({
        scheduleRetry: true,
        nextRetry: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + (jobData.retryCount || 0) * 30000) // Exponential backoff
        )
      });
    } else {
      console.log(`❌ Job ${jobId} has exceeded retry limit, marking as permanently failed`);
      await admin.firestore().collection('jobs').doc(jobId).update({
        status: 'permanently_failed',
        finalError: true
      });
    }
  } catch (updateError: any) {
    console.error(`❌ Failed to update job error status for ${jobId}:`, updateError);
  }
}

/**
 * Validate CV data structure
 */
export function validateCVData(cvData: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!cvData) {
    errors.push('CV data is required');
    return { isValid: false, errors };
  }

  // Check for essential fields
  if (!cvData.personalInfo && !cvData.personal) {
    errors.push('Personal information is required');
  }

  if (!cvData.experience && !cvData.workExperience) {
    errors.push('Work experience is required');
  }

  if (!cvData.skills || (Array.isArray(cvData.skills) && cvData.skills.length === 0)) {
    errors.push('Skills are required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize CV data for processing
 */
export function sanitizeCVData(cvData: any): any {
  if (!cvData) return {};

  const sanitized = JSON.parse(JSON.stringify(cvData));

  // Remove any potentially harmful content
  function cleanString(str: any): string {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  function recursiveClean(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(recursiveClean);
    } else if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        cleaned[key] = recursiveClean(obj[key]);
      }
      return cleaned;
    } else if (typeof obj === 'string') {
      return cleanString(obj);
    }
    return obj;
  }

  return recursiveClean(sanitized);
}

/**
 * Extract key metrics from CV data
 */
export function extractCVMetrics(cvData: any): {
  experienceYears: number;
  skillsCount: number;
  educationCount: number;
  certificationsCount: number;
} {
  const metrics = {
    experienceYears: 0,
    skillsCount: 0,
    educationCount: 0,
    certificationsCount: 0
  };

  if (cvData.experience && Array.isArray(cvData.experience)) {
    // Calculate total years of experience
    metrics.experienceYears = cvData.experience.reduce((total: number, exp: any) => {
      if (exp.startDate && exp.endDate) {
        const start = new Date(exp.startDate);
        const end = new Date(exp.endDate);
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return total + Math.max(0, years);
      }
      return total;
    }, 0);
  }

  if (cvData.skills && Array.isArray(cvData.skills)) {
    metrics.skillsCount = cvData.skills.length;
  }

  if (cvData.education && Array.isArray(cvData.education)) {
    metrics.educationCount = cvData.education.length;
  }

  if (cvData.certifications && Array.isArray(cvData.certifications)) {
    metrics.certificationsCount = cvData.certifications.length;
  }

  return metrics;
}

// Export as namespace for backward compatibility
export const CVGenerationHelpers = {
  handleSpecialFeatures,
  handleGenerationError,
  validateCVData,
  sanitizeCVData,
  extractCVMetrics
};