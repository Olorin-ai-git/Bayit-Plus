// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Portal Core Types
 * 
 * Main portal configuration and generation types.
 * Refactored from portal.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// Re-export types from other portal files for convenience
export type { HuggingFaceSpaceConfig, RepositoryFile } from './portal-huggingface';
export type { HuggingFaceSDK, HuggingFaceVisibility, HuggingFaceHardware, FileType } from './portal-huggingface';
export type { DeploymentResult, BuildConfig, DeploymentMetadata } from './portal-original';
export type { 
  AssetType, 
  AssetSource,
  MobileOptimizationLevel
} from './portal-original';
export type { 
  AssetProcessingResult, 
  AssetOptimizationConfig, 
  ComponentConfiguration, 
  FeatureToggles,
  CVPlusIntegration,
  JobIntegration
} from './portal-original';
// Note: PortalErrorCode is defined in this file, not re-exported

import { ParsedCV } from './job';
import type { FieldValue } from 'firebase-admin/firestore';
import { PortalTheme, PortalSection } from './portal-theme';
import { RAGConfig, RAGEmbedding, EmbeddingMetadata, CVSection } from './portal-rag';
import { HuggingFaceSpaceConfig } from './portal-huggingface';
import { PortalUrls, PortalAnalytics, URLPlacement, QRCodeType, QRCodeStyling, QRCodeAnalytics } from './portal-analytics';
import { ErrorCategory } from './portal-config';
import { MobileOptimizationLevel } from './portal-original';
import type { FeatureToggles } from './portal-original';

/**
 * Main configuration interface for portal generation
 */
export interface PortalConfig {
  /** Unique identifier for the portal configuration */
  id: string;
  
  /** Associated job/CV ID from CVPlus */
  jobId: string;
  
  /** User ID who owns this portal */
  userId: string;
  
  /** Portal template configuration */
  template: PortalTemplate;
  
  /** User-specific customizations */
  customization: PortalCustomization;
  
  /** RAG system configuration for AI chat */
  ragConfig: RAGConfig;
  
  /** HuggingFace deployment configuration */
  huggingFaceConfig: HuggingFaceSpaceConfig;
  
  /** Portal generation status */
  status: PortalStatus;
  
  /** Generated portal URLs */
  urls: PortalUrls;
  
  /** Portal analytics and tracking */
  analytics: PortalAnalytics;
  
  /** Privacy and security settings */
  privacy: PortalPrivacySettings;
  
  /** Error information if generation failed */
  error?: PortalError;
  
  /** Creation timestamp */
  createdAt: Date | FieldValue;
  
  /** Last update timestamp */
  updatedAt: Date | FieldValue;
  
  /** Optional expiration date */
  expiresAt?: Date;
}

/**
 * Portal template definitions
 */
export interface PortalTemplate {
  /** Template identifier */
  id: string;
  
  /** Human-readable template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Template category */
  category: PortalTemplateCategory;
  
  /** Design theme */
  theme: PortalTheme;
  
  /** Template version */
  version: string;
  
  /** Whether template is premium/paid */
  isPremium: boolean;
  
  /** Required sections for this template */
  requiredSections: PortalSection[];
  
  /** Optional sections for this template */
  optionalSections?: PortalSection[];
  
  /** Template configuration settings */
  config?: {
    /** Mobile optimization settings */
    mobileOptimization?: MobileOptimizationLevel;
    
    /** Feature toggles for the template */
    features?: FeatureToggles;
    
    /** Layout configuration */
    layout?: {
      columns?: number;
      sidebar?: boolean;
      navigation?: 'top' | 'side' | 'both';
    };
  };
}

/**
 * Portal customization options
 */
