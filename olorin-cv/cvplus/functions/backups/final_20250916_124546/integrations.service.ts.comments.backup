/**
 * Service for managing third-party integrations
 */

import * as admin from 'firebase-admin';
import * as QRCode from 'qrcode';
// import ... from "nodemailer"; // TODO: Add nodemailer dependency
import { environment as config } from '../config/environment';

export class IntegrationsService {
  // TODO: Add nodemailer dependency and import
  private emailTransporter: any | null = null;
  private emailProvider: 'gmail' | 'sendgrid' | 'resend' = 'gmail';

  constructor() {
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter with fallback options
   * TODO: Implement when nodemailer dependency is added
   */
  private initializeEmailTransporter(): void {
    // TODO: Implement email transporter initialization after adding nodemailer dependency
    this.emailTransporter = null;
    /*
    try {
      // Check for SendGrid configuration first (recommended for production)
      if (config.email?.sendgridApiKey || process.env.SENDGRID_API_KEY) {
        this.emailProvider = 'sendgrid';
        this.emailTransporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: config.email?.sendgridApiKey || process.env.SENDGRID_API_KEY
          }
        });
        return;
      }

      // Check for Resend configuration
      if (config.email?.resendApiKey || process.env.RESEND_API_KEY) {
        this.emailProvider = 'resend';
        this.emailTransporter = nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 587,
          secure: false,
          auth: {
            user: 'resend',
            pass: config.email?.resendApiKey || process.env.RESEND_API_KEY
          }
        });
        return;
      }

      // Fallback to Gmail if configured
      if (config.email?.user && config.email?.password) {
        this.emailProvider = 'gmail';
        this.emailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.email.user,
            pass: config.email.password
          }
        });
        return;
      }

      this.emailTransporter = null;
    } catch (error) {
      this.emailTransporter = null;
    }
    */
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
   * Send email notification with enhanced error handling
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.emailTransporter) {
        return {
          success: false,
          error: 'Email service not configured'
        };
      }

      // Validate email address
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(options.to)) {
        return {
          success: false,
          error: 'Invalid recipient email address'
        };
      }

      const fromEmail = options.from || config.email?.from || 'CVPlus <noreply@getmycv-ai.com>';
      const mailOptions = {
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        // Add headers for better deliverability
        headers: {
          'X-Mailer': 'CVPlus',
          'X-Priority': '3',
          'Importance': 'Normal'
        }
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email sent successfully via ${this.emailProvider}:`, {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject
      });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to send email:', {
        error: error.message,
        provider: this.emailProvider,
        to: options.to,
        subject: options.subject
      });
      
      return {
        success: false,
        error: error.message || 'Unknown email error'
      };
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<{ success: boolean; provider: string; error?: string }> {
    try {
      if (!this.emailTransporter) {
        return {
          success: false,
          provider: 'none',
          error: 'No email transporter configured'
        };
      }

      // Verify transporter connection
      await this.emailTransporter.verify();
      
      return {
        success: true,
        provider: this.emailProvider
      };
    } catch (error: any) {
      return {
        success: false,
        provider: this.emailProvider,
        error: error.message
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
   * Generate video thumbnail using video generation service
   */
  async generateVideoThumbnail(videoUrl: string): Promise<string> {
    try {
      // TODO: Implement video generation service
      // const { VideoGenerationService } = await import('./video-generation.service');
      // const videoService = new VideoGenerationService();
      
      // Use the video service to generate thumbnail
      // return await videoService.generateThumbnail(videoUrl, 'integration-thumbnail');
      return 'https://placeholder-thumbnail.jpg';
    } catch (error) {
      
      // Fallback: generate a better placeholder with video metadata
      const videoName = videoUrl.split('/').pop()?.split('.')[0] || 'video';
      return `https://via.placeholder.com/640x360/6366f1/ffffff?text=${encodeURIComponent(videoName)}`;
    }
  }

  /**
   * Generate podcast audio using the dedicated podcast service
   */
  async generatePodcastAudio(_script: string, _voice?: string): Promise<Buffer> {
    try {
      // TODO: Implement podcast generation service
      // const { PodcastGenerationService } = await import('./podcast-generation.service');
      // const podcastService = new PodcastGenerationService();
      
      // Use the podcast service for text-to-speech
      // Create a simple script structure for the text
      // TODO: Implement when podcast service is available
      // const simpleScript = {
      //   segments: [{
      //     speaker: 'host1',
      //     content: script,
      //     timing: { start: 0, duration: 5000 }
      //   }]
      // };
      
      // const audioSegments = await podcastService.generateAudioSegments(simpleScript);
      // return audioSegments[0]?.audioBuffer || Buffer.alloc(0);
      return Buffer.alloc(0); // Empty buffer placeholder
    } catch (error) {
      throw new Error(`Failed to generate podcast audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const integrationsService = new IntegrationsService();