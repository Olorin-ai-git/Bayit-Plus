export interface PortalConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiVersion?: string;
  authentication?: {
    type: 'api_key' | 'oauth' | 'basic_auth';
    credentials?: Record<string, string>;
  };
  features?: {
    jobPosting?: boolean;
    candidateSearch?: boolean;
    analytics?: boolean;
  };
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

export interface PortalIntegration {
  configId: string;
  isEnabled: boolean;
  lastSync?: Date;
  syncStatus?: 'success' | 'error' | 'pending';
  errorMessage?: string;
}

export interface PortalJobPosting {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  type: 'full-time' | 'part-time' | 'contract' | 'temporary';
  postedDate: Date;
  expiryDate?: Date;
}