import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import * as QRCode from 'qrcode';
import { PortalUrls } from '../types/portal';

interface QRCodeTemplate {
  id: string;
  name: string;
  description: string;
  style: {
    foregroundColor: string;
    backgroundColor: string;
    logoUrl?: string;
    margin: number;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
    width: number;
    borderRadius?: number;
    gradientType?: 'linear' | 'radial' | 'none';
    gradientColors?: string[];
  };
  frame?: {
    type: 'none' | 'square' | 'circle' | 'rounded';
    color: string;
    width: number;
  };
  callToAction?: {
    text: string;
    position: 'top' | 'bottom' | 'overlay';
    font: string;
    color: string;
  };
}

interface QRCodeConfig {
  id: string;
  jobId: string;
  type: 'profile' | 'contact' | 'portfolio' | 'resume-download' | 'linkedin' | 'custom' | 'portal-primary' | 'portal-chat' | 'portal-contact' | 'portal-download' | 'portal-menu';
  data: string;
  template: QRCodeTemplate;
  qrImageUrl?: string;
  analytics: {
    totalScans: number;
    uniqueScans: number;
    scansByDate: Record<string, number>;
    scansByLocation: Record<string, number>;
    scansByDevice: Record<string, number>;
    scansBySource: Record<string, number>;
  };
  metadata: {
    title: string;
    description: string;
    tags: string[];
    expiresAt?: Date;
    isActive: boolean;
    trackingEnabled: boolean;
  };
  advanced: {
    dynamicContent: boolean;
    redirectUrl?: string;
    shortUrl?: string;
    passwordProtected: boolean;
    geofencing?: {
      enabled: boolean;
      locations: Array<{
        name: string;
        lat: number;
        lng: number;
        radius: number; // in meters
      }>;
    };
    timeRestrictions?: {
      enabled: boolean;
      activeHours: {
        start: string; // HH:MM format
        end: string;   // HH:MM format
      };
      activeDays: number[]; // 0-6, 0 = Sunday
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface QRScanEvent {
  id: string;
  qrCodeId: string;
  jobId: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country: string;
    city: string;
    lat?: number;
    lng?: number;
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    os: string;
    browser: string;
  };
  referrer?: string;
  sessionId: string;
  isUnique: boolean;
  metadata?: any;
}

export class EnhancedQRService {
  private db = admin.firestore();

  // Predefined QR code templates
  private defaultTemplates: QRCodeTemplate[] = [
    {
      id: 'professional',
      name: 'Professional',
      description: 'Clean, professional design suitable for business use',
      style: {
        foregroundColor: '#1f2937',
        backgroundColor: '#ffffff',
        margin: 2,
        errorCorrectionLevel: 'M',
        width: 256,
        borderRadius: 8,
        gradientType: 'none'
      },
      frame: {
        type: 'square',
        color: '#374151',
        width: 2
      },
      callToAction: {
        text: 'Scan to view CV',
        position: 'bottom',
        font: 'Arial, sans-serif',
        color: '#374151'
      }
    },
    {
      id: 'modern',
      name: 'Modern Gradient',
      description: 'Eye-catching gradient design for creative professionals',
      style: {
        foregroundColor: '#0f172a',
        backgroundColor: '#ffffff',
        margin: 3,
        errorCorrectionLevel: 'M',
        width: 300,
        borderRadius: 12,
        gradientType: 'linear',
        gradientColors: ['#06b6d4', '#3b82f6', '#8b5cf6']
      },
      frame: {
        type: 'rounded',
        color: '#06b6d4',
        width: 3
      },
      callToAction: {
        text: 'View Professional Profile',
        position: 'bottom',
        font: 'system-ui, sans-serif',
        color: '#0f172a'
      }
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple, clean design with minimal distractions',
      style: {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        margin: 1,
        errorCorrectionLevel: 'L',
        width: 200,
        gradientType: 'none'
      },
      callToAction: {
        text: 'Scan QR Code',
        position: 'top',
        font: 'monospace',
        color: '#666666'
      }
    },
    {
      id: 'branded',
      name: 'Branded',
      description: 'Customizable with logo and brand colors',
      style: {
        foregroundColor: '#1e40af',
        backgroundColor: '#f8fafc',
        margin: 4,
        errorCorrectionLevel: 'H', // High for logo compatibility
        width: 320,
        borderRadius: 16
      },
      frame: {
        type: 'circle',
        color: '#1e40af',
        width: 4
      },
      callToAction: {
        text: 'Connect with me',
        position: 'overlay',
        font: 'Inter, sans-serif',
        color: '#1e40af'
      }
    },
    {
      id: 'portal-primary',
      name: 'Portal Primary',
      description: 'Main portal QR code with premium branding',
      style: {
        foregroundColor: '#1e293b',
        backgroundColor: '#ffffff',
        margin: 3,
        errorCorrectionLevel: 'H',
        width: 300,
        borderRadius: 12,
        gradientType: 'linear',
        gradientColors: ['#0ea5e9', '#3b82f6', '#6366f1']
      },
      frame: {
        type: 'rounded',
        color: '#0ea5e9',
        width: 3
      },
      callToAction: {
        text: 'View My Portfolio',
        position: 'bottom',
        font: 'system-ui, sans-serif',
        color: '#1e293b'
      }
    },
    {
      id: 'portal-chat',
      name: 'Chat Direct',
      description: 'Direct access to AI chat functionality',
      style: {
        foregroundColor: '#059669',
        backgroundColor: '#f0fdf4',
        margin: 2,
        errorCorrectionLevel: 'M',
        width: 256,
        borderRadius: 8
      },
      frame: {
        type: 'square',
        color: '#059669',
        width: 2
      },
      callToAction: {
        text: 'Chat with AI',
        position: 'bottom',
        font: 'system-ui, sans-serif',
        color: '#059669'
      }
    },
    {
      id: 'portal-menu',
      name: 'Multi-Purpose Menu',
      description: 'Landing page with multiple options',
      style: {
        foregroundColor: '#7c3aed',
        backgroundColor: '#faf5ff',
        margin: 4,
        errorCorrectionLevel: 'M',
        width: 280,
        borderRadius: 16,
        gradientType: 'radial',
        gradientColors: ['#a855f7', '#7c3aed']
      },
      frame: {
        type: 'circle',
        color: '#7c3aed',
        width: 3
      },
      callToAction: {
        text: 'Explore Options',
        position: 'bottom',
        font: 'Inter, sans-serif',
        color: '#7c3aed'
      }
    },
    {
      id: 'portal-contact',
      name: 'Contact Form Direct',
      description: 'Direct access to contact form',
      style: {
        foregroundColor: '#dc2626',
        backgroundColor: '#fef2f2',
        margin: 2,
        errorCorrectionLevel: 'M',
        width: 240,
        borderRadius: 6
      },
      frame: {
        type: 'square',
        color: '#dc2626',
        width: 2
      },
      callToAction: {
        text: 'Contact Me',
        position: 'bottom',
        font: 'Arial, sans-serif',
        color: '#dc2626'
      }
    },
    {
      id: 'portal-download',
      name: 'CV Download Direct',
      description: 'Direct CV download access',
      style: {
        foregroundColor: '#ea580c',
        backgroundColor: '#fff7ed',
        margin: 2,
        errorCorrectionLevel: 'L',
        width: 220,
        borderRadius: 4
      },
      callToAction: {
        text: 'Download CV',
        position: 'top',
        font: 'monospace',
        color: '#ea580c'
      }
    }
  ];

  async generateQRCode(jobId: string, config: Partial<QRCodeConfig>): Promise<QRCodeConfig> {
    try {
      // Get user profile data for default QR content
      const profileData = await this.getProfileData(jobId);
      
      // Create QR code configuration
      const qrConfig: QRCodeConfig = {
        id: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        jobId,
        type: config.type || 'profile',
        data: config.data || this.generateDefaultData(config.type || 'profile', profileData),
        template: config.template || this.defaultTemplates[0],
        analytics: {
          totalScans: 0,
          uniqueScans: 0,
          scansByDate: {},
          scansByLocation: {},
          scansByDevice: {},
          scansBySource: {}
        },
        metadata: {
          title: config.metadata?.title || `${config.type || 'Profile'} QR Code`,
          description: config.metadata?.description || `QR code for ${profileData.name || 'professional profile'}`,
          tags: config.metadata?.tags || ['cv', 'profile', 'professional'],
          isActive: true,
          trackingEnabled: true,
          ...config.metadata
        },
        advanced: {
          dynamicContent: false,
          passwordProtected: false,
          ...config.advanced
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate the actual QR code image
      const qrImageUrl = await this.createQRImage(qrConfig);
      
      // Store configuration in Firestore
      await this.db.collection('jobs').doc(jobId).collection('qrcodes').doc(qrConfig.id).set({
        ...qrConfig,
        qrImageUrl,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return { ...qrConfig, qrImageUrl };
    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  private async getProfileData(jobId: string): Promise<any> {
    const jobDoc = await this.db.collection('jobs').doc(jobId).get();
    const jobData = jobDoc.data();
    
    return {
      name: jobData?.parsedData?.personalInfo?.name || 'Professional',
      email: jobData?.parsedData?.personalInfo?.email,
      phone: jobData?.parsedData?.personalInfo?.phone,
      website: jobData?.parsedData?.personalInfo?.website,
      linkedin: jobData?.parsedData?.personalInfo?.linkedin,
      profileUrl: `https://cvplus.web.app/profile/${jobId}`
    };
  }

  private generateDefaultData(type: string, profileData: any): string {
    switch (type) {
      case 'profile':
        return profileData.profileUrl || `https://cvplus.web.app/profile/${profileData.jobId}`;
      
      case 'contact':
        const vCard = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${profileData.name || 'Professional'}`,
          profileData.email ? `EMAIL:${profileData.email}` : '',
          profileData.phone ? `TEL:${profileData.phone}` : '',
          profileData.website ? `URL:${profileData.website}` : '',
          'END:VCARD'
        ].filter(line => line).join('\n');
        return vCard;
      
      case 'portfolio':
        return `${profileData.profileUrl}/portfolio`;
      
      case 'resume-download':
        return `${profileData.profileUrl}/download`;
      
      case 'linkedin':
        return profileData.linkedin || `https://linkedin.com/in/${profileData.name?.toLowerCase().replace(' ', '-') || 'professional'}`;
      
      case 'portal-primary':
        return profileData.portalUrl || `${profileData.profileUrl}/portal`;
      
      case 'portal-chat':
        return profileData.chatUrl || `${profileData.profileUrl}/chat`;
      
      case 'portal-contact':
        return profileData.contactUrl || `${profileData.profileUrl}/contact`;
      
      case 'portal-download':
        return profileData.downloadUrl || `${profileData.profileUrl}/download`;
      
      case 'portal-menu':
        return profileData.qrMenuUrl || `${profileData.profileUrl}/menu`;
      
      default:
        return profileData.profileUrl || 'https://cvplus.web.app';
    }
  }

  private async createQRImage(config: QRCodeConfig): Promise<string> {
    try {
      const options = {
        type: 'png' as const,
        quality: 0.92,
        margin: config.template.style.margin,
        color: {
          dark: config.template.style.foregroundColor,
          light: config.template.style.backgroundColor,
        },
        width: config.template.style.width,
        errorCorrectionLevel: config.template.style.errorCorrectionLevel
      };

      // Generate basic QR code
      const qrBuffer = await QRCode.toBuffer(config.data, options);
      
      // Upload to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `qrcodes/${config.jobId}/${config.id}.png`;
      const file = bucket.file(fileName);
      
      await file.save(qrBuffer, {
        metadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000' // 1 year
        }
      });

      // Make file publicly accessible
      await file.makePublic();
      
      // Return public URL
      return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    } catch (error) {
      logger.error('Error creating QR image:', error);
      throw new Error('Failed to create QR code image');
    }
  }

  async trackQRScan(qrCodeId: string, scanData: Partial<QRScanEvent>): Promise<void> {
    try {
      // Find the QR code configuration
      const qrQuery = await this.db.collectionGroup('qrcodes').where('id', '==', qrCodeId).get();
      
      if (qrQuery.empty) {
        throw new Error('QR code not found');
      }

      const qrDoc = qrQuery.docs[0];
      const qrConfig = qrDoc.data() as QRCodeConfig;
      
      // Check if tracking is enabled
      if (!qrConfig.metadata.trackingEnabled || !qrConfig.metadata.isActive) {
        return;
      }

      // Create scan event
      const scanEvent: QRScanEvent = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        qrCodeId,
        jobId: qrConfig.jobId,
        timestamp: new Date(),
        sessionId: scanData.sessionId || `session-${Date.now()}`,
        isUnique: false, // Will be determined below
        device: scanData.device || {
          type: 'unknown',
          os: 'unknown',
          browser: 'unknown'
        },
        ...scanData
      };

      // Determine if this is a unique scan
      const existingScans = await this.db
        .collection('jobs')
        .doc(qrConfig.jobId)
        .collection('qrcodes')
        .doc(qrCodeId)
        .collection('scans')
        .where('sessionId', '==', scanEvent.sessionId)
        .get();

      scanEvent.isUnique = existingScans.empty;

      // Store scan event
      await this.db
        .collection('jobs')
        .doc(qrConfig.jobId)
        .collection('qrcodes')
        .doc(qrCodeId)
        .collection('scans')
        .doc(scanEvent.id)
        .set({
          ...scanEvent,
          timestamp: FieldValue.serverTimestamp()
        });

      // Update analytics
      await this.updateQRAnalytics(qrCodeId, scanEvent);

    } catch (error) {
      logger.error('Error tracking QR scan:', error);
      // Don't throw error - tracking should fail silently
    }
  }

  private async updateQRAnalytics(qrCodeId: string, scanEvent: QRScanEvent): Promise<void> {
    const qrQuery = await this.db.collectionGroup('qrcodes').where('id', '==', qrCodeId).get();
    
    if (qrQuery.empty) return;

    const qrDoc = qrQuery.docs[0];
    const qrRef = qrDoc.ref;
    
    const dateKey = scanEvent.timestamp.toISOString().split('T')[0];
    const locationKey = scanEvent.location?.country || 'unknown';
    const deviceKey = scanEvent.device.type;
    const sourceKey = scanEvent.referrer || 'direct';

    // Update analytics atomically
    await this.db.runTransaction(async (transaction) => {
      const qrDoc = await transaction.get(qrRef);
      const qrData = qrDoc.data() as QRCodeConfig;
      
      const analytics = qrData.analytics;
      
      // Update counters
      analytics.totalScans += 1;
      if (scanEvent.isUnique) {
        analytics.uniqueScans += 1;
      }
      
      // Update breakdowns
      analytics.scansByDate[dateKey] = (analytics.scansByDate[dateKey] || 0) + 1;
      analytics.scansByLocation[locationKey] = (analytics.scansByLocation[locationKey] || 0) + 1;
      analytics.scansByDevice[deviceKey] = (analytics.scansByDevice[deviceKey] || 0) + 1;
      analytics.scansBySource[sourceKey] = (analytics.scansBySource[sourceKey] || 0) + 1;
      
      transaction.update(qrRef, {
        analytics,
        updatedAt: FieldValue.serverTimestamp()
      });
    });
  }

  async getQRCodes(jobId: string): Promise<QRCodeConfig[]> {
    const qrCodesSnapshot = await this.db
      .collection('jobs')
      .doc(jobId)
      .collection('qrcodes')
      .orderBy('createdAt', 'desc')
      .get();

    return qrCodesSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as QRCodeConfig[];
  }

  async updateQRCode(jobId: string, qrCodeId: string, updates: Partial<QRCodeConfig>): Promise<void> {
    const qrRef = this.db.collection('jobs').doc(jobId).collection('qrcodes').doc(qrCodeId);
    
    // If template or data changed, regenerate image
    if (updates.template || updates.data) {
      const currentDoc = await qrRef.get();
      const currentData = currentDoc.data() as QRCodeConfig;
      
      const updatedConfig = { ...currentData, ...updates };
      const newImageUrl = await this.createQRImage(updatedConfig);
      updates.qrImageUrl = newImageUrl;
    }

    await qrRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  async deleteQRCode(jobId: string, qrCodeId: string): Promise<void> {
    // Delete the QR code document and all scan events
    const qrRef = this.db.collection('jobs').doc(jobId).collection('qrcodes').doc(qrCodeId);
    
    // Delete all scan events
    const scansSnapshot = await qrRef.collection('scans').get();
    const batch = this.db.batch();
    
    scansSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete the QR code itself
    batch.delete(qrRef);
    
    await batch.commit();
  }

  async getQRAnalytics(jobId: string, qrCodeId?: string): Promise<any> {
    if (qrCodeId) {
      // Get analytics for specific QR code
      const qrDoc = await this.db
        .collection('jobs')
        .doc(jobId)
        .collection('qrcodes')
        .doc(qrCodeId)
        .get();
      
      if (!qrDoc.exists) {
        throw new Error('QR code not found');
      }
      
      const qrData = qrDoc.data() as QRCodeConfig;
      return qrData.analytics;
    } else {
      // Get aggregate analytics for all QR codes
      const qrCodesSnapshot = await this.db
        .collection('jobs')
        .doc(jobId)
        .collection('qrcodes')
        .get();
      
      const aggregatedAnalytics = {
        totalScans: 0,
        uniqueScans: 0,
        scansByDate: {} as Record<string, number>,
        scansByLocation: {} as Record<string, number>,
        scansByDevice: {} as Record<string, number>,
        scansBySource: {} as Record<string, number>,
        totalQRCodes: qrCodesSnapshot.size,
        activeQRCodes: 0
      };
      
      qrCodesSnapshot.docs.forEach(doc => {
        const qrData = doc.data() as QRCodeConfig;
        
        if (qrData.metadata.isActive) {
          aggregatedAnalytics.activeQRCodes += 1;
        }
        
        const analytics = qrData.analytics;
        aggregatedAnalytics.totalScans += analytics.totalScans;
        aggregatedAnalytics.uniqueScans += analytics.uniqueScans;
        
        // Merge breakdowns
        Object.entries(analytics.scansByDate).forEach(([date, count]) => {
          aggregatedAnalytics.scansByDate[date] = (aggregatedAnalytics.scansByDate[date] || 0) + count;
        });
        
        Object.entries(analytics.scansByLocation).forEach(([location, count]) => {
          aggregatedAnalytics.scansByLocation[location] = (aggregatedAnalytics.scansByLocation[location] || 0) + count;
        });
        
        Object.entries(analytics.scansByDevice).forEach(([device, count]) => {
          aggregatedAnalytics.scansByDevice[device] = (aggregatedAnalytics.scansByDevice[device] || 0) + count;
        });
        
        Object.entries(analytics.scansBySource).forEach(([source, count]) => {
          aggregatedAnalytics.scansBySource[source] = (aggregatedAnalytics.scansBySource[source] || 0) + count;
        });
      });
      
      return aggregatedAnalytics;
    }
  }

  getDefaultTemplates(): QRCodeTemplate[] {
    return this.defaultTemplates;
  }

  // ============================================================================
  // PORTAL INTEGRATION METHODS
  // ============================================================================

  /**
   * Generate a complete set of QR codes for portal integration
   * Creates QR codes for all portal features (main, chat, contact, download, menu)
    */
  async generatePortalQRCodes(jobId: string, portalURLs: PortalUrls): Promise<QRCodeConfig[]> {
    try {
      logger.info(`Generating portal QR codes for job ${jobId}`);
      
      const qrCodes: QRCodeConfig[] = [];
      const portalTemplates = this.getPortalTemplates();
      
      // Generate QR code for each portal URL
      const qrConfigs = [
        {
          type: 'portal-primary' as const,
          data: portalURLs.portal,
          template: portalTemplates.find(t => t.id === 'portal-primary')!,
          metadata: {
            title: 'Main Portfolio Portal',
            description: 'Access to complete professional portfolio',
            tags: ['portal', 'portfolio', 'main'],
            isActive: true,
            trackingEnabled: true
          }
        },
        {
          type: 'portal-chat' as const,
          data: portalURLs.chat,
          template: portalTemplates.find(t => t.id === 'portal-chat')!,
          metadata: {
            title: 'AI Chat Access',
            description: 'Direct access to AI-powered chat',
            tags: ['portal', 'chat', 'ai'],
            isActive: true,
            trackingEnabled: true
          }
        },
        {
          type: 'portal-contact' as const,
          data: portalURLs.contact,
          template: portalTemplates.find(t => t.id === 'portal-contact')!,
          metadata: {
            title: 'Contact Form',
            description: 'Direct access to contact form',
            tags: ['portal', 'contact', 'form'],
            isActive: true,
            trackingEnabled: true
          }
        },
        {
          type: 'portal-download' as const,
          data: portalURLs.download,
          template: portalTemplates.find(t => t.id === 'portal-download')!,
          metadata: {
            title: 'CV Download',
            description: 'Direct CV download access',
            tags: ['portal', 'download', 'cv'],
            isActive: true,
            trackingEnabled: true
          }
        },
        {
          type: 'portal-menu' as const,
          data: portalURLs.qrMenu,
          template: portalTemplates.find(t => t.id === 'portal-menu')!,
          metadata: {
            title: 'Options Menu',
            description: 'Landing page with multiple options',
            tags: ['portal', 'menu', 'options'],
            isActive: true,
            trackingEnabled: true
          }
        }
      ];
      
      // Generate each QR code
      for (const config of qrConfigs) {
        const qrCode = await this.generateQRCode(jobId, config);
        qrCodes.push(qrCode);
      }
      
      logger.info(`Successfully generated ${qrCodes.length} portal QR codes for job ${jobId}`);
      return qrCodes;
      
    } catch (error) {
      logger.error('Error generating portal QR codes:', error);
      throw new Error('Failed to generate portal QR codes');
    }
  }

  /**
   * Update existing QR codes to point to portal URLs
   * Maintains existing QR code IDs but updates their target URLs
    */
  async updateExistingQRCodesToPortal(jobId: string, portalURLs: PortalUrls): Promise<void> {
    try {
      logger.info(`Updating existing QR codes to portal URLs for job ${jobId}`);
      
      // Get all existing QR codes for the job
      const existingQRCodes = await this.getQRCodes(jobId);
      
      // Map existing QR code types to portal URLs
      const typeUrlMapping: Record<string, string> = {
        'profile': portalURLs.portal,
        'portfolio': portalURLs.portal,
        'contact': portalURLs.contact,
        'resume-download': portalURLs.download,
        'custom': portalURLs.qrMenu
      };
      
      // Update each QR code
      for (const qrCode of existingQRCodes) {
        const newUrl = typeUrlMapping[qrCode.type];
        if (newUrl && newUrl !== qrCode.data) {
          await this.updateQRCode(jobId, qrCode.id, {
            data: newUrl,
            metadata: {
              ...qrCode.metadata,
              description: `${qrCode.metadata.description} (Updated for portal)`,
              tags: [...qrCode.metadata.tags, 'portal']
            }
          });
          
          logger.info(`Updated QR code ${qrCode.id} (${qrCode.type}) to point to portal`);
        }
      }
      
      logger.info(`Successfully updated existing QR codes for job ${jobId}`);
      
    } catch (error) {
      logger.error('Error updating existing QR codes to portal:', error);
      throw new Error('Failed to update existing QR codes to portal');
    }
  }

  /**
   * Create a complete QR code set for different portal features
   * Returns configuration objects without saving to database
    */
  async createPortalQRCodeSet(portalURLs: PortalUrls): Promise<Partial<QRCodeConfig>[]> {
    try {
      const portalTemplates = this.getPortalTemplates();
      
      return [
        {
          type: 'portal-primary' as const,
          data: portalURLs.portal,
          template: portalTemplates.find(t => t.id === 'portal-primary')!,
          metadata: {
            title: 'Main Portfolio Portal',
            description: 'Complete professional portfolio access',
            tags: ['portal', 'portfolio', 'primary'],
            isActive: true,
            trackingEnabled: true
          }
        },
        {
          type: 'portal-chat' as const,
          data: portalURLs.chat,
          template: portalTemplates.find(t => t.id === 'portal-chat')!,
          metadata: {
            title: 'AI Chat Direct',
            description: 'Instant access to AI-powered conversation',
            tags: ['portal', 'chat', 'ai', 'direct'],
            isActive: true,
            trackingEnabled: true
          }
        },
        {
          type: 'portal-contact' as const,
          data: portalURLs.contact,
          template: portalTemplates.find(t => t.id === 'portal-contact')!,
          metadata: {
            title: 'Contact Form Direct',
            description: 'Quick access to contact form',
            tags: ['portal', 'contact', 'form', 'direct'],
            isActive: true,
            trackingEnabled: true
          }
        },
        {
          type: 'portal-download' as const,
          data: portalURLs.download,
          template: portalTemplates.find(t => t.id === 'portal-download')!,
          metadata: {
            title: 'CV Download Direct',
            description: 'Immediate CV download access',
            tags: ['portal', 'download', 'cv', 'direct'],
            isActive: true,
            trackingEnabled: true
          }
        },
        {
          type: 'portal-menu' as const,
          data: portalURLs.qrMenu,
          template: portalTemplates.find(t => t.id === 'portal-menu')!,
          metadata: {
            title: 'Multi-Purpose Menu',
            description: 'Landing page with all available options',
            tags: ['portal', 'menu', 'options', 'landing'],
            isActive: true,
            trackingEnabled: true
          }
        }
      ];
      
    } catch (error) {
      logger.error('Error creating portal QR code set:', error);
      throw new Error('Failed to create portal QR code set');
    }
  }

  /**
   * Get portal-specific QR code templates
   * Returns templates optimized for portal features
    */
  getPortalTemplates(): QRCodeTemplate[] {
    return this.defaultTemplates.filter(template => 
      template.id.startsWith('portal-') || 
      ['professional', 'modern', 'branded'].includes(template.id)
    );
  }

  /**
   * Generate QR codes with portal-optimized analytics tracking
   * Includes enhanced tracking for portal-specific metrics
    */
  async generatePortalQRWithAnalytics(jobId: string, portalURLs: PortalUrls, trackingOptions?: {
    enableGeofencing?: boolean;
    enableTimeRestrictions?: boolean;
    customTags?: string[];
  }): Promise<QRCodeConfig[]> {
    try {
      const qrCodeConfigs = await this.createPortalQRCodeSet(portalURLs);
      const enhancedQRCodes: QRCodeConfig[] = [];
      
      for (const config of qrCodeConfigs) {
        // Enhance with portal-specific tracking
        const enhancedConfig: Partial<QRCodeConfig> = {
          ...config,
          metadata: {
            ...config.metadata,
            tags: [...(config.metadata?.tags || []), ...(trackingOptions?.customTags || [])]
          },
          advanced: {
            dynamicContent: true,
            passwordProtected: false,
            geofencing: trackingOptions?.enableGeofencing ? {
              enabled: true,
              locations: [] // Can be configured per use case
            } : undefined,
            timeRestrictions: trackingOptions?.enableTimeRestrictions ? {
              enabled: true,
              activeHours: {
                start: '00:00',
                end: '23:59'
              },
              activeDays: [0, 1, 2, 3, 4, 5, 6] // All days active
            } : undefined
          }
        };
        
        const qrCode = await this.generateQRCode(jobId, enhancedConfig);
        enhancedQRCodes.push(qrCode);
      }
      
      return enhancedQRCodes;
      
    } catch (error) {
      logger.error('Error generating portal QR codes with analytics:', error);
      throw new Error('Failed to generate portal QR codes with enhanced analytics');
    }
  }

  /**
   * Batch update multiple QR codes for portal migration
   * Efficiently updates multiple QR codes to point to portal URLs
    */
  async batchUpdateQRCodesForPortal(jobId: string, portalURLs: PortalUrls, qrCodeIds: string[]): Promise<void> {
    try {
      logger.info(`Batch updating ${qrCodeIds.length} QR codes for portal migration`);
      
      const batch = this.db.batch();
      const timestamp = FieldValue.serverTimestamp();
      
      for (const qrCodeId of qrCodeIds) {
        const qrRef = this.db.collection('jobs').doc(jobId).collection('qrcodes').doc(qrCodeId);
        
        // Get current QR code to determine appropriate portal URL
        const qrDoc = await qrRef.get();
        if (!qrDoc.exists) continue;
        
        const qrData = qrDoc.data() as QRCodeConfig;
        let newUrl: string;
        
        // Map existing type to appropriate portal URL
        switch (qrData.type) {
          case 'profile':
          case 'portfolio':
            newUrl = portalURLs.portal;
            break;
          case 'contact':
            newUrl = portalURLs.contact;
            break;
          case 'resume-download':
            newUrl = portalURLs.download;
            break;
          default:
            newUrl = portalURLs.qrMenu;
        }
        
        batch.update(qrRef, {
          data: newUrl,
          'metadata.tags': FieldValue.arrayUnion('portal'),
          'metadata.description': `${qrData.metadata.description} (Portal-enabled)`,
          updatedAt: timestamp
        });
      }
      
      await batch.commit();
      logger.info(`Successfully batch updated ${qrCodeIds.length} QR codes for portal`);
      
    } catch (error) {
      logger.error('Error in batch update for portal:', error);
      throw new Error('Failed to batch update QR codes for portal');
    }
  }
}