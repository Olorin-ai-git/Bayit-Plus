/**
 * Firebase Functions Shared Types
 * 
 * Consolidated type definitions commonly used across Firebase Functions.
 * Moves scattered interfaces from function files to centralized types.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import type { CallableRequest } from 'firebase-functions/v2/https';

/**
 * Standard Firebase Function response structure
  */
export interface FirebaseFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Firebase Authentication Context
  */
export interface FirebaseAuthContext {
  uid: string;
  token?: {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    iss?: string;
    aud?: string;
    auth_time?: number;
    exp?: number;
    iat?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Enhanced Callable Request with typed auth
  */
export interface TypedCallableRequest<T = any> extends Omit<CallableRequest<T>, 'auth'> {
  auth: FirebaseAuthContext;
}

/**
 * User profile data structure
  */
export interface UserProfile {
  userId: string;
  googleId?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  permissions?: string[];
  subscriptionStatus?: 'free' | 'basic' | 'pro' | 'enterprise';
  lifetimeAccess?: boolean;
  features?: string[];
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    lastLoginAt?: string;
    accountVerification?: {
      verifiedAt?: string;
      method?: string;
    };
    [key: string]: any;
  };
}

/**
 * Premium feature definitions
  */
export type PremiumFeature = 
  | 'advanced-analytics'
  | 'white-label-reports'
  | 'custom-branding'
  | 'priority-support'
  | 'bulk-processing'
  | 'api-access'
  | 'advanced-templates'
  | 'collaboration-tools'
  | 'data-export'
  | 'custom-integrations';

/**
 * Premium feature access check data
  */
export interface FeatureAccessData {
  userId: string;
  googleId?: string;
  feature: PremiumFeature;
}

/**
 * Premium feature access response
  */
export interface FeatureAccessResponse {
  hasAccess: boolean;
  subscriptionStatus: string;
  lifetimeAccess?: boolean;
  features?: PremiumFeature[];
  purchasedAt?: string;
  googleAccountVerified?: string;
  message?: string;
}

/**
 * CV data structure for processing
  */
export interface CVData {
  userId: string;
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    description?: string;
    achievements?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    graduationDate?: string;
    gpa?: string;
    honors?: string[];
  }>;
  skills: Array<{
    name: string;
    level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
  }>;
  metadata?: {
    createdAt: string;
    updatedAt: string;
    version: number;
    [key: string]: any;
  };
}

/**
 * CV processing status
  */
export type CVProcessingStatus = 
  | 'pending'
  | 'processing'
  | 'analyzing'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * CV processing result
  */
export interface CVProcessingResult {
  id: string;
  userId: string;
  status: CVProcessingStatus;
  progress?: number;
  cvData?: CVData;
  generatedCV?: {
    pdfUrl?: string;
    htmlContent?: string;
    template?: string;
  };
  analysis?: {
    score: number;
    strengths: string[];
    improvements: string[];
    keywords: string[];
  };
  recommendations?: {
    id: string;
    type: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
  }[];
  error?: {
    message: string;
    details?: any;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * File upload data
  */
export interface FileUploadData {
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileContent?: string;
  uploadPath?: string;
}

/**
 * File processing result
  */
export interface FileProcessingResult {
  fileId: string;
  fileName: string;
  fileSize: number;
  processingStatus: 'uploaded' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  thumbnailUrl?: string;
  extractedData?: any;
  error?: string;
  createdAt: string;
}

/**
 * Analytics data structure
  */
export interface AnalyticsData {
  event: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  properties?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
}

/**
 * Revenue metrics structure
  */
export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  subscriptions: {
    active: number;
    new: number;
    cancelled: number;
    churn: number;
  };
  averageRevenuePerUser: number;
  lifetimeValue: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Usage statistics structure
  */
export interface UsageStats {
  userId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  features: Record<string, {
    usage: number;
    limit?: number;
    remaining?: number;
  }>;
  totalApiCalls: number;
  totalProcessingTime: number;
  totalStorageUsed: number;
  quotas: Record<string, {
    used: number;
    limit: number;
    resetDate?: string;
  }>;
}

/**
 * Health check result
  */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version?: string;
  checks: Record<string, {
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration?: number;
    details?: any;
  }>;
}

/**
 * Pagination parameters
  */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Paginated response structure
  */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    nextPage?: number;
    previousPage?: number;
  };
}

/**
 * Firebase validation error structure
  */
export interface FirebaseValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Firebase validation result structure
  */
export interface FirebaseValidationResult<T = any> {
  isValid: boolean;
  errors: FirebaseValidationError[];
  data?: T;
}

/**
 * External API integration result
  */
export interface ExternalApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  duration: number;
  provider: string;
  operation: string;
  timestamp: string;
}

/**
 * Firebase async operation status
  */
export interface FirebaseAsyncOperationStatus {
  operationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  result?: any;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  estimatedCompletion?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Common function configuration
  */
export interface FunctionConfig {
  timeout?: number;
  memory?: '128MB' | '256MB' | '512MB' | '1GB' | '2GB' | '4GB' | '8GB';
  region?: string;
  maxInstances?: number;
  minInstances?: number;
  labels?: Record<string, string>;
}

/**
 * CORS options for functions
  */
export interface CorsOptions {
  origin?: boolean | string | string[] | RegExp | RegExp[];
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

/**
 * Rate limiting configuration
  */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: any) => string;
}

/**
 * Caching configuration
  */
export interface CacheConfig {
  ttl: number;
  maxSize?: number;
  strategy?: 'lru' | 'fifo' | 'lifo';
  namespace?: string;
  compress?: boolean;
}