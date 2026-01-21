/**
 * Enhanced CV models for workflow processing
  */

export interface ParsedCV {
  id: string;
  userId: string;
  personalInfo: {
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    linkedIn?: string;
    website?: string;
    github?: string;
  };
  summary?: string;
  experience: WorkExperience[]; // Alias for workExperience for backwards compatibility
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  certifications?: Certification[];
  languages?: Language[];
  projects?: Project[];
  achievements?: Achievement[];
  references?: Reference[];
  metadata: {
    parsedAt: Date;
    source: 'upload' | 'manual' | 'import';
    version: string;
    confidence: number;
  };
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description: string;
  responsibilities: string[];
  achievements: string[];
  technologies?: string[];
  location?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  gpa?: string;
  honors?: string;
  coursework?: string[];
  location?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'language' | 'tool' | 'framework';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsExperience?: number;
  verified?: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialId?: string;
  url?: string;
  verified?: boolean;
}

export interface Language {
  id: string;
  name: string;
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
  certifications?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  startDate: Date;
  endDate?: Date;
  url?: string;
  repository?: string;
  highlights: string[];
  role?: string;
  teamSize?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: 'award' | 'publication' | 'presentation' | 'volunteer' | 'other';
  organization?: string;
  url?: string;
}

export interface Reference {
  id: string;
  name: string;
  position: string;
  company: string;
  email?: string;
  phone?: string;
  relationship: string;
  yearsKnown?: number;
}

// Enhanced processing interfaces
export interface EnhancementJob {
  id: string;
  cvId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  enhancements: Enhancement[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface Enhancement {
  type: 'grammar' | 'formatting' | 'content' | 'optimization' | 'ai-suggestion';
  section: string;
  field: string;
  originalValue: string;
  suggestedValue: string;
  confidence: number;
  applied: boolean;
  appliedAt?: Date;
  reason: string;
}