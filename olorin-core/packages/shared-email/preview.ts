import type { EmailLanguage } from './types';

/** Template preview request */
export interface TemplatePreviewRequest {
  templateName: string;
  language: EmailLanguage;
  context?: Record<string, unknown>;
}

/** Template preview response */
export interface TemplatePreviewResponse {
  html: string;
  plainText: string;
  subject: string;
  templateName: string;
  language: EmailLanguage;
  renderedAt: string;
}

/** Template list item */
export interface TemplateListItem {
  name: string;
  category: string;
  description: string;
  requiredContext: string[];
  supportedLanguages: EmailLanguage[];
  lastModified: string;
}

/** Template list response */
export interface TemplateListResponse {
  templates: TemplateListItem[];
  total: number;
}
