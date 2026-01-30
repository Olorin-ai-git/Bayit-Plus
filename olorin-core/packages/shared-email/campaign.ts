import type { EmailLanguage, EmailCategory } from './types';

/** Email campaign */
export interface EmailCampaign {
  id: string;
  name: string;
  category: EmailCategory;
  templateName: string;
  subject: string;
  status: CampaignStatus;
  audienceFilter: AudienceFilter;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Campaign status */
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

/** Audience filter for campaigns */
export interface AudienceFilter {
  languages?: EmailLanguage[];
  subscriptionPlans?: string[];
  registeredBefore?: string;
  registeredAfter?: string;
  tags?: string[];
  excludeTags?: string[];
}

/** Campaign creation request */
export interface CreateCampaignRequest {
  name: string;
  templateName: string;
  subject: string;
  audienceFilter: AudienceFilter;
  scheduledAt?: string;
  context: Record<string, unknown>;
}

/** Campaign summary with stats */
export interface CampaignSummary extends EmailCampaign {
  recipientCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
}
