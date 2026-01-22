/**
 * Base Job and CV types
 * Core data models for CV processing
 */

/**
 * Job status tracking
 */
export type JobStatus =
  | 'PENDING'
  | 'PARSING'
  | 'ANALYZING'
  | 'ENHANCING'
  | 'COMPLETED'
  | 'FAILED';

/**
 * Job visibility settings
 */
export type JobVisibility = 'PRIVATE' | 'PUBLIC' | 'SHARED';

/**
 * Base Job interface
 */
export interface Job {
  id: string;
  userId: string;
  status: JobStatus;
  visibility: JobVisibility;
  originalFileName: string;
  fileUrl: string;
  parsedData?: ParsedCV;
  privacySettings?: any;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Parsed CV data structure
 */
export interface ParsedCV {
  personalInfo?: PersonalInfo;
  summary?: string;
  experience?: Experience[];
  education?: Education[];
  skills?: Skills;
  languages?: Language[];
  certifications?: string[];
  achievements?: string[];
  projects?: Project[];
  publications?: Publication[];
  references?: Reference[];
  customSections?: CustomSection[];
}

export interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  portfolio?: string;
  profileImage?: string;
}

export interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  location?: string;
  description?: string;
  achievements?: string[];
  technologies?: string[];
  duration?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  year: string;
  gpa?: string;
  honors?: string[];
  coursework?: string[];
}

export interface Skills {
  technical?: string[];
  soft?: string[];
  tools?: string[];
  frameworks?: string[];
  languages?: string[];
  categories?: SkillCategory[];
}

export interface SkillCategory {
  name: string;
  skills: string[];
}

export interface Language {
  name: string;
  proficiency: 'native' | 'fluent' | 'professional' | 'conversational' | 'basic';
}

export interface Project {
  name: string;
  description: string;
  role?: string;
  technologies?: string[];
  url?: string;
  startDate?: string;
  endDate?: string;
}

export interface Publication {
  title: string;
  authors?: string[];
  venue: string;
  year: string;
  url?: string;
  doi?: string;
}

export interface Reference {
  name: string;
  title: string;
  company: string;
  email?: string;
  phone?: string;
  relationship?: string;
}

export interface CustomSection {
  title: string;
  content: string;
  order?: number;
}
