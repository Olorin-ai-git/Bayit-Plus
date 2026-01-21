// @ts-ignore - Export conflicts/v2/https';
// TODO: Create enhanced-qr.service
// import { EnhancedQRService } from '../services/enhanced-qr.service';
import { logger } from 'firebase-functions';
import { corsOptions } from '../../config/cors';

// const qrService = new EnhancedQRService();

export const generateQRCode = onCall(
  { 
    timeoutSeconds: 60,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, config } = request.data;
      if (!jobId) {
        throw new HttpsError('invalid-argument', 'Job ID is required');
      }

      logger.info(`Generating QR code for job: ${jobId}`);

      const qrCode = await qrService.generateQRCode(jobId, config || {});

      logger.info(`Successfully generated QR code: ${qrCode.id}`);

      return {
        success: true,
        qrCode,
        message: 'QR code generated successfully'
      };
    } catch (error) {
      logger.error('Error generating QR code:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to generate QR code');
    }
  }
);

export const trackQRCodeScan = onCall(
  { 
    timeoutSeconds: 30,
    ...corsOptions
  },
  async (request: CallableRequest) => {
    try {
      const { qrCodeId, scanData } = request.data;
      if (!qrCodeId) {
        throw new HttpsError('invalid-argument', 'QR code ID is required');
      }

      logger.info(`Tracking QR code scan: ${qrCodeId}`);

      // Extract useful information from request
      const enrichedScanData = {
        ...scanData,
        userAgent: request.rawRequest?.headers?.['user-agent'],
        ipAddress: request.rawRequest?.ip,
        timestamp: new Date(),
        sessionId: scanData?.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      await qrService.trackQRScan(qrCodeId, enrichedScanData);

      return {
        success: true,
        message: 'Scan tracked successfully'
      };
    } catch (error) {
      logger.error('Error tracking QR scan:', error);
      
      // Don't throw error for tracking - it should fail silently
      return {
        success: false,
        message: 'Failed to track scan'
      };
    }
  }
);

export const getQRCodes = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId } = request.data;
      if (!jobId) {
        throw new HttpsError('invalid-argument', 'Job ID is required');
      }

      const qrCodes = await qrService.getQRCodes(jobId);

      return {
        success: true,
        qrCodes,
        message: 'QR codes retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting QR codes:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to get QR codes');
    }
  }
);

export const updateQRCode = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, qrCodeId, updates } = request.data;
      if (!jobId || !qrCodeId || !updates) {
        throw new HttpsError('invalid-argument', 'Job ID, QR code ID, and updates are required');
      }

      logger.info(`Updating QR code ${qrCodeId} for job: ${jobId}`);

      await qrService.updateQRCode(jobId, qrCodeId, updates);

      return {
        success: true,
        message: 'QR code updated successfully'
      };
    } catch (error) {
      logger.error('Error updating QR code:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to update QR code');
    }
  }
);

export const deleteQRCode = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, qrCodeId } = request.data;
      if (!jobId || !qrCodeId) {
        throw new HttpsError('invalid-argument', 'Job ID and QR code ID are required');
      }

      logger.info(`Deleting QR code ${qrCodeId} for job: ${jobId}`);

      await qrService.deleteQRCode(jobId, qrCodeId);

      return {
        success: true,
        message: 'QR code deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting QR code:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to delete QR code');
    }
  }
);

export const getQRAnalytics = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, qrCodeId } = request.data;
      if (!jobId) {
        throw new HttpsError('invalid-argument', 'Job ID is required');
      }

      const analytics = await qrService.getQRAnalytics(jobId, qrCodeId);

      return {
        success: true,
        analytics,
        message: 'Analytics retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting QR analytics:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to get analytics');
    }
  }
);

export const getQRTemplates = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      const templates = qrService.getDefaultTemplates();

      return {
        success: true,
        templates,
        message: 'Templates retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting QR templates:', error);
      
      throw new HttpsError('internal', 'Failed to get templates');
    }
  }
);