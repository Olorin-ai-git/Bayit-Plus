/**
 * Processed CV Types
 *
 * Shared TypeScript types for CVPlus processed CV content and AI analysis.
 * Based on data-model.md specification.
 *
 * @fileoverview Structured CV content types including ProcessedCV, PersonalityProfile, and analysis results
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Core Processed CV Interface
// ============================================================================

/**
 * Structured representation of analyzed CV content with AI insights
 */
export interface ProcessedCV {
  // Identity
  /** UUID primary key */
  id: string;
  /** Foreign key to CVJob */
  jobId: string;

  // Personal Information
  /** Extracted personal contact information */
  personalInfo: PersonalInfo;

  // CV Content Sections
  /** Professional summary or objective */
  summary: string;
  /** Work experience history */
  experience: Experience[];
  /** Educational background */
  education: Education[];
  /** Skills categorized by type */
  skills: Skills;
  /** Professional certifications */
  certifications: Certification[];
  /** Notable achievements and awards */
  achievements: Achievement[];
  /** Personal or professional projects */
  projects: Project[];

  // AI Analysis Results
  /** ATS compatibility score (0-100) */
  atsScore: number;
  /** Personality analysis based on CV content */
  personalityInsights: PersonalityProfile;
  /** AI-generated improvement suggestions */
  suggestedImprovements: string[];
  /** Keywords extracted for SEO and matching */
  extractedKeywords: string[];

  // Processing Metadata
  /** Detected language of original CV */
  originalLanguage: string;
  /** AI extraction confidence score (0-100) */
  confidenceScore: number;
  /** AI model version used for processing */
  processingVersion: string;

  // Audit
  /** Processing completion timestamp */
  createdAt: Timestamp;
  /** Last content update timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// Personal Information
// ============================================================================

/**
 * Extracted personal contact information from CV
 */
export interface PersonalInfo {
  /** Full name (required) */
  name: string;
  /** Email address (validated format) */
  email?: string;
  /** Phone number (international format preferred) */
  phone?: string;
  /** Geographic location (city, state/country) */
  location?: string;
  /** LinkedIn profile URL */
  linkedin?: string;
  /** Personal or portfolio website */
  website?: string;
  /** GitHub profile URL */
  github?: string;
  /** Additional professional social links */
  additionalLinks?: SocialLink[];
}

/**
 * Additional social or professional links
 */
export interface SocialLink {
  /** Platform name (e.g., Twitter, Behance) */
  platform: string;
  /** Profile URL */
  url: string;
  /** Link validation status */
  verified: boolean;
}

// ============================================================================
// Work Experience
// ============================================================================

/**
 * Work experience entry with detailed information
 */
export interface Experience {
  /** Company or organization name */
  company: string;
  /** Job title or position */
  position: string;
  /** Start date in YYYY-MM format */
  startDate: string;
  /** End date in YYYY-MM format (null for current position) */
  endDate?: string;
  /** Work location (city, state/country) */
  location?: string;
  /** Job description or summary */
  description: string;
  /** Specific achievements and accomplishments */
  achievements: string[];
  /** Skills used or developed in this role */
  skills: string[];
  /** Employment type (full-time, contract, etc.) */
  employmentType: EmploymentType;
  /** Company industry or sector */
  industry?: string;
}

/**
 * Employment type categories
 */
export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
  INTERNSHIP = 'internship',
  VOLUNTEER = 'volunteer'
}

// ============================================================================
// Education
// ============================================================================

/**
 * Educational background entry
 */
export interface Education {
  /** Educational institution name */
  institution: string;
  /** Degree type (Bachelor's, Master's, PhD, etc.) */
  degree: string;
  /** Field of study or major */
  field: string;
  /** Start date in YYYY-MM format */
  startDate: string;
  /** End date in YYYY-MM format (null for in progress) */
  endDate?: string;
  /** Grade Point Average or equivalent */
  gpa?: string;
  /** Academic achievements, honors, awards */
  achievements: string[];
  /** Relevant coursework or specializations */
  coursework?: string[];
  /** Thesis or capstone project title */
  thesis?: string;
}

// ============================================================================
// Skills Management
// ============================================================================

/**
 * Comprehensive skills categorization
 */
export interface Skills {
  /** Technical skills (programming, software, tools) */
  technical: string[];
  /** Soft skills (communication, leadership, etc.) */
  soft: string[];
  /** Language proficiencies */
  languages: LanguageProficiency[];
  /** Software tools and platforms */
  tools: string[];
}

/**
 * Language proficiency with standardized levels
 */
export interface LanguageProficiency {
  /** Language name */
  language: string;
  /** Proficiency level using CEFR-like scale */
  level: ProficiencyLevel;
}

/**
 * Standardized proficiency levels
 */
export enum ProficiencyLevel {
  /** Native or bilingual proficiency */
  NATIVE = 'native',
  /** Full professional proficiency */
  FLUENT = 'fluent',
  /** Professional working proficiency */
  ADVANCED = 'advanced',
  /** Limited working proficiency */
  INTERMEDIATE = 'intermediate',
  /** Elementary proficiency */
  BASIC = 'basic'
}

