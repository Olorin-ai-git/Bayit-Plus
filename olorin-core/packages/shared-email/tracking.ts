/** Email event types from SendGrid webhooks */
export type EmailEventType =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'dropped'
  | 'spam_report'
  | 'unsubscribe';

/** Email event from webhook */
export interface EmailEvent {
  emailId: string;
  eventType: EmailEventType;
  recipient: string;
  templateName: string;
  subject: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  sgMessageId: string;
  campaignId?: string;
  userId?: string;
}

/** Delivery statistics */
export interface DeliveryStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  dropped: number;
  spamReports: number;
  unsubscribes: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

/** Date range filter */
export interface DateRange {
  start: string;
  end: string;
}

/** Paginated event log request */
export interface EventLogRequest {
  page: number;
  pageSize: number;
  eventType?: EmailEventType;
  recipient?: string;
  campaignId?: string;
  dateRange?: DateRange;
}

/** Paginated event log response */
export interface EventLogResponse {
  events: EmailEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
