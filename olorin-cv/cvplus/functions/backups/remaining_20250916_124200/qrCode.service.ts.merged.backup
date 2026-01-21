// @ts-ignore - Export conflicts/**
 * Advanced QR Code Service
 * Handles QR code generation with branding and analytics
 * Author: Gil Klainert
 * Date: 2025-08-22
 */

import * as admin from 'firebase-admin';
import * as QRCode from 'qrcode';
import sharp from 'sharp';

interface QRCodeOptions {
  userId: string;
  type: 'profile' | 'vcard' | 'portfolio' | 'contact';
  data: string;
  branding?: {
    logo?: string;
    color?: string;
    backgroundColor?: string;
  };
  tracking?: boolean;
}

interface QRAnalytics {
  qrId: string;
  scans: number;
  uniqueScans: number;
  locations: Array<{ country: string; count: number }>;
  devices: Array<{ type: string; count: number }>;
  lastScanned?: Date;
}

interface VCard {
  firstName: string;
  lastName: string;
  organization?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

export class QRCodeService {
  private db = admin.firestore();
  private storage = admin.storage();

  /**
   * Generate QR code with custom branding
   */
  async generateQRCode(options: QRCodeOptions): Promise<string> {
    try {
      // Generate unique QR ID for tracking
      const qrId = this.generateQRId();
      
      // Create tracking URL if enabled
      let qrData = options.data;
      if (options.tracking) {
        qrData = `https://cvplus-app.web.app/qr/${qrId}`;
        await this.createQRTracking(qrId, options);
      }

      // Generate base QR code
      const qrOptions = {
        type: 'png' as const,
        width: 512,
        margin: 2,
        color: {
          dark: options.branding?.color || '#000000',
          light: options.branding?.backgroundColor || '#FFFFFF'
        },
        errorCorrectionLevel: 'H' as const
      };

      const qrBuffer = await QRCode.toBuffer(qrData, qrOptions);

      // Add logo if provided
      let finalBuffer = qrBuffer;
      if (options.branding?.logo) {
        finalBuffer = await this.addLogoToQR(qrBuffer, options.branding.logo);
      }

      // Upload to storage
      const fileName = `qr-codes/${options.userId}/${qrId}.png`;
      const file = this.storage.bucket().file(fileName);
      await file.save(finalBuffer, {
        metadata: {
          contentType: 'image/png',
          metadata: {
            userId: options.userId,
            type: options.type,
            qrId
          }
        }
      });

      // Get public URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2030'
      });

