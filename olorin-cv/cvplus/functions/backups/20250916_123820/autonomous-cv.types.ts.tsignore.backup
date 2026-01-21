// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Autonomous CV Type Definitions
 * Replaces @cvplus/core/types for autonomous operation
 */

// Core CV Data Interfaces
export interface PersonalInfo {
  name: string;
  email: string; // Made required for consistency with ParsedCV
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  summary?: string;
  title?: string;
  profilePicture?: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  position: string; // Added for ParsedCV compatibility
  location?: string;
  startDate: Date | string; // Allow both Date and string for flexibility
  endDate?: Date | string; // Allow both Date and string for flexibility
  current?: boolean;
  description?: string; // Made optional for ParsedCV compatibility
  achievements?: string[];
  technologies?: string[];
  responsibilities?: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  current?: boolean;
  gpa?: string;
  honors?: string[];
  coursework?: string[];
}

export interface Skill {
  name: string;
  category: 'technical' | 'soft' | 'language' | 'certification';
  proficiency?: number;
  yearsExperience?: number;
  verified?: boolean;
}

export interface Language {
  language: string;
  proficiency: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'beginner';
  certifications?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  github?: string;
  startDate?: Date;
  endDate?: Date;
  achievements?: string[];
}

export interface CVMetadata {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  source?: string;
  processingNotes?: string[];
}

// Main CV Data Interface
export interface CVData {
  id: string;
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  certifications: Certification[];
  projects?: Project[];
  metadata: CVMetadata;
  summary?: string;
  customSections?: Record<string, any>;
}

// Parsed CV Data (extends CVData with parsing metadata)
export interface CVParsedData extends CVData {
  parsedAt: Date;
  parsingVersion: string;
  confidence: number;
  extractionQuality: number;
  warnings?: string[];
  suggestions?: string[];
}

// Component Props
export interface CVPreviewProps {
  job: {
    id: string;
    parsedData: CVParsedData;
  };
  selectedTemplate: string;
  selectedFeatures: Record<string, boolean>;
  appliedImprovements?: Partial<CVParsedData>;
  onUpdate?: (data: Partial<CVParsedData>) => void;
  disableComparison?: boolean;
  className?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

// User Interface
export interface User {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  hasCalendarPermissions?: boolean;
}

// Processing Types
export interface ProcessingState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  stage: string;
  error?: ProcessingError;
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ProcessingResult {
  success: boolean;
  data?: CVParsedData;
  error?: string;
  warnings?: string[];
  recommendations?: Recommendation[];
}

export interface Recommendation {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation?: string;
  impact?: string;
}

// Authentication Types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// Configuration Types
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
}

export interface FeatureFlags {
  realTimePreview: boolean;
  advancedAnalysis: boolean;
  cloudStorage: boolean;
}

export interface MonitoringConfig {
  errorReporting: boolean;
  performanceMonitoring: boolean;
  analytics: boolean;
}

export interface EnvironmentConfig {
  firebase: FirebaseConfig;
  api: APIConfig;
  features: FeatureFlags;
  monitoring: MonitoringConfig;
}

// Storage Types
export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  contentType: string;
  lastModified: Date;
  downloadUrl?: string;
}

// Event Types
export type EventHandler = (event: CustomEvent) => void;

export interface ParentAPI {
  getAuthState(): Promise<{ authenticated: boolean; user?: User }>;
  getConfiguration(): Promise<Partial<EnvironmentConfig>>;
}

// Export types for backward compatibility
export type { CVData as CVDataType };
export type { CVParsedData as CVParsedDataType };
export type { User as UserType };
export type { ApiResponse as ApiResponseType };