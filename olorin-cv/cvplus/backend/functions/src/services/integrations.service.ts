/**
 * Service for managing third-party integrations
 */

import { Storage } from '@google-cloud/storage';
import * as QRCode from 'qrcode';
import * as nodemailer from 'nodemailer';
import { config } from '../config/environment';

export class IntegrationsService {
  private storage = new Storage();
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter (using Gmail as example)
    // In production, use SendGrid or similar service
    this.emailTransporter = nodemailer.createTransporter({
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
    return `https://storage.googleapis.com/${config.storage.bucketName}/${fileName}`;
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
      from: options.from || config.email?.from || 'CVPlus <noreply@cvplus.com>',
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
            <p>To manage your CV settings, visit <a href="https://cvplus.com">cvplus.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Initialize calendar integration (placeholder for now)
   */
  async initializeCalendarIntegration(userId: string, provider: 'google' | 'calendly'): Promise<any> {
    // TODO: Implement calendar integration
    // For Google Calendar: Use Google Calendar API
    // For Calendly: Use Calendly API
    
    switch (provider) {
      case 'google':
        // Initialize Google Calendar
        return { calendarId: `cal_${userId}` };
      
      case 'calendly':
        // Initialize Calendly webhook
        return { webhookUrl: `https://api.cvplus.com/calendly/${userId}` };
      
      default:
        throw new Error('Unsupported calendar provider');
    }
  }

  /**
   * Generate video thumbnail (placeholder)
   */
  async generateVideoThumbnail(videoUrl: string): Promise<string> {
    // TODO: Implement video thumbnail generation
    // Options:
    // 1. Use ffmpeg in Cloud Function
    // 2. Use a service like Cloudinary
    // 3. Use client-side generation and upload
    
    // For now, return a placeholder
    return 'https://via.placeholder.com/640x360?text=Video+Thumbnail';
  }

  /**
   * Text to speech for podcast generation (placeholder)
   */
  async generatePodcastAudio(script: string, voice?: string): Promise<Buffer> {
    // TODO: Implement text-to-speech
    // Options:
    // 1. Google Cloud Text-to-Speech
    // 2. Amazon Polly
    // 3. Azure Speech Service
    
    // For now, throw not implemented
    throw new Error('Podcast generation not yet implemented');
  }
}

export const integrationsService = new IntegrationsService();