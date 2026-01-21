// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * QR Code Enhancement Service
 * 
 * Enhances existing QR codes to support portal functionality and creates portal-specific QR codes.
 * Integrates with the existing QR code system while adding portal capabilities.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 * @version 1.0
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { 
  QRCodeType, 
  QRCodeStyling, 
  PortalUrls,
  QRCodeAnalytics 
} from '../types/portal';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface QRCodeEnhancementOptions {
  updateExisting: boolean;
  generateNew: boolean;
  types: QRCodeType[];
  styling: QRCodeStyling;
  portalUrls: PortalUrls;
}

interface EnhancedQRCode {
  id: string;
  type: QRCodeType;
  url: string;
  label: string;
  styling: QRCodeStyling;
  qrCodeData: string; // Base64 encoded QR code image
  createdAt: Date;
  updatedAt: Date;
}

interface QRCodeUpdateResult {
  success: boolean;
  updatedCount: number;
  generatedCount: number;
  qrCodes: EnhancedQRCode[];
  errors: string[];
}

// ============================================================================
// QR CODE ENHANCEMENT SERVICE
// ============================================================================

export class QRCodeEnhancementService {
  private db: admin.firestore.Firestore;
  private logger: any;

  constructor() {
    this.db = admin.firestore();
    this.logger = functions.logger;
  }

