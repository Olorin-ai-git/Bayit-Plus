/**
 * API Response Types
 * 
 * Standardized API response types for the CVPlus platform.
 * Provides consistent structure for all API communications.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import type { BaseError } from './error';
import type { PaginatedResult } from './utility';

// ============================================================================
// BASE API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: BaseError;
  message?: string;
  timestamp: number;
  requestId?: string;
  version?: string;
}

export interface ApiSuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
  error?: never;
}

export interface ApiErrorResponse extends ApiResponse<never> {
  success: false;
  data?: never;
  error: BaseError;
}

// ============================================================================
// PAGINATED API RESPONSES
// ============================================================================

export interface ApiPaginatedResponse<T = any> extends ApiSuccessResponse<PaginatedResult<T>> {
  data: PaginatedResult<T>;
}

// ============================================================================
// BATCH OPERATION RESPONSES
// ============================================================================

export interface BatchOperationResult<T = any> {
  successful: T[];
  failed: Array<{
    item: T;
    error: BaseError;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface ApiBatchResponse<T = any> extends ApiSuccessResponse<BatchOperationResult<T>> {
  data: BatchOperationResult<T>;
}

// ============================================================================
// STREAMING AND ASYNC OPERATION RESPONSES
// ============================================================================

export interface AsyncOperationStatus {
  operationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  result?: any;
  error?: BaseError;
  createdAt: number;
  updatedAt: number;
  estimatedCompletion?: number;
}

export interface ApiAsyncResponse extends ApiSuccessResponse<AsyncOperationStatus> {
  data: AsyncOperationStatus;
}

export interface StreamChunk<T = any> {
  id: string;
  type: 'data' | 'error' | 'end';
  data?: T;
  error?: BaseError;
  timestamp: number;
}

// ============================================================================
// HEALTH CHECK AND STATUS RESPONSES
// ============================================================================

export interface ServiceStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  uptime: number;
  responseTime: number;
  dependencies?: Record<string, ServiceStatus>;
  metrics?: Record<string, number>;
}

export interface ApiHealthResponse extends ApiSuccessResponse<ServiceStatus> {
  data: ServiceStatus;
}

// ============================================================================
// AUTHENTICATION AND AUTHORIZATION RESPONSES
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope?: string[];
}

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface ApiAuthResponse extends ApiSuccessResponse<{
  tokens: AuthTokens;
  user: UserInfo;
}> {
  data: {
    tokens: AuthTokens;
    user: UserInfo;
  };
}

// ============================================================================
// FILE UPLOAD AND MEDIA RESPONSES
// ============================================================================

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  uploadedAt: number;
}

export interface ApiUploadResponse extends ApiSuccessResponse<UploadedFile> {
  data: UploadedFile;
}

// Multimedia types moved to @cvplus/multimedia
// Import from multimedia module for backward compatibility

// ============================================================================
// ANALYTICS AND METRICS RESPONSES
// ============================================================================

export interface MetricData {
  timestamp: number;
  value: number;
  dimensions?: Record<string, string>;
}

export interface AnalyticsResult {
  metric: string;
  period: {
    start: number;
    end: number;
  };
  data: MetricData[];
  aggregation?: {
    sum: number;
    avg: number;
    min: number;
    max: number;
    count: number;
  };
}

export interface ApiAnalyticsResponse extends ApiSuccessResponse<AnalyticsResult[]> {
  data: AnalyticsResult[];
}

// ============================================================================
// VALIDATION RESPONSES
// ============================================================================

export interface ValidationIssue {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  suggestions?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  score?: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

export interface ApiValidationResponse extends ApiSuccessResponse<ValidationResult> {
  data: ValidationResult;
}

// ============================================================================
// WEBHOOK AND EVENT RESPONSES
// ============================================================================

export interface WebhookEvent<T = any> {
  id: string;
  type: string;
  data: T;
  timestamp: number;
  source: string;
  version: string;
  signature?: string;
}

export interface ApiWebhookResponse extends ApiResponse {
  received: boolean;
  processed: boolean;
  eventId: string;
}