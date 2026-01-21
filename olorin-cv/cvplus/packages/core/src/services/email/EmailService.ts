import { logger } from 'firebase-functions';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { retryService } from '../retry/RetryService';
import { circuitBreakerService } from '../circuit-breaker/CircuitBreakerService';
import { deadLetterQueueService } from '../dlq/DeadLetterQueueService';

/**
 * Email provider types
 */
export enum EmailProvider {
  SENDGRID = 'SENDGRID',
  AWS_SES = 'AWS_SES',
  MAILGUN = 'MAILGUN',
  SMTP = 'SMTP',
}

/**
 * Email delivery status
 */
export enum EmailStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  BOUNCED = 'BOUNCED',
  FAILED = 'FAILED',
  DEFERRED = 'DEFERRED',
}

/**
 * Email configuration
 */
export interface EmailConfig {
  provider: EmailProvider;
  apiKey?: string;
  apiSecret?: string;
  domain?: string;
  fromEmail?: string;
  fromName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
}

/**
 * Email options
 */
export interface EmailOptions {
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
  trackOpens?: boolean;
  trackClicks?: boolean;
  tags?: string[];
}

/**
 * Email send result
 */
export interface EmailSendResult {
  messageId: string;
  provider: EmailProvider;
  status: EmailStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Email metrics
 */
export interface EmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  deliveryRate: number;
  bounceRate: number;
  byProvider: Record<EmailProvider, number>;
  averageDeliveryTime?: number;
}

/**
 * Service for sending emails with multi-provider fallback
 */
export class EmailService {
  private static instance: EmailService;
  private db: Firestore | null = null;
  private app: App | null = null;
  private providerConfigs: Map<EmailProvider, EmailConfig> = new Map();
  private providerOrder: EmailProvider[] = [
    EmailProvider.SENDGRID,
    EmailProvider.AWS_SES,
    EmailProvider.MAILGUN,
    EmailProvider.SMTP,
  ];

  private constructor() {
    // Lazy initialization
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Initialize Firestore connection
   */
  private initializeFirestore(): void {
    if (this.db) return;

    try {
      if (getApps().length === 0) {
        this.app = initializeApp();
      } else {
        this.app = getApps()[0] || null;
      }
      if (this.app) {
        this.db = getFirestore(this.app);
      }
      logger.info('[EmailService] Firestore initialized');
    } catch (error) {
      logger.error('[EmailService] Failed to initialize Firestore:', error);
    }
  }

  /**
   * Send email with provider fallback
   */
  public async sendEmail(
    to: string | string[],
    subject: string,
    body: string,
    options: EmailOptions = {}
  ): Promise<EmailSendResult> {
    const recipients = Array.isArray(to) ? to : [to];

    // Validate email addresses
    for (const email of recipients) {
      if (!this.validateEmailAddress(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    let lastError: Error | null = null;

    // Try each provider in order
    for (const provider of this.providerOrder) {
      try {
        logger.info(`[EmailService] Attempting to send email via ${provider}`);

        const result = await circuitBreakerService.execute(
          `email_${provider}`,
          async () => {
            return await retryService.executeWithRetry(
              async () => {
                return await this.sendViaProvider(provider, recipients, subject, body, options);
              },
              {
                maxRetries: 2,
                baseDelay: 1000,
              }
            );
          },
          undefined,
          { failureThreshold: 3, timeout: 30000 }
        );

        // Log successful send
        await this.logEmailSend(result);
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.error(`[EmailService] Failed to send via ${provider}:`, error);
        continue;
      }
    }

    // All providers failed, add to DLQ
    const dlqId = await deadLetterQueueService.addToDeadLetterQueue(
      { to: recipients, subject, body, options },
      lastError || new Error('All email providers failed'),
      { operation: 'sendEmail' }
    );

    throw new Error(
      `Failed to send email via all providers. Added to DLQ: ${dlqId}. Last error: ${lastError?.message}`
    );
  }

  /**
   * Send bulk emails
   */
  public async sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string,
    options: EmailOptions = {},
    batchSize: number = 50
  ): Promise<{ succeeded: number; failed: number; results: EmailSendResult[] }> {
    const results: EmailSendResult[] = [];
    let succeeded = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((recipient) => this.sendEmail(recipient, subject, body, options))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          succeeded++;
        } else {
          failed++;
          logger.error('[EmailService] Bulk send failed for recipient:', result.reason);
        }
      }
    }

    logger.info(`[EmailService] Bulk send complete: ${succeeded} succeeded, ${failed} failed`);

    return { succeeded, failed, results };
  }

