/**
 * B2B Usage Types
 *
 * Type definitions for B2B usage analytics and metrics.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

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

export interface UsageSummaryRequest {
  startDate?: string;
  endDate?: string;
}

export interface UsageBreakdownRequest {
  startDate: string;
  endDate: string;
  granularity: UsageGranularity;
  capability?: CapabilityType;
}

export interface UsageBreakdownResponse {
  dataPoints: UsageDataPoint[];
  breakdown: UsageBreakdown[];
  totals: UsageSummary;
}

export interface UsageExportRequest {
  startDate: string;
  endDate: string;
  format: 'csv' | 'json';
  capability?: CapabilityType;
}

export interface UsageExportResponse {
  downloadUrl: string;
  expiresAt: string;
}
