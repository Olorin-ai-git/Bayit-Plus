// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV and Resume Types
 * 
 * Core types for CV/resume data structures and processing.
 * Used across frontend, backend, and processing services.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// PERSONAL INFORMATION TYPES
// ============================================================================

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    address?: string;
  };
  linkedIn?: string;
  website?: string;
  github?: string;
  portfolio?: string;
  summary?: string;
  objective?: string;
  profileImage?: string;
}

// ============================================================================
// EXPERIENCE AND WORK HISTORY TYPES
// ============================================================================

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, undefined for current positions
  isCurrent: boolean;
  description?: string;
  responsibilities: string[];
  achievements: string[];
  technologies?: string[];
  keywords?: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  url?: string;
  githubUrl?: string;
  startDate?: string;
  endDate?: string;
  status?: 'completed' | 'in-progress' | 'maintained';
  highlights: string[];
  role?: string;
  teamSize?: number;
}

// ============================================================================
// EDUCATION AND CERTIFICATION TYPES
// ============================================================================

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: number;
  honors?: string[];
  coursework?: string[];
  thesis?: string;
  activities?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  dateIssued: string;
  expiryDate?: string;
  credentialId?: string;
  verificationUrl?: string;
  description?: string;
  skills?: string[];
}

// ============================================================================
// SKILLS AND COMPETENCIES TYPES
// ============================================================================

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type SkillCategory = 
  | 'programming'
  | 'frameworks'
  | 'databases'
  | 'cloud'
  | 'devops'
  | 'design'
  | 'management'
  | 'communication'
  | 'languages'
  | 'tools'
  | 'other';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsOfExperience?: number;
  endorsements?: number;
  keywords?: string[];
  verified?: boolean;
}

export interface SkillGroup {
  category: SkillCategory;
  name: string;
  skills: Skill[];
}

export interface Language {
  id: string;
  name: string;
  code: string; // ISO language code
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
  certified?: boolean;
  certificationLevel?: string;
}

// ============================================================================
// ACHIEVEMENTS AND AWARDS TYPES
// ============================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  dateReceived: string;
  issuer?: string;
  type: 'award' | 'recognition' | 'publication' | 'patent' | 'competition' | 'other';
  url?: string;
  impact?: string;
  metrics?: Record<string, number>;
}

// ============================================================================
// PARSED CV DATA STRUCTURE
// ============================================================================

export interface CVParsedData {
  personalInfo: PersonalInfo;
  workExperience: WorkExperience[];
  education: Education[];
  skills: SkillGroup[];
  languages: Language[];
  certifications: Certification[];
  projects: Project[];
  achievements: Achievement[];
  references?: Array<{
    id: string;
    name: string;
    position: string;
    company: string;
    email: string;
    phone?: string;
    relationship: string;
  }>;
  additionalSections?: Array<{
    id: string;
    title: string;
    content: string;
    type: 'text' | 'list' | 'table';
  }>;
  metadata?: {
    parsedAt: number;
    parserVersion: string;
    source: 'upload' | 'manual' | 'import';
    originalFormat?: string;
    confidence?: number;
    warnings?: string[];
  };
}

// ============================================================================
// CV ANALYSIS AND ENHANCEMENT TYPES
// ============================================================================

export interface CVAnalysis {
  overallScore: number;
  sections: {
    personalInfo: { score: number; suggestions: string[] };
    workExperience: { score: number; suggestions: string[] };
    education: { score: number; suggestions: string[] };
    skills: { score: number; suggestions: string[] };
    formatting: { score: number; suggestions: string[] };
    keywords: { score: number; suggestions: string[] };
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  missingElements: string[];
  atsCompatibility: number;
  readabilityScore: number;
}

export interface CVEnhancement {
  type: 'suggestion' | 'addition' | 'modification' | 'formatting';
  section: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  before?: string;
  after?: string;
  applied: boolean;
  acceptedAt?: number;
  rejectedAt?: number;
}

// ============================================================================
// CV GENERATION AND OUTPUT TYPES
// ============================================================================

export interface CVOutputFormat {
  type: 'html' | 'pdf' | 'docx' | 'json' | 'xml';
  url: string;
  size: number;
  generatedAt: number;
  version: string;
  metadata?: Record<string, any>;
}

export interface CVGeneration {
  id: string;
  templateId: string;
  data: CVParsedData;
  customizations?: Record<string, any>;
  outputs: CVOutputFormat[];
  features: string[];
  status: 'generating' | 'completed' | 'failed';
  generatedAt: number;
  error?: string;
}

// ============================================================================
// CV COMPARISON AND MATCHING TYPES
// ============================================================================

export interface CVComparison {
  sourceCV: string; // CV ID
  targetCV: string; // CV ID or job description ID
  similarities: {
    skills: Array<{ skill: string; match: number }>;
    experience: Array<{ area: string; match: number }>;
    education: Array<{ field: string; match: number }>;
    keywords: Array<{ keyword: string; frequency: number }>;
  };
  overallMatch: number;
  gaps: {
    missingSkills: string[];
    missingExperience: string[];
    missingKeywords: string[];
  };
  recommendations: string[];
}

// ============================================================================
// PRIVACY AND PII TYPES
// ============================================================================

export type PIIType = 'name' | 'email' | 'phone' | 'address' | 'ssn' | 'dob' | 'other';

export interface PIIDetection {
  detected: Array<{
    type: PIIType;
    value: string;
    location: string; // path in the data structure
    confidence: number;
    suggestion: string;
  }>;
  overallRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface PrivacySettings {
  removePII: boolean;
  anonymizeData: boolean;
  blurPersonalInfo: boolean;
  removePhotos: boolean;
  replacements?: Record<string, string>;
}