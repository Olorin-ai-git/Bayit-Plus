/**
 * Role Profile Types
 * Type definitions for role-based profile analysis and matching
  */

export interface RoleProfile {
  id: string;
  name: string;
  title: string;
  industry: string;
  level: 'entry' | 'mid' | 'senior' | 'executive';
  skills: string[];
  responsibilities: string[];
  requirements: {
    education: string[];
    experience: string;
    certifications?: string[];
  };
  keywords: string[];
  atsScore: number;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  location?: {
    type: 'remote' | 'hybrid' | 'onsite';
    regions: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleMatch {
  profileId: string;
  score: number;
  reasons: string[];
  gaps: string[];
  recommendations: string[];
}

export interface RoleAnalysis {
  detectedRole: string;
  confidence: number;
  matches: RoleMatch[];
  suggestions: {
    skillGaps: string[];
    experienceGaps: string[];
    recommendations: string[];
  };
}

export interface RoleProfileConfig {
  enableAnalysis: boolean;
  matchThreshold: number;
  maxMatches: number;
  includeGaps: boolean;
  includeSuggestions: boolean;
}

export enum RoleLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  EXECUTIVE = 'executive'
}

export enum Industry {
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  MANUFACTURING = 'manufacturing',
  RETAIL = 'retail',
  OTHER = 'other'
}

export enum RoleCategory {
  ENGINEERING = 'engineering',
  DESIGN = 'design',
  PRODUCT = 'product',
  MARKETING = 'marketing',
  SALES = 'sales',
  OPERATIONS = 'operations',
  FINANCE = 'finance',
  HR = 'hr',
  LEGAL = 'legal',
  OTHER = 'other'
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  EXECUTIVE = 'executive'
}

export enum CVSection {
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  PROJECTS = 'projects',
  CERTIFICATIONS = 'certifications',
  ACHIEVEMENTS = 'achievements',
  LANGUAGES = 'languages',
  INTERESTS = 'interests'
}