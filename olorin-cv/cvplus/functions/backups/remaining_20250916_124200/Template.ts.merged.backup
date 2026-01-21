// @ts-ignore - Export conflicts/**
 * Template-related type definitions for the CVPlus Workflow module
 */

export type TemplateCategory = 
  | 'professional'
  | 'creative'
  | 'technical'
  | 'academic'
  | 'executive'
  | 'entry-level'
  | 'industry-specific';

export interface CVTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  isPremium: boolean;
  isFeatured: boolean;
  thumbnailUrl?: string;
  previewUrl?: string;
  templateUrl?: string;
  tags: string[];
  compatibility: {
    features: string[]; // Compatible feature IDs
    industries: string[];
    roles: string[];
  };
  styling: {
    colorScheme: string;
    fontFamily: string;
    layout: 'single-column' | 'two-column' | 'multi-column';
    sections: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  version: string;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface TemplateMetadata {
  templateId: string;
  usageCount: number;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  lastUsed?: Date;
  popularWith: {
    industries: string[];
    roles: string[];
    experienceLevels: string[];
  };
  successMetrics: {
    jobApplications: number;
    interviewCallbacks: number;
    successRate: number;
  };
}

export interface PlaceholderValue {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  isRequired: boolean;
  lastUpdated: Date;
  source?: 'user' | 'ai' | 'import' | 'default';
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface PlaceholderTemplate {
  templateId: string;
  placeholders: {
    [key: string]: {
      description: string;
      type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
      required: boolean;
      defaultValue?: any;
      validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
      };
      suggestions?: any[];
      category?: 'personal' | 'contact' | 'experience' | 'education' | 'skills' | 'other';
    };
  };
  sections: {
    [sectionId: string]: {
      title: string;
      placeholders: string[];
      optional: boolean;
      order: number;
    };
  };
}

export interface TemplateCustomization {
  templateId: string;
  userId: string;
  customizations: {
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      text?: string;
    };
    fonts?: {
      heading?: string;
      body?: string;
      size?: 'small' | 'medium' | 'large';
    };
    layout?: {
      margins?: number;
      spacing?: 'compact' | 'normal' | 'spacious';
      sectionOrder?: string[];
    };
    sections?: {
      [sectionId: string]: {
        enabled: boolean;
        customTitle?: string;
        customContent?: string;
      };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateUsage {
  templateId: string;
  userId: string;
  jobId: string;
  startedAt: Date;
  completedAt?: Date;
  customizations?: Record<string, any>;
  outcome?: 'completed' | 'abandoned' | 'switched';
  feedback?: {
    rating: number;
    comments?: string;
    suggestions?: string[];
  };
}