// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV-Portal Integration Firebase Functions
 * 
 * Provides Firebase callable functions for integrating portal generation with CV completion.
 * Handles automatic and manual portal generation, status tracking, and integration management.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 * @version 1.0
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { 
  CVPortalIntegrationService, 
  CVPortalTrigger, 
  PortalGenerationPreferences,
  IntegrationStatus 
} from '../services/portal-integration.service';
import { 
  PortalGenerationResult, 
  PortalStatus 
} from '../types/portal';
import { URLPlacement, QRCodeType } from '../types/portal-analytics';
import { ParsedCV } from '../types/job';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GeneratePortalRequest {
  jobId: string;
  userId?: string;
  triggerType?: 'automatic' | 'manual';
  preferences?: PortalGenerationPreferences;
}

interface GetPortalStatusRequest {
  jobId: string;
  userId?: string;
}

interface UpdatePortalPreferencesRequest {
  userId: string;
  preferences: PortalGenerationPreferences;
}

interface RetryPortalGenerationRequest {
  jobId: string;
  userId?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate user access to job
 */
async function validateJobAccess(jobId: string, userId?: string): Promise<{
  isValid: boolean;
  jobData?: any;
  error?: string;
}> {
  try {
    const db = admin.firestore();
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    
    if (!jobDoc.exists) {
      return { isValid: false, error: 'Job not found' };
    }

    const jobData = jobDoc.data()!;
    
    // If userId is provided, check ownership
    if (userId && jobData.userId !== userId) {
      return { isValid: false, error: 'Access denied: Job does not belong to user' };
    }

    return { isValid: true, jobData };
  } catch (error) {
    functions.logger.error('Failed to validate job access', { jobId, userId, error });
    return { isValid: false, error: 'Database access error' };
  }
}

/**
 * Get user preferences for portal generation (internal helper)
 */
async function getUserPortalPreferencesInternal(userId: string): Promise<PortalGenerationPreferences> {
  try {
    const db = admin.firestore();
    const prefsDoc = await db
      .collection('user_portal_preferences')
      .doc(userId)
      .get();

    if (prefsDoc.exists) {
      return prefsDoc.data() as PortalGenerationPreferences;
    }

    // Return default preferences
    return {
      autoGenerate: true,
      updateCVDocument: true,
      generateQRCodes: true,
      urlPlacements: [URLPlacement.CONTACT_SECTION, URLPlacement.HEADER],
      qrCodeTypes: [QRCodeType.PRIMARY_PORTAL, QRCodeType.CHAT_DIRECT],
      enableAnalytics: true,
      privacyLevel: 'public'
    };
  } catch (error) {
    functions.logger.error('Failed to get user portal preferences', { userId, error });
    
    // Return safe defaults on error
    return {
      autoGenerate: false,
      updateCVDocument: false,
      generateQRCodes: false,
      urlPlacements: [],
      qrCodeTypes: [],
      enableAnalytics: false,
      privacyLevel: 'private'
    };
  }
}

/**
 * Convert CV document to ParsedCV format
 */
function convertToParsedCV(cvData: any): ParsedCV {
  return {
    personalInfo: cvData.personalInfo || {},
    experience: cvData.experience || [],
    education: cvData.education || [],
    skills: cvData.skills || {},
    certifications: cvData.certifications || [],
    projects: cvData.projects || [],
    achievements: cvData.achievements || [],
    languages: cvData.languages || []
  };
}

// ============================================================================
// FIREBASE CALLABLE FUNCTIONS
// ============================================================================

/**
 * Generate Portal
 * 
 * Main function to trigger portal generation for a completed CV.
 * Can be called automatically after CV completion or manually by user.
 */
export const generatePortal = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '2GB'
  })
  .https.onCall(async (data: GeneratePortalRequest, context) => {
    const { jobId, userId, triggerType = 'manual', preferences } = data;

    try {
      functions.logger.info('Portal generation requested', {
        jobId,
        userId: userId || context.auth?.uid,
        triggerType
      });

      // Validate required parameters
      if (!jobId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Job ID is required'
        );
      }

      const effectiveUserId = userId || context.auth?.uid;
      if (!effectiveUserId) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User authentication required'
        );
      }

      // Validate job access
      const jobValidation = await validateJobAccess(jobId, effectiveUserId);
      if (!jobValidation.isValid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          jobValidation.error || 'Access denied'
        );
      }

      // Get user preferences (merge with provided preferences)
      const userPreferences = await getUserPortalPreferencesInternal(effectiveUserId);
      const finalPreferences = preferences ? { ...userPreferences, ...preferences } : userPreferences;

      // Check if portal generation is enabled for this user
      if (!finalPreferences.autoGenerate && triggerType === 'automatic') {
        functions.logger.info('Automatic portal generation disabled for user', {
          jobId,
          userId: effectiveUserId
        });
        
        return {
          success: false,
          message: 'Automatic portal generation is disabled',
          portalStatus: 'disabled'
        };
      }

      // Convert job data to ParsedCV format
      const cvData = convertToParsedCV(jobValidation.jobData);

      // Create trigger object
      const trigger: CVPortalTrigger = {
        jobId,
        userId: effectiveUserId,
        cvData,
        triggerType,
        preferences: finalPreferences
      };

      // Initialize portal integration service
      const integrationService = new CVPortalIntegrationService();

      // Start portal generation
      const result: PortalGenerationResult = await integrationService.initializePortalGeneration(trigger);

      functions.logger.info('Portal generation completed', {
        jobId,
        success: result.success,
        processingTimeMs: result.processingTimeMs
      });

      if (result.success) {
        return {
          success: true,
          portalId: result.portalConfig?.id,
          urls: result.urls,
          processingTimeMs: result.processingTimeMs,
          stepsCompleted: result.stepsCompleted,
          message: 'Portal generated successfully'
        };
      } else {
        return {
          success: false,
          error: result.error,
          processingTimeMs: result.processingTimeMs,
          stepsCompleted: result.stepsCompleted,
          message: result.error?.message || 'Portal generation failed'
        };
      }

    } catch (error) {
      functions.logger.error('Portal generation failed', {
        jobId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Portal generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Get Portal Status
 * 
 * Retrieve the current status of portal generation for a job.
 */
export const getPortalStatus = functions
  .region('us-central1')
  .https.onCall(async (data: GetPortalStatusRequest, context) => {
    const { jobId, userId } = data;

    try {
      functions.logger.debug('Portal status requested', { jobId, userId });

      // Validate required parameters
      if (!jobId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Job ID is required'
        );
      }

      const effectiveUserId = userId || context.auth?.uid;
      if (!effectiveUserId) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User authentication required'
        );
      }

      // Validate job access
      const jobValidation = await validateJobAccess(jobId, effectiveUserId);
      if (!jobValidation.isValid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          jobValidation.error || 'Access denied'
        );
      }

      // Get portal status
      const integrationService = new CVPortalIntegrationService();
      const status: IntegrationStatus | null = await integrationService.getPortalStatus(jobId);

      if (!status) {
        return {
          exists: false,
          message: 'No portal generation found for this job'
        };
      }

      return {
        exists: true,
        status: status.status,
        progress: status.progress,
        currentStep: status.currentStep,
        portalId: status.portalId,
        urls: status.urls,
        startedAt: status.startedAt.toISOString(),
        updatedAt: status.updatedAt.toISOString(),
        error: status.error
      };

    } catch (error) {
      functions.logger.error('Failed to get portal status', {
        jobId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to get portal status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Update Portal Preferences
 * 
 * Update user preferences for portal generation.
 */
export const updatePortalPreferences = functions
  .region('us-central1')
  .https.onCall(async (data: UpdatePortalPreferencesRequest, context) => {
    const { userId, preferences } = data;

    try {
      functions.logger.info('Portal preferences update requested', { userId });

      const effectiveUserId = userId || context.auth?.uid;
      if (!effectiveUserId) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User authentication required'
        );
      }

      // Validate preferences
      if (!preferences || typeof preferences !== 'object') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Valid preferences object is required'
        );
      }

      // Update preferences in database
      const db = admin.firestore();
      await db
        .collection('user_portal_preferences')
        .doc(effectiveUserId)
        .set({
          ...preferences,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

      functions.logger.info('Portal preferences updated successfully', {
        userId: effectiveUserId
      });

      return {
        success: true,
        message: 'Portal preferences updated successfully'
      };

    } catch (error) {
      functions.logger.error('Failed to update portal preferences', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to update portal preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Retry Portal Generation
 * 
 * Retry failed portal generation for a job.
 */
export const retryPortalGeneration = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '2GB'
  })
  .https.onCall(async (data: RetryPortalGenerationRequest, context) => {
    const { jobId, userId } = data;

    try {
      functions.logger.info('Portal generation retry requested', { jobId, userId });

      // Validate required parameters
      if (!jobId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Job ID is required'
        );
      }

      const effectiveUserId = userId || context.auth?.uid;
      if (!effectiveUserId) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User authentication required'
        );
      }

      // Validate job access
      const jobValidation = await validateJobAccess(jobId, effectiveUserId);
      if (!jobValidation.isValid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          jobValidation.error || 'Access denied'
        );
      }

      // Check current portal status
      const integrationService = new CVPortalIntegrationService();
      const currentStatus = await integrationService.getPortalStatus(jobId);

      if (currentStatus && currentStatus.status === PortalStatus.COMPLETED) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Portal generation already completed successfully'
        );
      }

      if (currentStatus && currentStatus.status === PortalStatus.GENERATING) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Portal generation already in progress'
        );
      }

      // Get user preferences
      const userPreferences = await getUserPortalPreferencesInternal(effectiveUserId);

      // Convert job data to ParsedCV format
      const cvData = convertToParsedCV(jobValidation.jobData);

      // Create trigger object for retry
      const trigger: CVPortalTrigger = {
        jobId,
        userId: effectiveUserId,
        cvData,
        triggerType: 'manual',
        preferences: userPreferences
      };

      // Start portal generation retry
      const result: PortalGenerationResult = await integrationService.initializePortalGeneration(trigger);

      functions.logger.info('Portal generation retry completed', {
        jobId,
        success: result.success,
        processingTimeMs: result.processingTimeMs
      });

      if (result.success) {
        return {
          success: true,
          portalId: result.portalConfig?.id,
          urls: result.urls,
          processingTimeMs: result.processingTimeMs,
          stepsCompleted: result.stepsCompleted,
          message: 'Portal generation retry successful'
        };
      } else {
        return {
          success: false,
          error: result.error,
          processingTimeMs: result.processingTimeMs,
          stepsCompleted: result.stepsCompleted,
          message: result.error?.message || 'Portal generation retry failed'
        };
      }

    } catch (error) {
      functions.logger.error('Portal generation retry failed', {
        jobId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Portal generation retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Get User Portal Preferences
 * 
 * Retrieve current portal generation preferences for a user.
 */
export const getUserPortalPreferences = functions
  .region('us-central1')
  .https.onCall(async (data: { userId?: string }, context) => {
    const { userId } = data;

    try {
      const effectiveUserId = userId || context.auth?.uid;
      if (!effectiveUserId) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User authentication required'
        );
      }

      const preferences = await getUserPortalPreferencesInternal(effectiveUserId);

      return {
        success: true,
        preferences
      };

    } catch (error) {
      functions.logger.error('Failed to get user portal preferences', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to get preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * List User Portals
 * 
 * Get all portals generated for a user.
 */
export const listUserPortals = functions
  .region('us-central1')
  .https.onCall(async (data: { userId?: string; limit?: number }, context) => {
    const { userId, limit = 20 } = data;

    try {
      const effectiveUserId = userId || context.auth?.uid;
      if (!effectiveUserId) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User authentication required'
        );
      }

      const db = admin.firestore();
      
      // Get user's portals
      const portalsQuery = await db
        .collection('portal_configs')
        .where('userId', '==', effectiveUserId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const portals = portalsQuery.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          jobId: data.jobId,
          status: data.status,
          urls: data.urls,
          createdAt: data.createdAt?.toDate()?.toISOString(),
          updatedAt: data.updatedAt?.toDate()?.toISOString()
        };
      });

      return {
        success: true,
        portals,
        total: portals.length
      };

    } catch (error) {
      functions.logger.error('Failed to list user portals', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new functions.https.HttpsError(
        'internal',
        `Failed to list portals: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

// ============================================================================
// AUTOMATIC INTEGRATION TRIGGER
// ============================================================================

/**
 * Automatic Portal Generation Trigger
 * 
 * Firestore trigger that automatically starts portal generation when a CV job is completed.
 */
export const onCVCompletionTriggerPortal = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 60,
    memory: '1GB'
  })
  .firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const { jobId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    try {
      // Check if job was just completed
      const wasCompleted = beforeData.status !== 'completed' && afterData.status === 'completed';
      
      if (!wasCompleted) {
        return; // Job not completed, skip
      }

      functions.logger.info('CV completed, checking for automatic portal generation', {
        jobId,
        userId: afterData.userId
      });

      // Get user preferences
      const userPreferences = await getUserPortalPreferencesInternal(afterData.userId);
      
      if (!userPreferences.autoGenerate) {
        functions.logger.info('Automatic portal generation disabled for user', {
          jobId,
          userId: afterData.userId
        });
        return;
      }

      // Check if portal already exists
      const db = admin.firestore();
      const existingPortal = await db
        .collection('portal_configs')
        .where('jobId', '==', jobId)
        .limit(1)
        .get();

      if (!existingPortal.empty) {
        functions.logger.info('Portal already exists for job', { jobId });
        return;
      }

      // Convert job data to ParsedCV format
      const cvData = convertToParsedCV(afterData);

      // Create trigger object
      const trigger: CVPortalTrigger = {
        jobId,
        userId: afterData.userId,
        cvData,
        triggerType: 'automatic',
        preferences: userPreferences
      };

      // Initialize portal integration service
      const integrationService = new CVPortalIntegrationService();

      // Start portal generation (non-blocking)
      integrationService.initializePortalGeneration(trigger)
        .then(result => {
          functions.logger.info('Automatic portal generation completed', {
            jobId,
            success: result.success,
            processingTimeMs: result.processingTimeMs
          });
        })
        .catch(error => {
          functions.logger.error('Automatic portal generation failed', {
            jobId,
            error: error instanceof Error ? error.message : String(error)
          });
        });

    } catch (error) {
      functions.logger.error('Failed to process CV completion trigger', {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });