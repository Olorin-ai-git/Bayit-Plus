// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV Template Types
 * 
 * Types for CV templates, themes, and customization options.
 * Used by both frontend template selection and backend generation.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// TEMPLATE CATEGORY AND CONFIGURATION TYPES
// ============================================================================

export type TemplateCategory = 
  | 'modern' 
  | 'classic' 
  | 'creative' 
  | 'minimal' 
  | 'executive';

export interface TemplateColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
}

export interface TemplateFonts {
  heading: string;
  body: string;
}

export interface TemplateConfig {
  colors: TemplateColors;
  fonts: TemplateFonts;
  layout: string;
}

// ============================================================================
// CV TEMPLATE INTERFACE
// ============================================================================

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: TemplateCategory;
  isPremium: boolean;
  config: TemplateConfig;
  tags?: string[];
  version?: string;
  createdAt?: any; // Firebase Timestamp
  updatedAt?: any; // Firebase Timestamp
}

// ============================================================================
// TEMPLATE FEATURE TYPES
// ============================================================================

export interface GeneratedFeature {
  id: string;
  widget: string;
  scripts?: string[];
  styles?: string[];
  data?: any;
  requirements?: {
    premium?: boolean;
    template?: string[];
    dependencies?: string[];
  };
}

export interface TemplateFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  isPremium: boolean;
  config?: any;
  supported?: boolean;
}

// ============================================================================
// TEMPLATE OPERATION RESULT TYPES
// ============================================================================

export interface TemplateOperationResult<T = CVTemplate> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TemplateQuery {
  category?: TemplateCategory | TemplateCategory[];
  isPremium?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'category' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// TEMPLATE CUSTOMIZATION TYPES
// ============================================================================

export interface TemplateCustomization {
  templateId: string;
  customColors?: Partial<TemplateColors>;
  customFonts?: Partial<TemplateFonts>;
  customLayout?: string;
  enabledFeatures?: string[];
  customCSS?: string;
}