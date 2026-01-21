export * from './profile.types';

// SEO Types
export * from './seo.types';

// Analytics Types
export * from './analytics.types';

// Networking Types
export * from './networking.types';

// Branding and Template Types
export interface BrandingTypes {
  colorScheme: 'light' | 'dark' | 'auto' | 'custom';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string;
}

// Social Integration Types
export interface SocialIntegrationTypes {
  platform: string;
  enabled: boolean;
  shareUrl: string;
  apiKey?: string;
  accessToken?: string;
}

// Error Types
export interface PublicProfilesError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
  context?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: PublicProfilesError;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
}

// Configuration Types
export interface PublicProfilesConfig {
  baseUrl: string;
  apiVersion: string;
  features: {
    seoOptimization: boolean;
    analytics: boolean;
    networking: boolean;
    customDomains: boolean;
    socialIntegration: boolean;
    qrCodes: boolean;
    pdfExport: boolean;
  };
  limits: {
    maxProfiles: number;
    maxCustomDomains: number;
    maxStorageSize: number;
    maxConnections: number;
  };
}

// Event Types for Real-time Updates
export interface ProfileEvent {
  type: 'profile_updated' | 'profile_viewed' | 'connection_request' | 'message_received' | 'endorsement_received';
  profileId: string;
  userId: string;
  data: unknown;
  timestamp: Date;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type PublicProfilesModule = 'core' | 'seo' | 'analytics' | 'networking' | 'social' | 'templates';

export interface ModuleStatus {
  module: PublicProfilesModule;
  enabled: boolean;
  version: string;
  lastUpdated: Date;
  dependencies: string[];
}

// Portal Types - Migrated from Core
export * from './portal-chat-config';
export * from './portal-core';
export * from './portal-customization';
export * from './portal-embeddings';
export * from './portal-rag-config';
export * from './portal-styling';
export * from './portal-vector-db';export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
export * from './api';
export * from './booking.types';
export * from './payment.types';
