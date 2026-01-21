// Re-export ParsedCV from job types for backward compatibility
export type { ParsedCV } from './job';

export interface CVAnalysis {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  score: number;
}

export interface CVEnhancement {
  originalText: string;
  enhancedText: string;
  improvements: string[];
  confidence: number;
}

export interface PersonalInfo {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  dateOfBirth?: string;
  nationality?: string;
}

export interface Language {
  language: string;
  proficiency: string;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native';
}