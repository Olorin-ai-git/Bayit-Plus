// @ts-ignore - Export conflicts/**
 * CV Feature Integration Types for Multimedia Module
 *
 * Types and interfaces for integrating multimedia features with CV processing.
 */

/**
 * Parsed CV data structure from CV processing module
 * This is a subset of the full ParsedCV type from @cvplus/cv-processing
 */
export interface CVData {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  summary?: string;
  experience?: Array<{
    company?: string;
    position?: string;
    duration?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    description?: string;
    achievements?: string[];
    technologies?: string[];
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    graduationDate?: string;
    gpa?: string;
    honors?: string[];
  }>;
  skills?: {
    technical?: string[];
    soft?: string[];
    languages?: string[];
  };
  certifications?: Array<{
    name?: string;
    issuer?: string;
    date?: string;
    credentialId?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    technologies?: string[];
    url?: string;
  }>;
}

/**
 * CV feature generator interface for multimedia features
 */
export interface CVFeature {
  generate(cv: CVData, jobId: string, options?: any): Promise<string>;
  getStyles(): string;
  getScripts(): string;
}

/**
 * Feature generation options
 */
export interface FeatureOptions {
  theme?: 'light' | 'dark' | 'auto';
  customStyles?: string;
  interactive?: boolean;
  [key: string]: any;
}

/**
 * Feature result with metadata
 */
export interface FeatureResult {
  html: string;
  styles: string;
  scripts: string;
  metadata?: {
    generatedAt: Date;
    processingTime?: number;
    error?: string;
  };
}