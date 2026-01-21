/**
 * B2B Partner Portal Types
 */

// Auth Types
export type B2BUserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface B2BUser {
  id: string;
  email: string;
  name: string;
  role: B2BUserRole;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
}

export interface B2BOrganization {
  id: string;
  orgId: string;
  name: string;
  contactEmail: string;
  logoUrl: string | null;
  webhookUrl: string | null;
  webhookEvents: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: B2BUser;
  organization: B2BOrganization;
}

export interface RegisterRequest {
  organization: {
    orgId: string;
    name: string;
    contactEmail: string;
  };
  owner: {
    name: string;
    email: string;
    password: string;
  };
}

export type RegisterResponse = LoginResponse;

// Partner Types
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: B2BUserRole;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  invitedBy: string | null;
}

export interface InviteMemberRequest {
  email: string;
  name: string;
  role: B2BUserRole;
}

export interface InviteMemberResponse {
  member: TeamMember;
  temporaryPassword: string;
}

export type ApiKeyScope = 'fraud' | 'content' | 'all';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  organizationId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  rawKey: string;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
}

// Billing Types
export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type BillingPeriod = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  features: { name: string; included: boolean; limit?: number }[];
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
}

// Usage Types
export type UsageGranularity = 'hourly' | 'daily' | 'monthly';
export type CapabilityType = 'fraud' | 'content' | 'all';

export interface UsageSummary {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  totalRequests: number;
  fraudRequests: number;
  contentRequests: number;
  estimatedCost: number;
  currency: string;
  activeApiKeys: number;
  activeTeamMembers: number;
}

export interface UsageDataPoint {
  timestamp: string;
  requests: number;
  fraudRequests: number;
  contentRequests: number;
  errors: number;
  avgLatencyMs: number;
}

export interface UsageBreakdown {
  endpoint: string;
  capability: CapabilityType;
  requests: number;
  errors: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  estimatedCost: number;
}

export interface UsageBreakdownResponse {
  dataPoints: UsageDataPoint[];
  breakdown: UsageBreakdown[];
  totals: UsageSummary;
}