// ============================================================================
// Certifications
// ============================================================================

/**
 * Professional certification with verification details
 */
export interface Certification {
  /** Certification name or title */
  name: string;
  /** Issuing organization */
  issuer: string;
  /** Date certification was issued (YYYY-MM format) */
  dateIssued: string;
  /** Expiration date if applicable (YYYY-MM format) */
  expirationDate?: string;
  /** Unique credential identifier */
  credentialId?: string;
  /** URL for verification */
  verificationUrl?: string;
  /** Current certification status */
  status: CertificationStatus;
}

/**
 * Certification status options
 */
export enum CertificationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PENDING = 'pending',
  REVOKED = 'revoked'
}

// ============================================================================
// Achievements
// ============================================================================

/**
 * Notable achievements and awards
 */
export interface Achievement {
  /** Achievement title or award name */
  title: string;
  /** Detailed description */
  description: string;
  /** Date achieved (YYYY-MM format) */
  date?: string;
  /** Achievement category */
  category: AchievementCategory;
  /** Issuing organization if applicable */
  issuer?: string;
}

/**
 * Achievement categories for organization
 */
export enum AchievementCategory {
  AWARD = 'award',
  RECOGNITION = 'recognition',
  COMPETITION = 'competition',
  PUBLICATION = 'publication',
  SPEAKING = 'speaking',
  LEADERSHIP = 'leadership',
  VOLUNTEER = 'volunteer',
  OTHER = 'other'
}

// ============================================================================
// Projects
// ============================================================================

/**
 * Personal or professional project details
 */
export interface Project {
  /** Project name */
  name: string;
  /** Project description and outcomes */
  description: string;
  /** Technologies, tools, or skills used */
  technologies: string[];
  /** Project URL (demo, repository, etc.) */
  url?: string;
  /** Project start date (YYYY-MM format) */
  startDate?: string;
  /** Project end date (YYYY-MM format) */
  endDate?: string;
  /** Project status */
  status: ProjectStatus;
  /** Role in the project */
  role?: string;
}

/**
 * Project status options
 */
export enum ProjectStatus {
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled'
}

// ============================================================================
// Personality Analysis
// ============================================================================

/**
 * AI-generated personality profile based on CV content
 */
export interface PersonalityProfile {
  /** Myers-Briggs Type Indicator (4-letter code) */
  mbtiType?: string;
  /** Big Five personality model scores (0-100) */
  bigFiveScores: BigFiveScores;
  /** Inferred working style preferences */
  workingStyle: string[];
  /** Suggested ideal roles based on profile */
  idealRoles: string[];
  /** Personality analysis confidence score */
  analysisConfidence: number;
}

/**
 * Big Five personality model scores
 */
export interface BigFiveScores {
  /** Openness to experience (0-100) */
  openness: number;
  /** Conscientiousness (0-100) */
  conscientiousness: number;
  /** Extraversion (0-100) */
  extraversion: number;
  /** Agreeableness (0-100) */
  agreeableness: number;
  /** Neuroticism (0-100) */
  neuroticism: number;
}

// ============================================================================
// Validation and Utilities
// ============================================================================

/**
 * Validate ProcessedCV data before database operations
 */
export function validateProcessedCV(cv: Partial<ProcessedCV>): string[] {
  const errors: string[] = [];

  // Required fields validation
  if (!cv.jobId) errors.push('Job ID is required');
  if (!cv.personalInfo) errors.push('Personal information is required');

  // ATS score validation
  if (cv.atsScore !== undefined) {
    if (cv.atsScore < 0 || cv.atsScore > 100) {
      errors.push('ATS score must be between 0 and 100');
    }
  }

  // Confidence score validation
  if (cv.confidenceScore !== undefined) {
    if (cv.confidenceScore < 0 || cv.confidenceScore > 100) {
      errors.push('Confidence score must be between 0 and 100');
    }
  }

  // Personal info validation
  if (cv.personalInfo) {
    const personalInfoErrors = validatePersonalInfo(cv.personalInfo);
    errors.push(...personalInfoErrors);
  }

  // Experience validation
  if (cv.experience) {
    cv.experience.forEach((exp, index) => {
      const expErrors = validateExperience(exp);
      errors.push(...expErrors.map(err => `Experience ${index + 1}: ${err}`));
    });
  }

  // Education validation
  if (cv.education) {
    cv.education.forEach((edu, index) => {
      const eduErrors = validateEducation(edu);
      errors.push(...eduErrors.map(err => `Education ${index + 1}: ${err}`));
    });
  }

  return errors;
}

/**
 * Validate personal information
 */