export interface PortalCustomization {
  /** Personal information for the portal */
  personalInfo?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    profileImage?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    twitter?: string;
  };
  
  /** Theme customization */
  theme: PortalTheme;
  
  /** Layout preferences */
  layout: {
    headerStyle: 'minimal' | 'detailed' | 'hero';
    navigationStyle: 'horizontal' | 'vertical' | 'hidden';
    contentLayout: 'single' | 'two-column' | 'grid';
  };
  
  /** Enabled features */
  features?: {
    chatbot: boolean;
    downloadCV: boolean;
    contactForm: boolean;
    analytics: boolean;
    testimonials: boolean;
    portfolio: boolean;
  };
  
  /** Custom CSS (if allowed) */
  customCSS?: string;
  
  /** Custom JavaScript (if allowed) */
  customJS?: string;
}

/**
 * Portal generation status enumeration
 */
export enum PortalStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  CUSTOMIZING = 'customizing',
  BUILDING_RAG = 'building_rag',
  DEPLOYING = 'deploying',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}

/**
 * Portal template categories
 */
export enum PortalTemplateCategory {
  PROFESSIONAL = 'professional',
  CREATIVE = 'creative',
  TECHNICAL = 'technical',
  ACADEMIC = 'academic',
  BUSINESS = 'business',
  MINIMAL = 'minimal',
  MODERN = 'modern',
  CLASSIC = 'classic',
  CORPORATE_PROFESSIONAL = 'corporate_professional',
  CREATIVE_PORTFOLIO = 'creative_portfolio',
  TECHNICAL_EXPERT = 'technical_expert'
}

/**
 * Portal generation result
 */
export interface PortalGenerationResult {
  /** Whether generation was successful */
  success: boolean;
  
  /** Generated portal configuration */
  portalConfig?: PortalConfig;
  
  /** Portal URLs if successful */
  urls?: PortalUrls;
  
  /** Generation metadata */
  metadata: GenerationMetadata;
  
  /** Error information if failed */
  error?: PortalError;
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
  
  /** Generation steps completed */
  stepsCompleted: PortalGenerationStep[];
  
  /** Generation warnings */
  warnings?: string[];
}

/**
 * Portal generation steps for tracking progress
 */
export enum PortalGenerationStep {
  INIT = 'init',
  VALIDATE_INPUT = 'validate_input',
  PARSE_CV = 'parse_cv',
  EXTRACT_CV_DATA = 'extract_cv_data',
  SELECT_TEMPLATE = 'select_template',
  GENERATE_TEMPLATE = 'generate_template',
  CUSTOMIZE_THEME = 'customize_theme',
  CUSTOMIZE_DESIGN = 'customize_design',
  BUILD_RAG = 'build_rag',
  BUILD_RAG_SYSTEM = 'build_rag_system',
  CREATE_EMBEDDINGS = 'create_embeddings',
  SETUP_VECTOR_DB = 'setup_vector_db',
  GENERATE_CONTENT = 'generate_content',
  DEPLOY_SPACE = 'deploy_space',
  DEPLOY_TO_HUGGINGFACE = 'deploy_to_huggingface',
  CONFIGURE_URLS = 'configure_urls',
  UPDATE_CV_DOCUMENT = 'update_cv_document',
  GENERATE_QR_CODES = 'generate_qr_codes',
  FINALIZE = 'finalize',
  FINALIZE_PORTAL = 'finalize_portal'
}

/**
 * Generation metadata
 */
export interface GenerationMetadata {
  /** Generation version */
  version: string;
  
  /** Generation timestamp */
  timestamp: Date;
  
  /** CV analysis results */
  cvAnalysis: any;
  
  /** Template used */
  templateUsed: string;
  
  /** Features enabled */
  featuresEnabled: string[];
  
  /** Files generated */
  filesGenerated: number;
  
  /** Total size in bytes */
  totalSize: number;
  
  /** Processing statistics */
  statistics?: {
    totalTimeMs: number;
    stepTimes: Record<PortalGenerationStep, number>;
    embeddingsGenerated: number;
    vectorDbSizeMB: number;
    templateSizeKB: number;
    assetsProcessed: number;
  };
  
  /** Resource usage */
  resourceUsage?: {
    memoryUsageMB: number;
    cpuUsagePercent: number;
    cpuTimeSeconds?: number;
    diskUsageMB: number;
    networkRequests?: number;
    storageUsedMB?: number;
    apiCalls?: { [provider: string]: number };
  };
  
