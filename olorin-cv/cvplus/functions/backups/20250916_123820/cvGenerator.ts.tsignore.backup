// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { ParsedCV } from './cvParser';
import { 
  TemplateType, 
  FeatureType, 
  FileGenerationResult,
  InteractiveFeatureResult
} from './cv-generator/types';
import { TemplateRegistry } from './cv-generator/templates/TemplateRegistry';
import { FeatureRegistry } from './cv-generator/features/FeatureRegistry';
import { FileManager } from './cv-generator/files/FileManager';

/**
 * Refactored CV Generator using modular architecture
 * Orchestrates template generation, feature integration, and file management
 */
export class CVGenerator {
  private fileManager: FileManager;

  constructor() {
    this.fileManager = new FileManager();
  }

  /**
   * Generate complete HTML CV with template and features
   */
  async generateHTML(
    parsedCV: ParsedCV, 
    template: string, 
    features?: string[], 
    jobId?: string
  ): Promise<string> {
    try {
      // Validate and get template type
      const templateType = this.validateTemplateType(template);
      
      // Validate features
      const validFeatures = this.validateFeatures(features || []);
      
      // Generate interactive features first if requested
      let interactiveFeatures = {};
      if (validFeatures.length > 0 && jobId) {
        interactiveFeatures = await FeatureRegistry.generateFeatures(
          parsedCV, 
          jobId, 
          validFeatures
        );
      }
      
      // Get template instance
      const templateInstance = TemplateRegistry.getTemplate(templateType);
      
      // Generate HTML from template with features
      let html = await templateInstance.generateHTML(parsedCV, jobId || '', validFeatures, interactiveFeatures);
      
      // Replace jobId placeholder if podcast feature is enabled
      if (validFeatures.includes('generate-podcast') && jobId) {
        html = html.replace('{{JOB_ID}}', jobId);
      }
      
      return html;
      
    } catch (error: any) {
      throw new Error(`Failed to generate CV: ${error.message}`);
    }
  }

  /**
   * Save generated CV files (HTML, PDF, DOCX)
   */
  async saveGeneratedFiles(
    jobId: string,
    userId: string,
    htmlContent: string
  ): Promise<FileGenerationResult> {
    return await this.fileManager.saveGeneratedFiles(jobId, userId, htmlContent);
  }

  /**
   * Delete generated files for a job
   */
  async deleteGeneratedFiles(userId: string, jobId: string): Promise<void> {
    return await this.fileManager.deleteGeneratedFiles(userId, jobId);
  }

  /**
   * Check if files exist for a job
   */
  async checkFilesExist(userId: string, jobId: string): Promise<{
    htmlExists: boolean;
    pdfExists: boolean;
    docxExists: boolean;
  }> {
    return await this.fileManager.checkFilesExist(userId, jobId);
  }

  /**
   * Validate template type
   */
  private validateTemplateType(template: string): TemplateType {
    if (!TemplateRegistry.isSupported(template)) {
      return 'modern';
    }
    return template as TemplateType;
  }

  /**
   * Validate and filter features
   */
  private validateFeatures(features: string[]): FeatureType[] {
    const validFeatures: FeatureType[] = [];
    
    for (const feature of features) {
      if (FeatureRegistry.isSupported(feature)) {
        validFeatures.push(feature as FeatureType);
      } else {
      }
    }
    
    return validFeatures;
  }


  /**
   * Get supported template types
   */
  getSupportedTemplates(): TemplateType[] {
    return TemplateRegistry.getSupportedTypes();
  }

  /**
   * Get supported feature types
   */
  getSupportedFeatures(): FeatureType[] {
    return FeatureRegistry.getSupportedTypes();
  }
}