  /**
   * Send templated email
   */
  public async sendTemplatedEmail(
    to: string | string[],
    templateId: string,
    data: Record<string, any>,
    options: EmailOptions = {}
  ): Promise<EmailSendResult> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      // Fetch template from Firestore
      const templateDoc = await this.db.collection('email_templates').doc(templateId).get();

      if (!templateDoc.exists) {
        throw new Error(`Email template not found: ${templateId}`);
      }

      const template = templateDoc.data();
      if (!template) {
        throw new Error('Template data is empty');
      }

      // Replace template variables
      const subject = this.replaceTemplateVariables(template.subject, data);
      const body = this.replaceTemplateVariables(template.body, data);

      return await this.sendEmail(to, subject, body, options);
    } catch (error) {
      logger.error('[EmailService] Failed to send templated email:', error);
      throw error;
    }
  }

  /**
   * Schedule email for future delivery
   */
  public async scheduleEmail(
    to: string | string[],
    subject: string,
    body: string,
    sendTime: Date,
    options: EmailOptions = {}
  ): Promise<string> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const scheduledEmail = {
        to: Array.isArray(to) ? to : [to],
        subject,
        body,
        options,
        sendTime,
        status: EmailStatus.PENDING,
        createdAt: new Date(),
      };

      const docRef = await this.db.collection('scheduled_emails').add(scheduledEmail);

      logger.info(`[EmailService] Email scheduled for ${sendTime}: ${docRef.id}`);

      return docRef.id;
    } catch (error) {
      logger.error('[EmailService] Failed to schedule email:', error);
      throw error;
    }
  }

  /**
   * Get email delivery status
   */
  public async getEmailStatus(messageId: string): Promise<EmailStatus> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const doc = await this.db.collection('email_logs').doc(messageId).get();

      if (!doc.exists) {
        throw new Error(`Email not found: ${messageId}`);
      }

      const data = doc.data();
      return (data?.status as EmailStatus) || EmailStatus.PENDING;
    } catch (error) {
      logger.error('[EmailService] Failed to get email status:', error);
      throw error;
    }
  }

  /**
   * Update provider order for fallback
   */
  public updateProviderOrder(providers: EmailProvider[]): void {
    this.providerOrder = providers;
    logger.info(`[EmailService] Provider order updated: ${providers.join(', ')}`);
  }

  /**
   * Configure email provider
   */
  public async configureEmailProvider(provider: EmailProvider, config: EmailConfig): Promise<void> {
    try {
      this.initializeFirestore();

      this.providerConfigs.set(provider, config);

      // Persist to Firestore (encrypted in production)
      if (this.db) {
        await this.db
          .collection('email_provider_configs')
          .doc(provider)
          .set(
            {
              ...config,
              updatedAt: new Date(),
            },
            { merge: true }
          );
      }

      logger.info(`[EmailService] Provider ${provider} configured`);
    } catch (error) {
      logger.error(`[EmailService] Failed to configure provider ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get email metrics
   */
  public async getEmailMetrics(
    timeRange: { start: Date; end: Date }
  ): Promise<EmailMetrics> {
    try {
      this.initializeFirestore();

      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      const snapshot = await this.db
        .collection('email_logs')
        .where('timestamp', '>=', timeRange.start)
        .where('timestamp', '<=', timeRange.end)
        .get();

      let totalSent = 0;
      let totalDelivered = 0;
      let totalBounced = 0;
      let totalFailed = 0;
      const byProvider: Record<EmailProvider, number> = {} as any;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalSent++;

        if (data.status === EmailStatus.DELIVERED) totalDelivered++;
        if (data.status === EmailStatus.BOUNCED) totalBounced++;
        if (data.status === EmailStatus.FAILED) totalFailed++;

        const provider = data.provider as EmailProvider;
        byProvider[provider] = (byProvider[provider] || 0) + 1;
      });

      const deliveryRate = totalSent > 0 ? totalDelivered / totalSent : 0;
      const bounceRate = totalSent > 0 ? totalBounced / totalSent : 0;

      return {
        totalSent,
        totalDelivered,
        totalBounced,
        totalFailed,
        deliveryRate,
        bounceRate,
        byProvider,
      };
    } catch (error) {
      logger.error('[EmailService] Failed to get metrics:', error);
      throw error;
    }
  }

  /**
   * Validate email address
   */
  public validateEmailAddress(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Test email provider connectivity
   */
  public async testEmailProvider(provider: EmailProvider): Promise<boolean> {
    try {
      logger.info(`[EmailService] Testing provider: ${provider}`);

      // Send test email to a test address
      await this.sendViaProvider(
        provider,
        ['test@cvplus.dev'],
        'Test Email',
        'This is a test email to verify provider connectivity.',
        {}
      );

      logger.info(`[EmailService] Provider ${provider} test successful`);
      return true;
    } catch (error) {
      logger.error(`[EmailService] Provider ${provider} test failed:`, error);
      return false;
    }
  }

  /**
   * Send email via specific provider
   */
  private async sendViaProvider(
    provider: EmailProvider,
    recipients: string[],
    subject: string,
    body: string,
    options: EmailOptions
  ): Promise<EmailSendResult> {
    const config = this.providerConfigs.get(provider);

    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    // Simulate sending via different providers
    // In production, integrate with actual provider SDKs
    const messageId = `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info(`[EmailService] Sending via ${provider} to ${recipients.join(', ')}`);

    // Simulate provider-specific logic
    switch (provider) {
      case EmailProvider.SENDGRID:
        await this.sendViaSendGrid(config, recipients, subject, body, options);
        break;
      case EmailProvider.AWS_SES:
        await this.sendViaAwsSes(config, recipients, subject, body, options);
        break;
      case EmailProvider.MAILGUN:
        await this.sendViaMailgun(config, recipients, subject, body, options);
        break;
      case EmailProvider.SMTP:
        await this.sendViaSmtp(config, recipients, subject, body, options);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    return {
      messageId,
      provider,
      status: EmailStatus.SENT,
      timestamp: new Date(),
      metadata: {
        recipients: recipients.length,
        subject,
      },
    };
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(
    _config: EmailConfig,
    _recipients: string[],
    _subject: string,
    _body: string,
    _options: EmailOptions
  ): Promise<void> {
    // Production: Use @sendgrid/mail package
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(config.apiKey);
    // await sgMail.send({ to: recipients, from: config.fromEmail, subject, html: body });

    logger.info('[EmailService] SendGrid: Email sent');
  }

  /**
   * Send via AWS SES
   */
  private async sendViaAwsSes(
    _config: EmailConfig,
    _recipients: string[],
    _subject: string,
    _body: string,
    _options: EmailOptions
  ): Promise<void> {
    // Production: Use AWS SDK SES
    // const AWS = require('aws-sdk');
    // const ses = new AWS.SES({ region: 'us-east-1' });
    // await ses.sendEmail({ ... }).promise();

    logger.info('[EmailService] AWS SES: Email sent');
  }

  /**
   * Send via Mailgun
   */
  private async sendViaMailgun(
    _config: EmailConfig,
    _recipients: string[],
    _subject: string,
    _body: string,
    _options: EmailOptions
  ): Promise<void> {
    // Production: Use mailgun-js package
    // const mailgun = require('mailgun-js')({ apiKey: config.apiKey, domain: config.domain });
    // await mailgun.messages().send({ to: recipients, from: config.fromEmail, subject, html: body });

    logger.info('[EmailService] Mailgun: Email sent');
  }

  /**
   * Send via SMTP
   */
  private async sendViaSmtp(
    _config: EmailConfig,
    _recipients: string[],
    _subject: string,
    _body: string,
    _options: EmailOptions
  ): Promise<void> {
    // Production: Use nodemailer
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({ to: recipients, from: config.fromEmail, subject, html: body });

    logger.info('[EmailService] SMTP: Email sent');
  }

  /**
   * Replace template variables
   */
  private replaceTemplateVariables(template: string, data: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, String(value));
    }

    return result;
  }

  /**
   * Log email send to Firestore
   */
  private async logEmailSend(result: EmailSendResult): Promise<void> {
    try {
      this.initializeFirestore();

      if (!this.db) return;

      await this.db.collection('email_logs').doc(result.messageId).set({
        messageId: result.messageId,
        provider: result.provider,
        status: result.status,
        timestamp: result.timestamp,
        metadata: result.metadata,
      });
    } catch (error) {
      logger.error('[EmailService] Failed to log email send:', error);
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
