export interface Job {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'analyzed' | 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  mimeType?: string;
  isUrl?: boolean;
  parsedData?: any;
  generatedCV?: {
    html: string;
    pdfUrl: string;
    docxUrl: string;
  };
  selectedTemplate?: string;
  selectedFeatures?: string[];
  error?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'modern' | 'classic' | 'creative' | 'minimal' | 'executive';
  isPremium: boolean;
  config: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      text: string;
      background: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
    layout: string;
  };
}

export interface GeneratedFeature {
  id: string;
  widget: string;
  scripts?: string[];
  styles?: string[];
  data?: any;
  requirements?: {
    scripts?: string[];
    styles?: string[];
    apiKeys?: string[];
  };
}

// ============================================================================
// LOGGING TYPES - Re-export from logging package
// ============================================================================

// Export enums as both values and types
export {
  LogLevel,
  LogDomain
} from '@cvplus/logging/backend';

// Export pure types
export type {
  LogEntry
} from '@cvplus/logging/backend';

// ============================================================================
// MIDDLEWARE & ARCHITECTURE TYPES
// ============================================================================

export * from './middleware';

// ============================================================================
// ALL OTHER EXISTING TYPES
// ============================================================================

export * from './api';
export type {
  PersonalInfo,
  Language
} from './cv';
// export * from "./cv-template"; // TODO: Restore after cv-template migration
export * from './error';
export type {
  ParsedCV
} from './enhanced-models';
export * from './firebase';
export * from './industry-specialization';
export * from './status';
export * from './utility';

// ============================================================================
// PORTAL TYPES
// ============================================================================

// export * from "./portal"; // TODO: Restore after portal migration
export * from './regional-localization';

// Template category alias for backward compatibility - disabled due to missing portal.ts
// export { PortalTemplateCategory as TemplateCategory } from './portal';

// ============================================================================
// BOOKING & PAYMENT TYPES - DISABLED (files missing)
// ============================================================================

// export * from './booking.types'; // File does not exist
// export * from './payment.types'; // File does not exist
