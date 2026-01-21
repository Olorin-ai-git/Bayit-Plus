/**
 * Custom Template Manager
 * Feature: 005-polling-and-persistence
 *
 * Manages user-defined investigation templates in localStorage
 * Adapted from Olorin web plugin for Olorin frontend
 */

import { InvestigationTemplate } from '@shared/types/entityTypes';

const STORAGE_KEY = 'olorin_custom_investigation_templates';

/**
 * Custom Template Manager
 * Handles CRUD operations for user-created investigation templates
 */
export class CustomTemplateManager {
  /**
   * Load all custom templates from localStorage
   */
  static loadCustomTemplates(): InvestigationTemplate[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const templates = JSON.parse(stored) as InvestigationTemplate[];
      return templates.filter((t) => t.isCustom === true);
    } catch (error) {
      console.error('Failed to load custom templates', error);
      return [];
    }
  }

  /**
   * Save a new custom template
   */
  static saveCustomTemplate(
    template: Omit<InvestigationTemplate, 'id' | 'isCustom'>,
  ): InvestigationTemplate {
    try {
      const customTemplate: InvestigationTemplate = {
        ...template,
        id: this.generateTemplateId(),
        isCustom: true,
      };

      const existing = this.loadCustomTemplates();
      const updated = [...existing, customTemplate];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.info('Custom template saved', { templateId: customTemplate.id });

      return customTemplate;
    } catch (error) {
      console.error('Failed to save custom template', error);
      throw new Error('Failed to save template');
    }
  }

  /**
   * Update an existing custom template
   */
  static updateCustomTemplate(
    templateId: string,
    updates: Partial<InvestigationTemplate>,
  ): InvestigationTemplate | null {
    try {
      const existing = this.loadCustomTemplates();
      const index = existing.findIndex((t) => t.id === templateId);

      if (index === -1) {
        console.warn('Template not found for update', { templateId });
        return null;
      }

      const updated: InvestigationTemplate = {
        ...existing[index],
        ...updates,
        id: templateId, // Preserve original ID
        isCustom: true, // Ensure custom flag
        name: updates.name ?? existing[index].name,
        description: updates.description ?? existing[index].description,
        entities: updates.entities ?? existing[index].entities,
        correlationMode: updates.correlationMode ?? existing[index].correlationMode,
        useCase: updates.useCase ?? existing[index].useCase
      };

      existing[index] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

      console.info('Custom template updated', { templateId });
      return updated;
    } catch (error) {
      console.error('Failed to update custom template', error);
      return null;
    }
  }

  /**
   * Delete a custom template
   */
  static deleteCustomTemplate(templateId: string): boolean {
    try {
      const existing = this.loadCustomTemplates();
      const filtered = existing.filter((t) => t.id !== templateId);

      if (filtered.length === existing.length) {
        console.warn('Template not found for deletion', { templateId });
        return false;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.info('Custom template deleted', { templateId });

      return true;
    } catch (error) {
      console.error('Failed to delete custom template', error);
      return false;
    }
  }

  /**
   * Get a specific custom template by ID
   */
  static getCustomTemplate(templateId: string): InvestigationTemplate | null {
    const templates = this.loadCustomTemplates();
    return templates.find((t) => t.id === templateId) || null;
  }

  /**
   * Check if a template name already exists
   */
  static templateNameExists(name: string, excludeId?: string): boolean {
    const templates = this.loadCustomTemplates();
    return templates.some(
      (t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== excludeId,
    );
  }

  /**
   * Export all custom templates as JSON
   */
  static exportTemplates(): string {
    const templates = this.loadCustomTemplates();
    return JSON.stringify(templates, null, 2);
  }

  /**
   * Import templates from JSON
   */
  static importTemplates(jsonString: string): number {
    try {
      const imported = JSON.parse(jsonString) as InvestigationTemplate[];

      if (!Array.isArray(imported)) {
        throw new Error('Invalid template format');
      }

      const existing = this.loadCustomTemplates();
      let importedCount = 0;

      imported.forEach((template) => {
        // Skip if template with same name exists
        if (!this.templateNameExists(template.name)) {
          const customTemplate: InvestigationTemplate = {
            ...template,
            id: this.generateTemplateId(),
            isCustom: true,
          };
          existing.push(customTemplate);
          importedCount++;
        }
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      console.info('Templates imported', { count: importedCount });

      return importedCount;
    } catch (error) {
      console.error('Failed to import templates', error);
      throw new Error('Failed to import templates');
    }
  }

  /**
   * Clear all custom templates
   */
  static clearAllTemplates(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.info('All custom templates cleared');
    } catch (error) {
      console.error('Failed to clear templates', error);
    }
  }

  /**
   * Generate a unique template ID
   */
  private static generateTemplateId(): string {
    return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default CustomTemplateManager;