      // Store QR code info in database
      await this.db.collection('qr_codes').doc(qrId).set({
        userId: options.userId,
        type: options.type,
        url,
        data: options.data,
        tracking: options.tracking || false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return url;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Add logo to QR code center
   */
  private async addLogoToQR(qrBuffer: Buffer, logoUrl: string): Promise<Buffer> {
    try {
      // Download logo
      const axios = require('axios');
      const logoResponse = await axios.get(logoUrl, { responseType: 'arraybuffer' });
      const logoBuffer = Buffer.from(logoResponse.data);

      // Resize logo to fit QR code center
      const logo = await sharp(logoBuffer)
        .resize(100, 100, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toBuffer();

      // Composite logo onto QR code
      const composited = await sharp(qrBuffer)
        .composite([{
          input: logo,
          top: 206,  // Center position
          left: 206
        }])
        .toBuffer();

      return composited;
    } catch (error) {
      console.error('Error adding logo to QR:', error);
      return qrBuffer; // Return original if logo fails
    }
  }

  /**
   * Generate vCard data
   */
  generateVCard(vcard: VCard): string {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${vcard.firstName} ${vcard.lastName}`,
      `N:${vcard.lastName};${vcard.firstName};;;`
    ];

    if (vcard.organization) lines.push(`ORG:${vcard.organization}`);
    if (vcard.title) lines.push(`TITLE:${vcard.title}`);
    if (vcard.email) lines.push(`EMAIL:${vcard.email}`);
    if (vcard.phone) lines.push(`TEL:${vcard.phone}`);
    if (vcard.website) lines.push(`URL:${vcard.website}`);
    
    if (vcard.address) {
      const addr = vcard.address;
      lines.push(`ADR:;;${addr.street || ''};${addr.city || ''};${addr.state || ''};${addr.zip || ''};${addr.country || ''}`);
    }

    lines.push('END:VCARD');
    return lines.join('\n');
  }

  /**
   * Create QR tracking entry
   */
  private async createQRTracking(qrId: string, options: QRCodeOptions): Promise<void> {
    await this.db.collection('qr_tracking').doc(qrId).set({
      userId: options.userId,
      type: options.type,
      originalData: options.data,
      scans: 0,
      uniqueScans: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  /**
   * Track QR code scan
   */
  async trackQRScan(
    qrId: string,
    metadata: {
      ip?: string;
      userAgent?: string;
      referer?: string;
    }
  ): Promise<string> {
    try {
      // Get QR code data
      const qrDoc = await this.db.collection('qr_codes').doc(qrId).get();
      if (!qrDoc.exists) {
        throw new Error('QR code not found');
      }

      const qrData = qrDoc.data();

      // Record scan
      await this.db.collection('qr_scans').add({
        qrId,
        userId: qrData?.userId,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        referer: metadata.referer,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update scan count
      await this.db.collection('qr_tracking').doc(qrId).update({
        scans: admin.firestore.FieldValue.increment(1),
        lastScanned: admin.firestore.FieldValue.serverTimestamp()
      });

      // Return original URL
      return qrData?.data || 'https://cvplus-app.web.app';
    } catch (error) {
      console.error('Error tracking QR scan:', error);
      throw error;
    }
  }

  /**
   * Get QR code analytics
   */
  async getQRAnalytics(userId: string, qrId?: string): Promise<QRAnalytics[]> {
    let query = this.db.collection('qr_tracking').where('userId', '==', userId);
    
    if (qrId) {
      query = query.where(admin.firestore.FieldPath.documentId(), '==', qrId);
    }

    const trackingSnapshot = await query.get();
    const analytics: QRAnalytics[] = [];

    for (const doc of trackingSnapshot.docs) {
      const data = doc.data();
      
      // Get scan details
      const scansSnapshot = await this.db
        .collection('qr_scans')
        .where('qrId', '==', doc.id)
        .get();

      // Process scan data
      const locations: Record<string, number> = {};
      const devices: Record<string, number> = {};
      const uniqueIPs = new Set<string>();

      scansSnapshot.docs.forEach(scanDoc => {
        const scan = scanDoc.data();
        
        // Track unique IPs
        if (scan.ip) uniqueIPs.add(scan.ip);
        
        // Parse user agent for device type
        const deviceType = this.parseDeviceType(scan.userAgent);
        devices[deviceType] = (devices[deviceType] || 0) + 1;
      });

      analytics.push({
        qrId: doc.id,
        scans: data.scans || 0,
        uniqueScans: uniqueIPs.size,
        locations: Object.entries(locations).map(([country, count]) => ({ country, count })),
        devices: Object.entries(devices).map(([type, count]) => ({ type, count })),
        lastScanned: data.lastScanned?.toDate()
      });
    }

    return analytics;
  }

  /**
   * Update dynamic QR code destination
   */
  async updateQRDestination(qrId: string, newData: string): Promise<void> {
    await this.db.collection('qr_codes').doc(qrId).update({
      data: newData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  /**
   * Generate unique QR ID
   */
  private generateQRId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Parse device type from user agent
   */
  private parseDeviceType(userAgent?: string): string {
    if (!userAgent) return 'Unknown';
    
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    if (/desktop/i.test(userAgent)) return 'Desktop';
    
    return 'Other';
  }

  /**
   * Delete QR code
   */
  async deleteQRCode(userId: string, qrId: string): Promise<void> {
    // Delete from storage
    const fileName = `qr-codes/${userId}/${qrId}.png`;
    await this.storage.bucket().file(fileName).delete();

    // Delete from database
    await this.db.collection('qr_codes').doc(qrId).delete();
    await this.db.collection('qr_tracking').doc(qrId).delete();
  }
}

export const qrCodeService = new QRCodeService();