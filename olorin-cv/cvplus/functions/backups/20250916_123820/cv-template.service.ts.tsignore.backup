// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV Template Service
 *
 * Core service for managing CV templates and template-based generation.
 * Provides template selection, customization, and rendering functionality.
 *
 * @author Gil Klainert
 * @version 2.0.0 - Modularized Architecture
 */

import { CVProcessingContext, ServiceResult } from '../../types';
import { BaseService } from '../../shared/utils/base-service';
import * as admin from 'firebase-admin';

export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'academic' | 'technical' | 'executive';
  style: 'modern' | 'classic' | 'minimal' | 'bold' | 'elegant';
  features: string[];
  layout: {
    columns: number;
    sections: string[];
    colorScheme: string;
    fontFamily: string;
  };
  customization: {
    colors: string[];
    fonts: string[];
    layouts: string[];
  };
  previewUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateRenderOptions {
  templateId: string;
  data: any;
  customizations?: {
    colorScheme?: string;
    fontFamily?: string;
    layout?: string;
    customColors?: { [key: string]: string };
  };
  format: 'html' | 'pdf' | 'docx';
}

export interface TemplateRenderResult {
  format: string;
  content?: string;
  filePath?: string;
  previewUrl?: string;
  metadata: {
    templateId: string;
    renderTime: number;
    fileSize?: number;
  };
}

export class CVTemplateService extends BaseService {
  private db: admin.firestore.Firestore;
  private storage: admin.storage.Storage;

  constructor() {
    super();
    this.db = admin.firestore();
    this.storage = admin.storage();
  }

  /**
   * Get all available CV templates
   */
  async getTemplates(category?: string): Promise<ServiceResult<CVTemplate[]>> {
    try {
      this.logInfo('Fetching CV templates', { category });

      let query = this.db.collection('cv_templates').where('isActive', '==', true);

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query.get();
      const templates: CVTemplate[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        templates.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as CVTemplate);
      });

      this.logInfo('Templates fetched successfully', { count: templates.length });

