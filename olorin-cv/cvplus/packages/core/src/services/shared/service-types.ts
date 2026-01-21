/**
 * Service Types - Stub implementation for Core module
 * Note: These types should be moved to appropriate domain modules
  */

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface HealthCheckResult {
  healthy: boolean;
  service: string;
  details?: any;
}

export interface CVProcessingContext {
  jobId: string;
  userId: string;
  cvData: any;
  selectedFeatures?: string[];
  templateId?: string;
  timestamp: Date;
}

export interface CVGenerationResult {
  html: string;
  pdfUrl?: string;
  docxUrl?: string;
  metadata: {
    templateUsed: string;
    generationTime: number;
    features: string[];
  };
}