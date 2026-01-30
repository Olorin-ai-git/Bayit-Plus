// Core email types
export type {
  EmailCategory,
  EmailLanguage,
  TextDirection,
  EmailTemplate,
  EmailMessage,
  SendResult,
  EmailBaseContext,
  WelcomeEmailContext,
  EmailVerificationContext,
  PasswordResetContext,
  PaymentConfirmationContext,
  SubscriptionActivatedContext,
  SupportTicketContext,
  CampaignEmailContext,
  GdprDeletionContext,
} from './types';

// Tracking types
export type {
  EmailEventType,
  EmailEvent,
  DeliveryStats,
  DateRange,
  EventLogRequest,
  EventLogResponse,
} from './tracking';

// Campaign types
export type {
  EmailCampaign,
  CampaignStatus,
  AudienceFilter,
  CreateCampaignRequest,
  CampaignSummary,
} from './campaign';

// Preview types
export type {
  TemplatePreviewRequest,
  TemplatePreviewResponse,
  TemplateListItem,
  TemplateListResponse,
} from './preview';
