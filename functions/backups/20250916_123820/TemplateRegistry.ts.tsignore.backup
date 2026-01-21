// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVTemplate, TemplateType } from '../types';
import { ModernTemplate } from './ModernTemplate';
import { ClassicTemplate } from './ClassicTemplate';
import { CreativeTemplate } from './CreativeTemplate';

/**
 * Template registry for managing CV template instances
 * Implements factory pattern for template creation
 */
export class TemplateRegistry {
  private static templates: Map<TemplateType, CVTemplate> = new Map();

  /**
   * Get template instance by type
   */
  static getTemplate(type: TemplateType): CVTemplate {
    if (!this.templates.has(type)) {
      this.templates.set(type, this.createTemplate(type));
    }
    
    return this.templates.get(type)!;
  }

  /**
   * Create new template instance
   */
  private static createTemplate(type: TemplateType): CVTemplate {
    switch (type) {
      case 'modern':
        return new ModernTemplate();
      case 'classic':
        return new ClassicTemplate();
      case 'creative':
        return new CreativeTemplate();
      default:
        throw new Error(`Unknown template type: ${type}`);
    }
  }

  /**
   * Get all supported template types
   */
  static getSupportedTypes(): TemplateType[] {
    return ['modern', 'classic', 'creative'];
  }

  /**
   * Check if template type is supported
   */
  static isSupported(type: string): type is TemplateType {
    return this.getSupportedTypes().includes(type as TemplateType);
  }

  /**
   * Clear template cache (useful for testing)
   */
  static clearCache(): void {
    this.templates.clear();
  }
}