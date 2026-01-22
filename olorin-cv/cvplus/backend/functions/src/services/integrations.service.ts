/**
 * Service for managing third-party integrations
 */

import { Storage } from '@google-cloud/storage';
import * as QRCode from 'qrcode';
import * as nodemailer from 'nodemailer';
import { getConfig } from '../config/schema';

const config = getConfig();

export class IntegrationsService {
  private storage = new Storage();
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter (using Gmail as example)
    // In production, use SendGrid or similar service
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email?.user || process.env.EMAIL_USER,
        pass: config.email?.password || process.env.EMAIL_PASSWORD
      }
    });
  }

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
    const bucket = this.storage.bucket(config.storage.bucketName);
    const fileName = `qr-codes/${jobId}/qr-${Date.now()}.png`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000' // 1 year cache
      }
    });

    await file.makePublic();
    const storageBaseUrl = `https://storage.googleapis.com`;
    return `${storageBaseUrl}/${config.storage.bucketName}/${fileName}`;
  }

  /**
   * Send email notification
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    const mailOptions = {
      from: options.from || config.email?.from || `CVPlus <${config.email.user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  /**
   * Generate email template for contact form
   */
  generateContactFormEmailTemplate(data: {
    senderName: string;
    senderEmail: string;
    senderPhone?: string;
    company?: string;
    message: string;
    cvUrl: string;
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
            <p>Someone is interested in your CV!</p>
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
            <p>To manage your CV settings, visit <a href="${config.app.baseUrl}">${config.app.baseUrl.replace('https://', '')}</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Initialize calendar integration
   * Feature flag controlled - throws error if disabled
   */
  async initializeCalendarIntegration(userId: string, provider: 'google' | 'calendly'): Promise<any> {
    if (!config.features?.calendarIntegration) {
      throw new Error('Calendar integration is not enabled. This feature is coming soon. Enable FEATURE_CALENDAR=true to use this feature.');
    }

    switch (provider) {
      case 'google':
        if (!config.calendar?.google?.clientId || !config.calendar?.google?.clientSecret) {
          throw new Error('Google Calendar credentials not configured');
        }
        // Initialize Google Calendar
        return { calendarId: `cal_${userId}` };

      case 'calendly':
        if (!config.calendar?.calendly?.apiKey) {
          throw new Error('Calendly API key not configured');
        }
        // Initialize Calendly webhook
        return { webhookUrl: `${config.api.baseUrl}/calendly/${userId}` };

      default:
        throw new Error('Unsupported calendar provider');
    }
  }

  /**
   * Generate video thumbnail
   * Feature flag controlled - throws error if disabled
   */
  async generateVideoThumbnail(_videoUrl: string): Promise<string> {
    if (!config.features?.videoThumbnails) {
      throw new Error('Video thumbnail generation is not enabled. This feature is coming soon. Enable FEATURE_VIDEO_THUMBNAILS=true to use this feature.');
    }

    throw new Error('Video thumbnail generation is coming soon. We are working on integrating Cloud Storage and video processing capabilities.');
  }

  /**
   * Text to speech for podcast generation
   * Feature flag controlled - throws error if disabled
   */
  async generatePodcastAudio(_script: string, _voice?: string): Promise<Buffer> {
    if (!config.features?.textToSpeech) {
      throw new Error('Text-to-speech is not enabled. This feature is coming soon. Enable FEATURE_TEXT_TO_SPEECH=true to use this feature.');
    }

    throw new Error('Text-to-speech podcast generation is coming soon. We are working on integrating ElevenLabs and voice processing capabilities.');
  }
}

export const integrationsService = new IntegrationsService();