  /**
   * Enhance QR codes for a job with portal integration
   */
  async enhanceQRCodes(
    jobId: string,
    portalUrls: PortalUrls,
    options: Partial<QRCodeEnhancementOptions> = {}
  ): Promise<QRCodeUpdateResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting QR code enhancement', {
        jobId,
        hasPortalUrls: !!portalUrls,
        options
      });

      const enhancementOptions: QRCodeEnhancementOptions = {
        updateExisting: true,
        generateNew: true,
        types: [
          QRCodeType.PRIMARY_PORTAL,
          QRCodeType.CHAT_DIRECT,
          QRCodeType.CONTACT_FORM
        ],
        styling: this.getDefaultStyling(),
        portalUrls,
        ...options
      };

      let updatedCount = 0;
      let generatedCount = 0;
      const qrCodes: EnhancedQRCode[] = [];
      const errors: string[] = [];

      // Update existing QR codes if requested
      if (enhancementOptions.updateExisting) {
        try {
          const updateResult = await this.updateExistingQRCodes(jobId, portalUrls);
          updatedCount = updateResult.count;
          qrCodes.push(...updateResult.qrCodes);
        } catch (error) {
          const errorMsg = `Failed to update existing QR codes: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg, { jobId, error });
        }
      }

      // Generate new portal-specific QR codes if requested
      if (enhancementOptions.generateNew) {
        try {
          const generateResult = await this.generatePortalQRCodes(
            jobId,
            enhancementOptions.types,
            portalUrls,
            enhancementOptions.styling
          );
          generatedCount = generateResult.count;
          qrCodes.push(...generateResult.qrCodes);
        } catch (error) {
          const errorMsg = `Failed to generate new QR codes: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg, { jobId, error });
        }
      }

      // Save enhanced QR codes to database
      if (qrCodes.length > 0) {
        await this.saveEnhancedQRCodes(jobId, qrCodes);
      }

      const result: QRCodeUpdateResult = {
        success: errors.length === 0 || qrCodes.length > 0,
        updatedCount,
        generatedCount,
        qrCodes,
        errors
      };

      this.logger.info('QR code enhancement completed', {
        jobId,
        processingTimeMs: Date.now() - startTime,
        result: {
          success: result.success,
          updatedCount: result.updatedCount,
          generatedCount: result.generatedCount,
          totalQRCodes: result.qrCodes.length,
          errorCount: result.errors.length
        }
      });

      return result;

    } catch (error) {
      this.logger.error('QR code enhancement failed', {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        updatedCount: 0,
        generatedCount: 0,
        qrCodes: [],
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  /**
   * Update existing QR codes to point to portal
   */
  private async updateExistingQRCodes(
    jobId: string,
    portalUrls: PortalUrls
  ): Promise<{ count: number; qrCodes: EnhancedQRCode[] }> {
    try {
      // Get existing QR codes for the job
      const existingQRCodes = await this.getExistingQRCodes(jobId);
      const updatedQRCodes: EnhancedQRCode[] = [];

      for (const existingQR of existingQRCodes) {
        // Determine which portal URL to use based on QR code context
        let newUrl = portalUrls.portal; // Default to main portal

        // Update URL based on QR code purpose
        if (existingQR.metadata?.purpose === 'contact') {
          newUrl = portalUrls.contact || portalUrls.portal;
        } else if (existingQR.metadata?.purpose === 'chat') {
          newUrl = portalUrls.chat || portalUrls.portal;
        }

        // Generate new QR code with portal URL
        const enhancedQR = await this.generateQRCodeData(
          newUrl,
          `${existingQR.label} - Enhanced with Portal`,
          QRCodeType.PRIMARY_PORTAL,
          this.getDefaultStyling()
        );

        updatedQRCodes.push(enhancedQR);
      }

      return {
        count: updatedQRCodes.length,
        qrCodes: updatedQRCodes
      };
    } catch (error) {
      this.logger.error('Failed to update existing QR codes', { jobId, error });
      throw error;
    }
  }

  /**
   * Generate new portal-specific QR codes
   */
  private async generatePortalQRCodes(
    jobId: string,
    types: QRCodeType[],
    portalUrls: PortalUrls,
    styling: QRCodeStyling
  ): Promise<{ count: number; qrCodes: EnhancedQRCode[] }> {
    const qrCodes: EnhancedQRCode[] = [];

    for (const type of types) {
      try {
        const qrConfig = this.getQRConfigForType(type, portalUrls);
        if (!qrConfig.url) {
          this.logger.warn(`No URL available for QR type ${type}`, { jobId });
          continue;
        }

        const qrCode = await this.generateQRCodeData(
          qrConfig.url,
          qrConfig.label,
          type,
          styling
        );

        qrCodes.push(qrCode);
      } catch (error) {
        this.logger.error(`Failed to generate QR code for type ${type}`, {
          jobId,
          type,
          error
        });
      }
    }

    return {
      count: qrCodes.length,
      qrCodes
    };
  }

  /**
   * Get QR configuration for specific type
   */
  private getQRConfigForType(type: QRCodeType, portalUrls: PortalUrls): {
    url: string;
    label: string;
  } {
    switch (type) {
      case QRCodeType.PRIMARY_PORTAL:
        return {
          url: portalUrls.portal,
          label: 'Visit My Professional Portal'
        };
      case QRCodeType.CHAT_DIRECT:
        return {
          url: portalUrls.chat,
          label: 'Chat with AI Assistant'
        };
      case QRCodeType.CONTACT_FORM:
        return {
          url: portalUrls.contact,
          label: 'Send Me a Message'
        };
      case QRCodeType.CV_DOWNLOAD:
        return {
          url: portalUrls.download,
          label: 'Download CV'
        };
      case QRCodeType.MULTI_PURPOSE_MENU:
        return {
          url: portalUrls.qrMenu,
          label: 'Professional Menu'
        };
      default:
        return {
          url: portalUrls.portal,
          label: 'Professional Portal'
        };
    }
  }

  /**
   * Generate QR code data (placeholder implementation)
   */
  private async generateQRCodeData(
    url: string,
    label: string,
    type: QRCodeType,
    styling: QRCodeStyling
  ): Promise<EnhancedQRCode> {
    // In a real implementation, this would use a QR code library like qrcode
    // For now, we'll create a placeholder structure
    
    const qrCodeData = await this.createQRCodeImage(url, styling);
    
    return {
      id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      url,
      label,
      styling,
      qrCodeData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create QR code image (placeholder implementation)
   */
  private async createQRCodeImage(url: string, styling: QRCodeStyling): Promise<string> {
    // This is a placeholder. In a real implementation, you would:
    // 1. Use a QR code library like 'qrcode' or 'qr-image'
    // 2. Generate the actual QR code with the styling options
    // 3. Return the base64 encoded image data
    
    const placeholderQRData = `data:image/svg+xml;base64,${Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${styling.size}" height="${styling.size}" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="${styling.backgroundColor}"/>
        <rect x="10" y="10" width="80" height="80" fill="${styling.primaryColor}"/>
        <text x="50" y="55" text-anchor="middle" fill="${styling.backgroundColor}" font-size="8">QR</text>
      </svg>
    `).toString('base64')}`;

    return placeholderQRData;
  }

  /**
   * Get existing QR codes for a job
   */
  private async getExistingQRCodes(jobId: string): Promise<any[]> {
    try {
      const qrCodeDoc = await this.db
        .collection('qr_codes')
        .doc(jobId)
        .get();

      if (qrCodeDoc.exists) {
        const data = qrCodeDoc.data()!;
        return data.qrCodes || [];
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to get existing QR codes', { jobId, error });
      return [];
    }
  }

  /**
   * Save enhanced QR codes to database
   */
  private async saveEnhancedQRCodes(
    jobId: string,
    qrCodes: EnhancedQRCode[]
  ): Promise<void> {
    try {
      await this.db
        .collection('enhanced_qr_codes')
        .doc(jobId)
        .set({
          jobId,
          qrCodes,
          enhancedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      this.logger.info('Enhanced QR codes saved successfully', {
        jobId,
        qrCodeCount: qrCodes.length
      });
    } catch (error) {
      this.logger.error('Failed to save enhanced QR codes', { jobId, error });
      throw error;
    }
  }

  /**
   * Get default QR code styling
   */
  private getDefaultStyling(): QRCodeStyling {
    return {
      primaryColor: '#2563eb',
      backgroundColor: '#ffffff',
      logo: undefined, // Could be CVPlus logo
      errorCorrectionLevel: 'M',
      size: 256,
      borderWidth: 4,
      margin: 10
    };
  }

  /**
   * Get enhanced QR codes for a job
   */
  async getEnhancedQRCodes(jobId: string): Promise<EnhancedQRCode[]> {
    try {
      const qrCodeDoc = await this.db
        .collection('enhanced_qr_codes')
        .doc(jobId)
        .get();

      if (qrCodeDoc.exists) {
        const data = qrCodeDoc.data()!;
        return data.qrCodes || [];
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to get enhanced QR codes', { jobId, error });
      return [];
    }
  }

  /**
   * Track QR code scan
   */
  async trackQRCodeScan(
    jobId: string,
    qrCodeId: string,
    scanData: {
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
    }
  ): Promise<void> {
    try {
      const scanRecord = {
        jobId,
        qrCodeId,
        scannedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...scanData
      };

      // Save scan record
      await this.db
        .collection('qr_code_scans')
        .add(scanRecord);

      // Update scan count in QR code analytics
      await this.updateQRCodeAnalytics(jobId, qrCodeId, scanData);

      this.logger.info('QR code scan tracked', {
        jobId,
        qrCodeId,
        device: scanData.device?.type
      });
    } catch (error) {
      this.logger.error('Failed to track QR code scan', {
        jobId,
        qrCodeId,
        error
      });
    }
  }

  /**
   * Update QR code analytics
   */
  private async updateQRCodeAnalytics(
    jobId: string,
    qrCodeId: string,
    scanData: any
  ): Promise<void> {
    try {
      const analyticsRef = this.db
        .collection('qr_code_analytics')
        .doc(jobId);

      await this.db.runTransaction(async (transaction) => {
        const analyticsDoc = await transaction.get(analyticsRef);
        
        let analytics: QRCodeAnalytics;
        if (analyticsDoc.exists) {
          analytics = analyticsDoc.data() as QRCodeAnalytics;
        } else {
          analytics = {
            totalScans: 0,
            uniqueScans: 0,
            sources: {
              primary: 0,
              chat: 0,
              contact: 0,
              menu: 0
            },
            conversions: {
              scanToView: 0,
              scanToChat: 0,
              scanToContact: 0
            },
            devices: {
              mobile: 0,
              tablet: 0,
              desktop: 0
            },
            locations: []
          };
        }

        // Update scan counts
        analytics.totalScans++;
        
        // Update device stats
        if (scanData.device?.type) {
          analytics.devices[scanData.device.type]++;
        }

        // Update location stats
        if (scanData.location?.country) {
          const existingLocation = analytics.locations.find(
            loc => loc.country === scanData.location!.country
          );
          
          if (existingLocation) {
            existingLocation.scans++;
          } else {
            analytics.locations.push({
              country: scanData.location.country,
              city: scanData.location.city,
              scans: 1
            });
          }
        }

        transaction.set(analyticsRef, {
          ...analytics,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
    } catch (error) {
      this.logger.error('Failed to update QR code analytics', {
        jobId,
        qrCodeId,
        error
      });
    }
  }

  /**
   * Get QR code analytics for a job
   */
  async getQRCodeAnalytics(jobId: string): Promise<QRCodeAnalytics | null> {
    try {
      const analyticsDoc = await this.db
        .collection('qr_code_analytics')
        .doc(jobId)
        .get();

      if (analyticsDoc.exists) {
        return analyticsDoc.data() as QRCodeAnalytics;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get QR code analytics', { jobId, error });
      return null;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { QRCodeEnhancementOptions, EnhancedQRCode, QRCodeUpdateResult };