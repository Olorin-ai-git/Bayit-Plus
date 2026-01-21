// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV Generation Service
 * 
 * Core service for generating CVs from parsed data using templates and AI enhancement.
 * Provides modular, testable CV generation functionality.
 * 
 * @author Gil Klainert
 * @version 2.0.0 - Modularized Architecture
 */

import { CVProcessingContext, ServiceResult } from '../../types';
import { BaseService } from '../../shared/utils/base-service';
import * as admin from 'firebase-admin';
import PDFDocument from 'pdfkit';
import { Anthropic } from '@anthropic-ai/sdk';

export interface CVGenerationResult {
  pdfPath: string;
  previewImagePath?: string;
  metadata: {
    templateUsed: string;
    generationTime: number;
    version: string;
  };
}

export class CVGenerationService extends BaseService {
  private anthropic: Anthropic;

  constructor() {
    super('cv-generation', '2.0.0');
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });
  }

  /**
   * Generate a CV from processed context data
   */
  async generateCV(context: CVProcessingContext): Promise<ServiceResult<CVGenerationResult>> {
    const startTime = Date.now();
    
    try {
      console.log(`📄 Generating CV for job ${context.jobId} with template ${context.templateId || 'modern'}`);

      // Validate input data
      const validation = this.validateGenerationContext(context);
      if (!validation.isValid) {
        return this.createErrorResult(`Invalid context: ${validation.errors.join(', ')}`);
      }

      // Generate enhanced CV content using AI
      const enhancedContent = await this.enhanceCVContent(context);
      
      // Generate PDF using the selected template
      const pdfPath = await this.generatePDF(context, enhancedContent);
      
      // Generate preview image if requested
      const previewImagePath = context.features?.includes('preview-image') 
        ? await this.generatePreviewImage(pdfPath) 
        : undefined;

      // Update job status
      await this.updateJobStatus(context.jobId, 'cv-generated', { pdfPath });

      const generationTime = Date.now() - startTime;
      console.log(`✅ CV generated successfully in ${generationTime}ms`);

      return this.createSuccessResult<CVGenerationResult>({
        pdfPath,
        previewImagePath,
        metadata: {
          templateUsed: context.templateId || 'modern',
          generationTime,
          version: this.version
        }
      });

    } catch (error: any) {
      console.error('❌ CV generation failed:', error);
      await this.updateJobStatus(context.jobId, 'failed', { error: error.message });
      return this.createErrorResult(`CV generation failed: ${error.message}`, error);
    }
  }

  /**
   * Enhance CV content using AI
   */
  private async enhanceCVContent(context: CVProcessingContext): Promise<any> {
    try {
      console.log(`🤖 Enhancing CV content with AI for job ${context.jobId}`);

      const prompt = this.buildEnhancementPrompt(context);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const enhancedContent = JSON.parse(response.content[0]?.text || '{}');
      console.log(`✨ Content enhanced successfully`);

      return {
        ...context.cvData,
        enhanced: enhancedContent
      };

    } catch (error: any) {
      console.warn(`⚠️ AI enhancement failed, using original content: ${error.message}`);
      return context.cvData;
    }
  }

  /**
   * Generate PDF using template engine
   */
  private async generatePDF(context: CVProcessingContext, content: any): Promise<string> {
    const fileName = `cv_${context.jobId}_${Date.now()}.pdf`;
    const tempPath = `/tmp/${fileName}`;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const stream = require('fs').createWriteStream(tempPath);
        doc.pipe(stream);

        // Apply template styling
        this.applyTemplate(doc, context.templateId || 'modern', content);

        doc.end();

        stream.on('finish', async () => {
          try {
            // Upload to Firebase Storage
            const bucket = admin.storage().bucket();
            const destination = `cvs/${context.userId}/${fileName}`;
            
            await bucket.upload(tempPath, {
              destination,
              metadata: {
                contentType: 'application/pdf',
                metadata: {
                  jobId: context.jobId,
                  userId: context.userId,
                  template: context.templateId || 'modern'
                }
              }
            });

            const publicUrl = `gs://${bucket.name}/${destination}`;
            resolve(publicUrl);
          } catch (uploadError) {
            reject(uploadError);
          }
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Apply template styling to PDF document
   */
  private applyTemplate(doc: PDFDocument, templateId: string, content: any): void {
    const template = this.getTemplate(templateId);
    
    // Header
    doc.fontSize(template.header.fontSize)
       .fillColor(template.header.color)
       .text(content.personalInfo?.name || 'Professional CV', template.margins.left, template.margins.top);

    let currentY = template.margins.top + 40;

    // Contact Information
    if (content.personalInfo?.email || content.personalInfo?.phone) {
      doc.fontSize(template.body.fontSize)
         .fillColor(template.body.color)
         .text(`${content.personalInfo.email || ''} | ${content.personalInfo.phone || ''}`, 
               template.margins.left, currentY);
      currentY += 25;
    }

    // Professional Summary
    if (content.enhanced?.summary || content.summary) {
      currentY = this.addSection(doc, template, 'Professional Summary', 
                                content.enhanced?.summary || content.summary, currentY);
    }

    // Experience
    if (content.experience && content.experience.length > 0) {
      currentY = this.addExperienceSection(doc, template, content.experience, currentY);
    }

    // Education
    if (content.education && content.education.length > 0) {
      currentY = this.addEducationSection(doc, template, content.education, currentY);
    }

    // Skills
    if (content.skills && content.skills.length > 0) {
      currentY = this.addSkillsSection(doc, template, content.skills, currentY);
    }
  }

  /**
   * Get template configuration
   */
  private getTemplate(templateId: string) {
    const templates = {
      modern: {
        header: { fontSize: 24, color: '#2c3e50' },
        body: { fontSize: 11, color: '#34495e' },
        section: { fontSize: 14, color: '#2c3e50' },
        margins: { left: 50, right: 50, top: 50 }
      },
      classic: {
        header: { fontSize: 22, color: '#000000' },
        body: { fontSize: 10, color: '#000000' },
        section: { fontSize: 12, color: '#000000' },
        margins: { left: 60, right: 60, top: 60 }
      },
      creative: {
        header: { fontSize: 26, color: '#e74c3c' },
        body: { fontSize: 11, color: '#2c3e50' },
        section: { fontSize: 15, color: '#e74c3c' },
        margins: { left: 40, right: 40, top: 40 }
      }
    };

    return templates[templateId as keyof typeof templates] || templates.modern;
  }

  /**
   * Add a section to the PDF
   */
  private addSection(doc: PDFDocument, template: any, title: string, content: string, y: number): number {
    doc.fontSize(template.section.fontSize)
       .fillColor(template.section.color)
       .text(title, template.margins.left, y);

    doc.fontSize(template.body.fontSize)
       .fillColor(template.body.color)
       .text(content, template.margins.left, y + 20, { width: 500 });

    return y + 80;
  }

  /**
   * Add experience section
   */
  private addExperienceSection(doc: PDFDocument, template: any, experiences: any[], y: number): number {
    doc.fontSize(template.section.fontSize)
       .fillColor(template.section.color)
       .text('Experience', template.margins.left, y);
    
    let currentY = y + 25;

    experiences.forEach(exp => {
      doc.fontSize(template.body.fontSize + 1)
         .fillColor(template.body.color)
         .text(`${exp.title} at ${exp.company}`, template.margins.left, currentY);
      
      if (exp.period) {
        doc.fontSize(template.body.fontSize - 1)
           .text(exp.period, template.margins.left, currentY + 15);
      }

      if (exp.description) {
        doc.fontSize(template.body.fontSize)
           .text(exp.description, template.margins.left, currentY + 30, { width: 500 });
      }

      currentY += 80;
    });

    return currentY + 20;
  }

  /**
   * Add education section
   */
  private addEducationSection(doc: PDFDocument, template: any, education: any[], y: number): number {
    doc.fontSize(template.section.fontSize)
       .fillColor(template.section.color)
       .text('Education', template.margins.left, y);
    
    let currentY = y + 25;

    education.forEach((edu: any) => {
      doc.fontSize(template.body.fontSize + 1)
         .fillColor(template.body.color)
         .text(`${edu.degree} - ${edu.school}`, template.margins.left, currentY);
      
      if (edu.year) {
        doc.fontSize(template.body.fontSize)
           .text(edu.year, template.margins.left, currentY + 15);
      }

      currentY += 40;
    });

    return currentY + 20;
  }

  /**
   * Add skills section
   */
  private addSkillsSection(doc: PDFDocument, template: any, skills: any[], y: number): number {
    doc.fontSize(template.section.fontSize)
       .fillColor(template.section.color)
       .text('Skills', template.margins.left, y);
    
    const skillsText = skills.map((skill: any) => 
      typeof skill === 'string' ? skill : skill.name || skill
    ).join(', ');

    doc.fontSize(template.body.fontSize)
       .fillColor(template.body.color)
       .text(skillsText, template.margins.left, y + 25, { width: 500 });

    return y + 80;
  }

  /**
   * Generate preview image from PDF
   */
  private async generatePreviewImage(pdfPath: string): Promise<string> {
    // This would typically use a library like pdf2pic or similar
    // For now, return a placeholder
    console.log(`📸 Preview image generation requested for ${pdfPath}`);
    return pdfPath.replace('.pdf', '_preview.png');
  }

  /**
   * Build AI enhancement prompt
   */
  private buildEnhancementPrompt(context: CVProcessingContext): string {
    return `
Enhance the following CV data to make it more professional and impactful. 
Focus on improving language, highlighting achievements, and ensuring clarity.

Original CV Data:
${JSON.stringify(context.cvData, null, 2)}

Template: ${context.templateId || 'modern'}
Features: ${context.features?.join(', ') || 'none'}

Please return enhanced content as JSON with improved:
- Professional summary
- Job descriptions with quantified achievements
- Skills organization
- Overall language and tone

Maintain factual accuracy and don't add information not present in the original.
`;
  }

  /**
   * Validate generation context
   */
  private validateGenerationContext(context: CVProcessingContext) {
    const errors: string[] = [];

    if (!context.jobId) errors.push('Job ID is required');
    if (!context.userId) errors.push('User ID is required');
    if (!context.cvData) errors.push('CV data is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Update job status in Firestore
   */
  private async updateJobStatus(jobId: string, status: string, data: any = {}) {
    try {
      await admin.firestore().collection('jobs').doc(jobId).update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...data
      });
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  }
}