export function validatePersonalInfo(info: Partial<PersonalInfo>): string[] {
  const errors: string[] = [];

  if (!info.name || info.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (info.email && !isValidEmail(info.email)) {
    errors.push('Invalid email format');
  }

  if (info.linkedin && !isValidUrl(info.linkedin)) {
    errors.push('Invalid LinkedIn URL');
  }

  if (info.website && !isValidUrl(info.website)) {
    errors.push('Invalid website URL');
  }

  if (info.github && !isValidUrl(info.github)) {
    errors.push('Invalid GitHub URL');
  }

  return errors;
}

/**
 * Validate work experience entry
 */
export function validateExperience(exp: Partial<Experience>): string[] {
  const errors: string[] = [];

  if (!exp.company) errors.push('Company name is required');
  if (!exp.position) errors.push('Position is required');
  if (!exp.startDate) errors.push('Start date is required');

  if (exp.startDate && !isValidDateFormat(exp.startDate)) {
    errors.push('Start date must be in YYYY-MM format');
  }

  if (exp.endDate && !isValidDateFormat(exp.endDate)) {
    errors.push('End date must be in YYYY-MM format');
  }

  if (exp.startDate && exp.endDate && exp.startDate > exp.endDate) {
    errors.push('End date must be after start date');
  }

  return errors;
}

/**
 * Validate education entry
 */
export function validateEducation(edu: Partial<Education>): string[] {
  const errors: string[] = [];

  if (!edu.institution) errors.push('Institution is required');
  if (!edu.degree) errors.push('Degree is required');
  if (!edu.field) errors.push('Field of study is required');

  if (edu.startDate && !isValidDateFormat(edu.startDate)) {
    errors.push('Start date must be in YYYY-MM format');
  }

  if (edu.endDate && !isValidDateFormat(edu.endDate)) {
    errors.push('End date must be in YYYY-MM format');
  }

  return errors;
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if an object is a ProcessedCV
 */
export function isProcessedCV(obj: any): obj is ProcessedCV {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.jobId === 'string' &&
    typeof obj.personalInfo === 'object' &&
    typeof obj.summary === 'string' &&
    Array.isArray(obj.experience) &&
    Array.isArray(obj.education) &&
    typeof obj.skills === 'object' &&
    typeof obj.atsScore === 'number' &&
    obj.createdAt instanceof Timestamp
  );
}

/**
 * Email format validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * URL format validation
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Date format validation (YYYY-MM)
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}$/;
  return dateRegex.test(date);
}

/**
 * Calculate years of experience from experience array
 */
export function calculateYearsOfExperience(experiences: Experience[]): number {
  let totalMonths = 0;

  experiences.forEach(exp => {
    const startYear = parseInt(exp.startDate.split('-')[0]);
    const startMonth = parseInt(exp.startDate.split('-')[1]);

    let endYear: number;
    let endMonth: number;

    if (exp.endDate) {
      endYear = parseInt(exp.endDate.split('-')[0]);
      endMonth = parseInt(exp.endDate.split('-')[1]);
    } else {
      const now = new Date();
      endYear = now.getFullYear();
      endMonth = now.getMonth() + 1;
    }

    const months = (endYear - startYear) * 12 + (endMonth - startMonth);
    totalMonths += Math.max(0, months);
  });

  return Math.round((totalMonths / 12) * 10) / 10; // Round to 1 decimal place
}

/**
 * Extract all skills from ProcessedCV into a flat array
 */
export function getAllSkills(cv: ProcessedCV): string[] {
  const allSkills = new Set<string>();

  // Add technical skills
  cv.skills.technical.forEach(skill => allSkills.add(skill));

  // Add soft skills
  cv.skills.soft.forEach(skill => allSkills.add(skill));

  // Add tools
  cv.skills.tools.forEach(tool => allSkills.add(tool));

  // Add skills from experience
  cv.experience.forEach(exp => {
    exp.skills.forEach(skill => allSkills.add(skill));
  });

  return Array.from(allSkills);
}

/**
 * Get career progression score based on roles and timeline
 */
export function getCareerProgressionScore(experiences: Experience[]): number {
  if (experiences.length === 0) return 0;

  // Sort by start date
  const sortedExperiences = [...experiences].sort((a, b) => a.startDate.localeCompare(b.startDate));

  let progressionScore = 0;
  let totalYears = calculateYearsOfExperience(experiences);

  // Factors: number of positions, career length, title progression
  const positionScore = Math.min(sortedExperiences.length * 10, 30);
  const longevityScore = Math.min(totalYears * 5, 40);
  const diversityScore = new Set(sortedExperiences.map(exp => exp.industry)).size * 5;

  progressionScore = positionScore + longevityScore + diversityScore;
  return Math.min(progressionScore, 100);
}

/**
 * Get education level score
 */
export function getEducationScore(education: Education[]): number {
  if (education.length === 0) return 0;

  let score = 0;

  education.forEach(edu => {
    const degree = edu.degree.toLowerCase();
    if (degree.includes('phd') || degree.includes('doctorate')) score += 40;
    else if (degree.includes('master')) score += 30;
    else if (degree.includes('bachelor')) score += 20;
    else if (degree.includes('associate')) score += 10;
    else score += 5;
  });

  return Math.min(score, 100);
}