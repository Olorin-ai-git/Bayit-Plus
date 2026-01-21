/**
 * Service for managing third-party integrations
  */

import * as admin from 'firebase-admin';
import * as QRCode from 'qrcode';
import { emailService } from './email/EmailService';

export class IntegrationsService {
  /**
   * Generate QR code for a URL
    */
  async generateQRCode(url: string, options?: QRCode.QRCodeToBufferOptions): Promise<Buffer> {
    const defaultOptions: QRCode.QRCodeToBufferOptions = {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };

    return await QRCode.toBuffer(url, defaultOptions);
  }

  /**
   * Upload QR code to storage
    */
  async uploadQRCode(buffer: Buffer, jobId: string): Promise<string> {
    const bucket = admin.storage().bucket();
    const fileName = `qr-codes/${jobId}/qr-${Date.now()}.png`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000' // 1 year cache
      }
    });

    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  }

  /**
   * Send email notification using EmailService
    */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const emailOptions = {
        replyTo: options.from,
        headers: {
          'X-Mailer': 'CVPlus',
          'X-Priority': '3',
          'Importance': 'Normal'
        }
      };

      await emailService.sendEmail(options.to, options.subject, options.html, emailOptions);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown email error'
      };
    }
  }

  /**
   * Generate email template for contact form
    */
  generateContactFormEmailTemplate(data: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    company?: string;
    subject?: string;
    message: string;
    cvUrl: string;
    profileOwnerName?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #06b6d4; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-top: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #666; }
          .value { margin-top: 5px; }
          .message { background-color: white; padding: 15px; border-left: 4px solid #06b6d4; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #06b6d4; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Contact Form Submission</h2>
            <p>${data.profileOwnerName ? `Hi ${data.profileOwnerName}, someone` : 'Someone'} is interested in your CV!</p>
          </div>
          
          <div class="content">
            <div class="field">
              <div class="label">From:</div>
              <div class="value">${data.senderName}</div>
            </div>
            
            <div class="field">
              <div class="label">Email:</div>
              <div class="value"><a href="mailto:${data.senderEmail}">${data.senderEmail}</a></div>
            </div>
            
            ${data.senderPhone ? `
            <div class="field">
              <div class="label">Phone:</div>
              <div class="value">${data.senderPhone}</div>
            </div>
            ` : ''}
            
            ${data.company ? `
            <div class="field">
              <div class="label">Company:</div>
              <div class="value">${data.company}</div>
            </div>
            ` : ''}
            
            ${data.subject ? `
            <div class="field">
              <div class="label">Subject:</div>
              <div class="value">${data.subject}</div>
            </div>
            ` : ''}
            
            <div class="message">
              <div class="label">Message:</div>
              <p>${data.message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.cvUrl}" class="button">View Your CV</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This message was sent via your CVPlus public profile.</p>
            <p>To manage your CV settings, visit <a href="https://getmycv-ai.web.app">CVPlus Dashboard</a></p>
            <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #999;">
              Reply directly to this email to respond to ${data.senderName} at ${data.senderEmail}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Initialize calendar integration using the dedicated calendar service
    */
  async initializeCalendarIntegration(userId: string, provider: 'google' | 'calendly'): Promise<any> {
    // Import the calendar integration service
    // const { CalendarIntegrationService } = await import('./calendar-integration.service');
    // const calendarService = new CalendarIntegrationService();
    
    switch (provider) {
      case 'google':
        // Use the actual Google Calendar OAuth flow
        // return await calendarService.initializeGoogleAuth(userId);
        throw new Error('Google auth initialization not implemented');
      
      case 'calendly':
        // Note: Calendly integration would require webhooks setup
        // For now, return configuration needed for Calendly
        return { 
          webhookUrl: `https://cvplus.com/api/calendly/${userId}`,
          integrationGuide: 'Please configure your Calendly webhook to point to this URL'
        };
      
      default:
        throw new Error('Unsupported calendar provider');
    }
  }

  /**
   * Generate video thumbnail
   * Note: For full video generation capabilities, use @cvplus/multimedia VideoGenerationService
    */
  async generateVideoThumbnail(videoUrl: string): Promise<string> {
    throw new Error(
      'CRITICAL: Video thumbnail generation not implemented in core module. ' +
      'This feature requires the @cvplus/multimedia VideoGenerationService. ' +
      'Video URL: ' + videoUrl + '. ' +
      'Please ensure @cvplus/multimedia is properly configured and imported.'
    );
  }

  /**
   * Generate podcast audio
   * Note: For full podcast generation capabilities, use @cvplus/multimedia PodcastGenerationService
    */
  async generatePodcastAudio(script: string, voice?: string): Promise<Buffer> {
    throw new Error(
      'CRITICAL: Podcast audio generation not implemented in core module. ' +
      'This feature requires the @cvplus/multimedia PodcastGenerationService. ' +
      'Please ensure @cvplus/multimedia is properly configured and imported. ' +
      `Script length: ${script?.length || 0}, Voice: ${voice || 'default'}.`
    );
  }
}

export const integrationsService = new IntegrationsService();