/** Email template categories */
export type EmailCategory = 'transactional' | 'payment' | 'notification' | 'admin' | 'marketing';

/** Supported languages */
export type EmailLanguage = 'en' | 'he' | 'es' | 'zh' | 'fr' | 'it' | 'hi' | 'ta' | 'bn' | 'ja';

/** Text direction */
export type TextDirection = 'ltr' | 'rtl';

/** Email template metadata */
export interface EmailTemplate {
  name: string;
  category: EmailCategory;
  description: string;
  requiredContext: string[];
  supportedLanguages: EmailLanguage[];
}

/** Email message for sending */
export interface EmailMessage {
  toEmail: string;
  subject: string;
  htmlContent: string;
  plainContent?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  categories?: string[];
  customArgs?: Record<string, string>;
  templateName?: string;
  language?: EmailLanguage;
}

/** Result of sending an email */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

/** Base context for all email templates */
export interface EmailBaseContext {
  recipientEmail: string;
  recipientName: string;
  lang: EmailLanguage;
  subject: string;
  logoUrl: string;
  unsubscribeUrl: string;
  privacyUrl: string;
  termsUrl: string;
  currentYear: number;
}

/** Welcome email context */
export interface WelcomeEmailContext extends EmailBaseContext {
  dashboardUrl: string;
}

/** Email verification context */
export interface EmailVerificationContext extends EmailBaseContext {
  verificationUrl: string;
  expiryHours: number;
}

/** Password reset context */
export interface PasswordResetContext extends EmailBaseContext {
  resetUrl: string;
  expiryHours: number;
}

/** Payment confirmation context */
export interface PaymentConfirmationContext extends EmailBaseContext {
  transactionId: string;
  planName: string;
  amount: string;
  currency: string;
  paymentDate: string;
  nextBillingDate: string;
}

/** Subscription activated context */
export interface SubscriptionActivatedContext extends EmailBaseContext {
  planName: string;
  features: string[];
  expiresAt: string;
}

/** Support ticket context */
export interface SupportTicketContext extends EmailBaseContext {
  ticketId: string;
  ticketSubject: string;
  ticketStatus: string;
  ticketUrl: string;
}

/** Campaign email context */
export interface CampaignEmailContext extends EmailBaseContext {
  campaignId: string;
  headline: string;
  bodyHtml: string;
  ctaUrl: string;
  ctaText: string;
  heroImageUrl?: string;
}

/** GDPR deletion confirmation context */
export interface GdprDeletionContext extends EmailBaseContext {
  deletionDate: string;
  dataCategories: string[];
}