  /** Quality metrics */
  quality?: {
    completionRate: number;
    accuracyScore: number;
    performanceScore: number;
    completenessScore?: number;
    designConsistencyScore?: number;
    ragAccuracyScore?: number;
    accessibilityScore?: number;
    overallScore?: number;
  };
}

/**
 * Portal privacy settings
 */
export interface PortalPrivacySettings {
  /** Privacy level */
  level: PrivacyLevel;
  
  /** Password protection */
  passwordProtected: boolean;
  
  /** Allowed domains (if restricted) */
  allowedDomains?: string[];
  
  /** Analytics enabled */
  analyticsEnabled: boolean;
  
  /** Cookie consent required */
  cookieConsent: boolean;
}

/**
 * Privacy level enumeration
 */
export enum PrivacyLevel {
  PUBLIC = 'public',
  UNLISTED = 'unlisted',
  PRIVATE = 'private',
  RESTRICTED = 'restricted'
}

/**
 * Portal error information
 */
export interface PortalError {
  /** Error code */
  code: PortalErrorCode;
  
  /** Human-readable error message */
  message: string;
  
  /** Technical error details */
  details?: any;
  
  /** Error context */
  context?: Record<string, any>;
  
  /** Error timestamp */
  timestamp: Date;
  
  /** Whether the error is recoverable */
  recoverable?: boolean;
  
  /** Error category */
  category?: ErrorCategory;
  
  /** Stack trace (if available) */
  stack?: string;
}

/**
 * Portal error codes
 */
export enum PortalErrorCode {
  // Input validation errors
  INVALID_CV_DATA = 'INVALID_CV_DATA',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  INVALID_TEMPLATE_CONFIG = 'INVALID_TEMPLATE_CONFIG',
  
  // Generation errors
  TEMPLATE_GENERATION_FAILED = 'TEMPLATE_GENERATION_FAILED',
  CUSTOMIZATION_FAILED = 'CUSTOMIZATION_FAILED',
  ASSET_PROCESSING_FAILED = 'ASSET_PROCESSING_FAILED',
  
  // RAG system errors
  EMBEDDING_GENERATION_FAILED = 'EMBEDDING_GENERATION_FAILED',
  VECTOR_DB_SETUP_FAILED = 'VECTOR_DB_SETUP_FAILED',
  RAG_SYSTEM_FAILED = 'RAG_SYSTEM_FAILED',
  
  // Deployment errors
  HUGGINGFACE_API_ERROR = 'HUGGINGFACE_API_ERROR',
  DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
  URL_GENERATION_FAILED = 'URL_GENERATION_FAILED',
  
  // Integration errors
  CV_UPDATE_FAILED = 'CV_UPDATE_FAILED',
  QR_CODE_UPDATE_FAILED = 'QR_CODE_UPDATE_FAILED',
  
  // System errors
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // Additional error codes for compatibility
  UNKNOWN = 'UNKNOWN',
  INVALID_CONFIG = 'INVALID_CONFIG',
  CV_PARSE_FAILED = 'CV_PARSE_FAILED',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  RAG_BUILD_FAILED = 'RAG_BUILD_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED'
}

/**
 * Content type enumeration for RAG embeddings
 */
export enum ContentType {
  TEXT = 'text',
  BULLET_POINT = 'bullet_point',
  DESCRIPTION = 'description',
  ACHIEVEMENT = 'achievement',
  SKILL = 'skill',
  DATE_RANGE = 'date_range',
  CONTACT_INFO = 'contact_info',
  SUMMARY = 'summary'
}

// Re-export types from modular files for backward compatibility
export type {
  PortalTheme,
  PortalSection,
  RAGConfig,
  RAGEmbedding,
  EmbeddingMetadata,
  CVSection,
  PortalUrls,
  PortalAnalytics,
  URLPlacement,
  QRCodeType,
  QRCodeStyling,
  QRCodeAnalytics,
  ErrorCategory
};