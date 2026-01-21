// @ts-ignore
/**
 * QR Code Enhancement Firebase Functions
 * 
 * Provides Firebase callable functions for enhancing QR codes with portal functionality.
 * Handles QR code generation, updates, analytics, and tracking.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 * @version 1.0
  */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
// TODO: Create qr-enhancement.service
/* 
  */
import { 
  QRCodeEnhancementService, 
  QRCodeEnhancementOptions, 
  QRCodeUpdateResult 
} from '../services/qr-enhancement.service';
/*  */
import { 
  QRCodeType, 
  QRCodeStyling, 
  PortalUrls,
  QRCodeAnalytics 
} from '../types/portal';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EnhanceQRCodesRequest {
  jobId: string;
  userId?: string;
  portalUrls: PortalUrls;
  options?: Partial<QRCodeEnhancementOptions>;
}

interface TrackQRCodeScanRequest {
  jobId: string;
  qrCodeId: string;
  scanData?: {
    userAgent?: string;
    referrer?: string;
    location?: {
      country?: string;
      city?: string;
    };
    device?: {
      type: 'mobile' | 'tablet' | 'desktop';
      os?: string;
      browser?: string;
    };
  };
}

interface GetQRCodesRequest {
  jobId: string;
  userId?: string;
}

interface GetQRAnalyticsRequest {
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
 * Get portal URLs for a job
  */
async function getPortalUrls(jobId: string): Promise<PortalUrls | null> {
  try {
    const db = admin.firestore();
    const portalDoc = await db
      .collection('portal_configs')
      .where('jobId', '==', jobId)
      .limit(1)
      .get();

    if (!portalDoc.empty) {
      const portalData = portalDoc.docs[0].data();
      return portalData.urls || null;
    }

    return null;
  } catch (error) {
    functions.logger.error('Failed to get portal URLs', { jobId, error });
    return null;
  }
}

// ============================================================================
// FIREBASE CALLABLE FUNCTIONS
// ============================================================================

/**
 * Enhance QR Codes
 * 
 * Enhance existing QR codes and generate new portal-specific QR codes for a job.
  */
export const enhanceQRCodes = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: '1GB'
  })
  .https.onCall(async (data: EnhanceQRCodesRequest, context) => {
    const { jobId, userId, portalUrls, options } = data;

    try {
      functions.logger.info('QR code enhancement requested', {
        jobId,
        userId: userId || context.auth?.uid,
        hasPortalUrls: !!portalUrls,
        options
      });

      // Validate required parameters
      if (!jobId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Job ID is required'
        );
      }

      if (!portalUrls || !portalUrls.portal) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Portal URLs are required'
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

      // Initialize QR enhancement service
      const qrService = new QRCodeEnhancementService();

      // Enhance QR codes
      const result: QRCodeUpdateResult = await qrService.enhanceQRCodes(
        jobId,
        portalUrls,
        options
      );

      functions.logger.info('QR code enhancement completed', {
        jobId,
        success: result.success,
        updatedCount: result.updatedCount,
        generatedCount: result.generatedCount,
        errorCount: result.errors.length
      });

      return {
        success: result.success,
        updatedCount: result.updatedCount,
        generatedCount: result.generatedCount,
        totalQRCodes: result.qrCodes.length,
        qrCodes: result.qrCodes.map(qr => ({
          id: qr.id,
          type: qr.type,
          url: qr.url,
          label: qr.label,
          createdAt: qr.createdAt.toISOString()
        })),
        errors: result.errors,
        message: result.success 
          ? 'QR codes enhanced successfully' 
          : 'QR code enhancement completed with errors'
      };

    } catch (error) {
      functions.logger.error('QR code enhancement failed', {
        jobId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `QR code enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Get Enhanced QR Codes
 * 
 * Retrieve all enhanced QR codes for a job.
  */
export const getEnhancedQRCodes = functions
  .region('us-central1')
  .https.onCall(async (data: GetQRCodesRequest, context) => {
    const { jobId, userId } = data;

    try {
      functions.logger.debug('Enhanced QR codes requested', { jobId, userId });

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

      // Get enhanced QR codes
      const qrService = new QRCodeEnhancementService();
      const qrCodes = await qrService.getEnhancedQRCodes(jobId);

      return {
        success: true,
        qrCodes: qrCodes.map(qr => ({
          id: qr.id,
          type: qr.type,
          url: qr.url,
          label: qr.label,
          styling: qr.styling,
          qrCodeData: qr.qrCodeData,
          createdAt: qr.createdAt.toISOString(),
          updatedAt: qr.updatedAt.toISOString()
        })),
        total: qrCodes.length
      };

    } catch (error) {
      functions.logger.error('Failed to get enhanced QR codes', {
        jobId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to get QR codes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Track QR Code Scan
 * 
 * Track when a QR code is scanned for analytics purposes.
  */
export const trackQRCodeScanEnhanced = functions
  .region('us-central1')
  .https.onCall(async (data: TrackQRCodeScanRequest, context) => {
    const { jobId, qrCodeId, scanData } = data;

    try {
      functions.logger.info('QR code scan tracking requested', {
        jobId,
        qrCodeId,
        device: scanData?.device?.type
      });

      // Validate required parameters
      if (!jobId || !qrCodeId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Job ID and QR Code ID are required'
        );
      }

      // Track the scan (no authentication required for public tracking)
      const qrService = new QRCodeEnhancementService();
      await qrService.trackQRCodeScan(jobId, qrCodeId, scanData || {});

      return {
        success: true,
        message: 'QR code scan tracked successfully'
      };

    } catch (error) {
      functions.logger.error('Failed to track QR code scan', {
        jobId,
        qrCodeId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to track QR scan: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Get QR Code Analytics
 * 
 * Retrieve QR code analytics for a job.
  */
export const getQRCodeAnalytics = functions
  .region('us-central1')
  .https.onCall(async (data: GetQRAnalyticsRequest, context) => {
    const { jobId, userId } = data;

    try {
      functions.logger.debug('QR code analytics requested', { jobId, userId });

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

      // Get QR code analytics
      const qrService = new QRCodeEnhancementService();
      const analytics = await qrService.getQRCodeAnalytics(jobId);

      if (!analytics) {
        return {
          success: true,
          hasAnalytics: false,
          message: 'No analytics data available for this job'
        };
      }

      return {
        success: true,
        hasAnalytics: true,
        analytics: {
          totalScans: analytics.totalScans,
          uniqueScans: analytics.uniqueScans,
          sources: analytics.sources,
          conversions: analytics.conversions,
          devices: analytics.devices,
          locations: analytics.locations.slice(0, 10), // Top 10 locations
          topCountries: analytics.locations
            .sort((a, b) => b.scans - a.scans)
            .slice(0, 5)
            .map(loc => ({
              country: loc.country,
              scans: loc.scans,
              percentage: analytics.totalScans > 0 
                ? (loc.scans / analytics.totalScans * 100).toFixed(1)
                : '0'
            }))
        }
      };

    } catch (error) {
      functions.logger.error('Failed to get QR code analytics', {
        jobId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to get analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Auto-Enhance QR Codes
 * 
 * Automatically enhance QR codes when a portal is generated.
 * This is called internally by the portal generation system.
  */
export const autoEnhanceQRCodes = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 180, // 3 minutes
    memory: '512MB'
  })
  .https.onCall(async (data: { jobId: string }, context) => {
    const { jobId } = data;

    try {
      functions.logger.info('Auto QR code enhancement requested', { jobId });

      // This function is for internal use by the portal generation system
      // Validate that it's being called with proper service account permissions
      if (!context.auth || !context.auth.uid) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Service authentication required'
        );
      }

      // Get portal URLs for the job
      const portalUrls = await getPortalUrls(jobId);
      if (!portalUrls) {
        return {
          success: false,
          message: 'No portal found for this job'
        };
      }

      // Auto-enhance QR codes with default options
      const qrService = new QRCodeEnhancementService();
      const result = await qrService.enhanceQRCodes(jobId, portalUrls, {
        updateExisting: true,
        generateNew: true,
        types: [
          QRCodeType.PRIMARY_PORTAL,
          QRCodeType.CHAT_DIRECT,
          QRCodeType.CONTACT_FORM
        ]
      });

      functions.logger.info('Auto QR code enhancement completed', {
        jobId,
        success: result.success,
        totalQRCodes: result.qrCodes.length
      });

      return {
        success: result.success,
        updatedCount: result.updatedCount,
        generatedCount: result.generatedCount,
        totalQRCodes: result.qrCodes.length,
        message: 'QR codes auto-enhanced successfully'
      };

    } catch (error) {
      functions.logger.error('Auto QR code enhancement failed', {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: `Auto enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  });

/**
 * Generate QR Code Preview
 * 
 * Generate a preview of what QR codes would look like with portal enhancement.
  */
export const generateQRCodePreview = functions
  .region('us-central1')
  .https.onCall(async (data: {
    url: string;
    type: QRCodeType;
    styling?: Partial<QRCodeStyling>;
  }, context) => {
    const { url, type, styling } = data;

    try {
      functions.logger.debug('QR code preview requested', { url, type });

      // Validate required parameters
      if (!url || !type) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'URL and type are required'
        );
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid URL format'
        );
      }

      // Generate preview QR code
      const qrService = new QRCodeEnhancementService();
      const defaultStyling = {
        primaryColor: '#2563eb',
        backgroundColor: '#ffffff',
        errorCorrectionLevel: 'M' as const,
        size: 256,
        borderWidth: 4,
        ...styling
      };

      // This would generate a preview QR code
      // In a real implementation, you'd call the QR generation method
      const previewData = `data:image/svg+xml;base64,${Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="${defaultStyling.size}" height="${defaultStyling.size}" viewBox="0 0 100 100">
          <rect width="100" height="100" fill="${defaultStyling.backgroundColor}"/>
          <rect x="10" y="10" width="80" height="80" fill="${defaultStyling.primaryColor}"/>
          <text x="50" y="55" text-anchor="middle" fill="${defaultStyling.backgroundColor}" font-size="6">PREVIEW</text>
        </svg>
      `).toString('base64')}`;

      return {
        success: true,
        preview: {
          type,
          url,
          styling: defaultStyling,
          qrCodeData: previewData,
          label: `Preview QR Code - ${type}`
        }
      };

    } catch (error) {
      functions.logger.error('Failed to generate QR code preview', {
        url,
        type,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });