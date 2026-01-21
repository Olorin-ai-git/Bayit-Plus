/**
 * B2B Billing Types
 *
 * Type definitions for B2B billing, plans, and invoices.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type BillingPeriod = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface PlanFeature {
  name: string;
  description: string;
  included: boolean;
  limit?: number;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  features: PlanFeature[];
  requestsPerMonth: number;
  teamMembersLimit: number;
  apiKeysLimit: number;
  supportLevel: string;
  isPopular: boolean;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  plan: Plan;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionRequest {
  planId: string;
  billingPeriod: BillingPeriod;
}

export interface CancelSubscriptionRequest {
  reason?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface Invoice {
  id: string;
  organizationId: string;
  subscriptionId: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  pdfUrl: string | null;
  createdAt: string;
  paidAt: string | null;
  dueDate: string;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