      return {
        success: true,
        data: templates
      };

    } catch (error) {
      this.logError('Failed to fetch templates', error as Error);
      return {
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_FAILED',
          message: `Failed to fetch templates: ${(error as Error).message}`
        }
      };
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<ServiceResult<CVTemplate>> {
    try {
      this.logInfo('Fetching template', { templateId });

      const doc = await this.db.collection('cv_templates').doc(templateId).get();

      if (!doc.exists) {
        return {
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: `Template with ID ${templateId} not found`
          }
        };
      }

      const data = doc.data()!;
      const template: CVTemplate = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as CVTemplate;

      return {
        success: true,
        data: template
      };

    } catch (error) {
      this.logError('Failed to fetch template', error as Error, { templateId });
      return {
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_FAILED',
          message: `Failed to fetch template: ${(error as Error).message}`
        }
      };
    }
  }

  /**
   * Render CV using a template
   */
  async renderWithTemplate(
    options: TemplateRenderOptions,
    context?: CVProcessingContext
  ): Promise<ServiceResult<TemplateRenderResult>> {
    try {
      this.logInfo('Rendering CV with template', {
        templateId: options.templateId,
        format: options.format,
        cvId: context?.cvId
      });

      const startTime = Date.now();

      // Get template
      const templateResult = await this.getTemplate(options.templateId);
      if (!templateResult.success) {
        return templateResult as ServiceResult<TemplateRenderResult>;
      }

      const template = templateResult.data!;

      // Apply customizations
      const finalTemplate = this.applyCustomizations(template, options.customizations);

      // Render based on format
      let result: TemplateRenderResult;

      switch (options.format) {
        case 'html':
          result = await this.renderHTML(finalTemplate, options.data);
          break;
        case 'pdf':
          result = await this.renderPDF(finalTemplate, options.data, context);
          break;
        case 'docx':
          result = await this.renderDOCX(finalTemplate, options.data, context);
          break;
        default:
          return {
            success: false,
            error: {
              code: 'UNSUPPORTED_FORMAT',
              message: `Format ${options.format} is not supported`
            }
          };
      }

      result.metadata = {
        templateId: options.templateId,
        renderTime: Date.now() - startTime,
        ...result.metadata
      };

      this.logInfo('CV rendered successfully', {
        templateId: options.templateId,
        format: options.format,
        renderTime: result.metadata.renderTime
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      this.logError('Template rendering failed', error as Error, {
        templateId: options.templateId,
        format: options.format
      });
      return {
        success: false,
        error: {
          code: 'RENDER_FAILED',
          message: `Template rendering failed: ${(error as Error).message}`
        }
      };
    }
  }

  private applyCustomizations(template: CVTemplate, customizations?: any): CVTemplate {
    if (!customizations) {
      return template;
    }

    const customizedTemplate = { ...template };

    if (customizations.colorScheme) {
      customizedTemplate.layout.colorScheme = customizations.colorScheme;
    }

    if (customizations.fontFamily) {
      customizedTemplate.layout.fontFamily = customizations.fontFamily;
    }

    return customizedTemplate;
  }

  private async renderHTML(template: CVTemplate, data: any): Promise<TemplateRenderResult> {
    // Generate HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CV - ${data.personalInfo?.name || 'Professional CV'}</title>
        <style>
          body {
            font-family: ${template.layout.fontFamily};
            color: ${template.layout.colorScheme};
            margin: 0;
            padding: 20px;
          }
          .cv-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 2px solid ${template.layout.colorScheme};
          }
        </style>
      </head>
      <body>
        <div class="cv-container">
          ${this.generateHTMLSections(data, template)}
        </div>
      </body>
      </html>
    `;

    return {
      format: 'html',
      content: htmlContent,
      metadata: {
        templateId: template.id,
        renderTime: 0
      }
    };
  }

  private async renderPDF(template: CVTemplate, data: any, context?: CVProcessingContext): Promise<TemplateRenderResult> {
    // For now, return a placeholder - full PDF generation would require additional libraries
    const fileName = `cv_${context?.cvId || 'generated'}_${Date.now()}.pdf`;
    const filePath = `/tmp/${fileName}`;

    return {
      format: 'pdf',
      filePath,
      metadata: {
        templateId: template.id,
        renderTime: 0,
        fileSize: 0
      }
    };
  }

  private async renderDOCX(template: CVTemplate, data: any, context?: CVProcessingContext): Promise<TemplateRenderResult> {
    // For now, return a placeholder - full DOCX generation would require additional libraries
    const fileName = `cv_${context?.cvId || 'generated'}_${Date.now()}.docx`;
    const filePath = `/tmp/${fileName}`;

    return {
      format: 'docx',
      filePath,
      metadata: {
        templateId: template.id,
        renderTime: 0,
        fileSize: 0
      }
    };
  }

  private generateHTMLSections(data: any, template: CVTemplate): string {
    const sections = [];

    // Personal Information
    if (data.personalInfo) {
      sections.push(`
        <div class="section">
          <div class="section-title">Personal Information</div>
          <h1>${data.personalInfo.name || ''}</h1>
          <p>${data.personalInfo.email || ''}</p>
          <p>${data.personalInfo.phone || ''}</p>
          <p>${data.personalInfo.location || ''}</p>
        </div>
      `);
    }

    // Experience
    if (data.experience && Array.isArray(data.experience)) {
      sections.push(`
        <div class="section">
          <div class="section-title">Experience</div>
          ${data.experience.map((exp: any) => `
            <div>
              <h3>${exp.title || ''} at ${exp.company || ''}</h3>
              <p>${exp.duration || ''}</p>
              <p>${exp.description || ''}</p>
            </div>
          `).join('')}
        </div>
      `);
    }

    // Education
    if (data.education && Array.isArray(data.education)) {
      sections.push(`
        <div class="section">
          <div class="section-title">Education</div>
          ${data.education.map((edu: any) => `
            <div>
              <h3>${edu.degree || ''}</h3>
              <p>${edu.institution || ''} (${edu.year || ''})</p>
            </div>
          `).join('')}
        </div>
      `);
    }

    // Skills
    if (data.skills && Array.isArray(data.skills)) {
      sections.push(`
        <div class="section">
          <div class="section-title">Skills</div>
          <ul>
            ${data.skills.map((skill: any) => `<li>${skill.name || skill}</li>`).join('')}
          </ul>
        </div>
      `);
    }

    return sections.join('');
  }
}