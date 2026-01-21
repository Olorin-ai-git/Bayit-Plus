/**
 * Email Service Exports
 *
 * Provides multi-provider email delivery with fallback
 */

export { EmailService, emailService } from './EmailService';
export type {
  EmailConfig,
  EmailOptions,
  EmailSendResult,
  EmailMetrics,
} from './EmailService';
export { EmailProvider, EmailStatus } from './EmailService';
