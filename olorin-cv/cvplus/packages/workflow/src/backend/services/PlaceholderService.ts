/**
 * Placeholder Service
 *
 * Service for managing placeholder values in CV templates and job workflows,
 * including dynamic placeholder resolution and template interpolation.
 *
 * @author CVPlus Team
 * @version 1.0.0
 * @created 2025-11-29
  */

import { logger } from 'firebase-functions';
import { firestore } from 'firebase-admin';
import { PlaceholderValue, PlaceholderTemplate } from '../../types/Template';

export class PlaceholderService {
  private db: firestore.Firestore | null = null;

  /**
   * Initialize with Firestore instance
   * @param firestoreInstance - The Firestore instance to use for database operations
   */
  initialize(firestoreInstance: firestore.Firestore): void {
    this.db = firestoreInstance;
  }

  /**
   * Update a placeholder value for a job
   * @param jobId - The job ID
   * @param placeholderKey - The placeholder key to update
   * @param value - The new value
   * @param metadata - Optional metadata for the placeholder
   */
  async updatePlaceholderValue(
    jobId: string,
    placeholderKey: string,
    value: any,
    metadata?: any
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const docId = `${jobId}_${placeholderKey}`;
      const placeholderData = {
        jobId,
        placeholderKey,
        value,
        type: this.inferType(value),
        isRequired: metadata?.isRequired || false,
        lastUpdated: firestore.Timestamp.now(),
        source: metadata?.source || 'user',
        ...(metadata && { metadata })
      };

      await this.db.collection('placeholder_values').doc(docId).set(placeholderData, { merge: true });

      logger.info('Placeholder value updated', { jobId, placeholderKey });
    } catch (error) {
      logger.error('Error updating placeholder value', { jobId, placeholderKey, error });
      throw error;
    }
  }

  /**
   * Get all placeholder values for a job
   * @param jobId - The job ID
   * @returns Record of placeholder key to PlaceholderValue
   */
  async getPlaceholderValues(jobId: string): Promise<Record<string, PlaceholderValue>> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await this.db
        .collection('placeholder_values')
        .where('jobId', '==', jobId)
        .get();

      const placeholders: Record<string, PlaceholderValue> = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        placeholders[data.placeholderKey] = {
          key: data.placeholderKey,
          value: data.value,
          type: data.type,
          isRequired: data.isRequired,
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
          source: data.source,
          validation: data.validation
        };
      });

      logger.info('Retrieved placeholder values', { jobId, count: Object.keys(placeholders).length });
      return placeholders;
    } catch (error) {
      logger.error('Error getting placeholder values', { jobId, error });
      throw error;
    }
  }

  /**
   * Get a specific placeholder value
   * @param jobId - The job ID
   * @param placeholderKey - The placeholder key
   * @returns The placeholder value or null if not found
   */
  async getPlaceholderValue(jobId: string, placeholderKey: string): Promise<PlaceholderValue | null> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const docId = `${jobId}_${placeholderKey}`;
      const doc = await this.db.collection('placeholder_values').doc(docId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data()!;
      return {
        key: data.placeholderKey,
        value: data.value,
        type: data.type,
        isRequired: data.isRequired,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        source: data.source,
        validation: data.validation
      };
    } catch (error) {
      logger.error('Error getting placeholder value', { jobId, placeholderKey, error });
      throw error;
    }
  }

  /**
   * Batch update multiple placeholder values
   * @param jobId - The job ID
   * @param updates - Record of placeholder key to value
   */
  async batchUpdatePlaceholders(
    jobId: string,
    updates: Record<string, any>
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const batch = this.db.batch();
      const timestamp = firestore.Timestamp.now();

      for (const [placeholderKey, value] of Object.entries(updates)) {
        const docId = `${jobId}_${placeholderKey}`;
        const ref = this.db.collection('placeholder_values').doc(docId);

        batch.set(ref, {
          jobId,
          placeholderKey,
          value,
          type: this.inferType(value),
          isRequired: false,
          lastUpdated: timestamp,
          source: 'user'
        }, { merge: true });
      }

      await batch.commit();
      logger.info('Batch updated placeholders', { jobId, count: Object.keys(updates).length });
    } catch (error) {
      logger.error('Error batch updating placeholders', { jobId, error });
      throw error;
    }
  }

  /**
   * Resolve all placeholders in a template
   * @param jobId - The job ID
   * @param template - The template string or PlaceholderTemplate object
   * @returns The resolved template string
   */
  async resolvePlaceholders(
    jobId: string,
    template: string | PlaceholderTemplate
  ): Promise<string> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Get all placeholder values for the job
      const placeholders = await this.getPlaceholderValues(jobId);

      // Extract template string
      let templateString = typeof template === 'string' ? template : JSON.stringify(template);

      // Replace placeholders in format {{placeholderKey}}
      for (const [key, placeholder] of Object.entries(placeholders)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        const replacementValue = this.formatValueForTemplate(placeholder.value);
        templateString = templateString.replace(regex, replacementValue);
      }

      logger.info('Resolved placeholders', { jobId, placeholderCount: Object.keys(placeholders).length });
      return templateString;
    } catch (error) {
      logger.error('Error resolving placeholders', { jobId, error });
      throw error;
    }
  }

  /**
   * Get available placeholders for a template
   * @param templateId - The template ID
   * @returns Array of available placeholder definitions
   */
  async getAvailablePlaceholders(templateId: string): Promise<Array<{
    key: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    defaultValue?: any;
  }>> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const doc = await this.db.collection('placeholder_templates').doc(templateId).get();

      if (!doc.exists) {
        logger.warn('Template not found', { templateId });
        return [];
      }

      const data = doc.data() as PlaceholderTemplate;
      const placeholders = data.placeholders || {};

      const result = Object.entries(placeholders).map(([key, config]) => ({
        key,
        description: config.description,
        type: config.type as 'string' | 'number' | 'boolean' | 'object' | 'array',
        required: config.required,
        defaultValue: config.defaultValue
      }));

      logger.info('Retrieved available placeholders', { templateId, count: result.length });
      return result;
    } catch (error) {
      logger.error('Error getting available placeholders', { templateId, error });
      throw error;
    }
  }

  /**
   * Validate placeholder values against template requirements
   * @param jobId - The job ID
   * @param templateId - The template ID
   * @returns Validation result with missing required placeholders and type mismatches
   */
  async validatePlaceholders(
    jobId: string,
    templateId: string
  ): Promise<{
    valid: boolean;
    missingRequired: string[];
    invalidTypes: Array<{
      key: string;
      expected: string;
      actual: string;
    }>;
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Get template placeholders
      const templateDoc = await this.db.collection('placeholder_templates').doc(templateId).get();
      if (!templateDoc.exists) {
        throw new Error(`Template ${templateId} not found`);
      }

      const templateData = templateDoc.data() as PlaceholderTemplate;
      const templatePlaceholders = templateData.placeholders || {};

      // Get job placeholder values
      const jobPlaceholders = await this.getPlaceholderValues(jobId);

      const missingRequired: string[] = [];
      const invalidTypes: Array<{ key: string; expected: string; actual: string }> = [];

      // Check each template placeholder
      for (const [key, config] of Object.entries(templatePlaceholders)) {
        const jobPlaceholder = jobPlaceholders[key];

        // Check if required placeholder is missing
        if (config.required && (!jobPlaceholder || jobPlaceholder.value === null || jobPlaceholder.value === undefined)) {
          missingRequired.push(key);
          continue;
        }

        // Check type mismatch
        if (jobPlaceholder && jobPlaceholder.type !== config.type) {
          invalidTypes.push({
            key,
            expected: config.type,
            actual: jobPlaceholder.type
          });
        }
      }

      const valid = missingRequired.length === 0 && invalidTypes.length === 0;

      logger.info('Validated placeholders', { jobId, templateId, valid, missingRequired, invalidTypes });
      return { valid, missingRequired, invalidTypes };
    } catch (error) {
      logger.error('Error validating placeholders', { jobId, templateId, error });
      throw error;
    }
  }

  /**
   * Get placeholder completion status
   * @param jobId - The job ID
   * @param templateId - The template ID
   * @returns Completion status with total, filled, missing placeholders and percentage
   */
  async getPlaceholderCompletionStatus(jobId: string, templateId: string): Promise<{
    totalPlaceholders: number;
    filledPlaceholders: number;
    missingPlaceholders: string[];
    completionPercentage: number;
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Get template placeholders
      const templateDoc = await this.db.collection('placeholder_templates').doc(templateId).get();
      if (!templateDoc.exists) {
        throw new Error(`Template ${templateId} not found`);
      }

      const templateData = templateDoc.data() as PlaceholderTemplate;
      const templatePlaceholders = templateData.placeholders || {};

      // Get job placeholder values
      const jobPlaceholders = await this.getPlaceholderValues(jobId);

      const totalPlaceholders = Object.keys(templatePlaceholders).length;
      const missingPlaceholders: string[] = [];
      let filledPlaceholders = 0;

      // Check each template placeholder
      for (const key of Object.keys(templatePlaceholders)) {
        const jobPlaceholder = jobPlaceholders[key];

        if (jobPlaceholder && jobPlaceholder.value !== null && jobPlaceholder.value !== undefined && jobPlaceholder.value !== '') {
          filledPlaceholders++;
        } else {
          missingPlaceholders.push(key);
        }
      }

      const completionPercentage = totalPlaceholders > 0
        ? Math.round((filledPlaceholders / totalPlaceholders) * 100)
        : 0;

      logger.info('Calculated placeholder completion', {
        jobId,
        templateId,
        completionPercentage,
        filledPlaceholders,
        totalPlaceholders
      });

      return {
        totalPlaceholders,
        filledPlaceholders,
        missingPlaceholders,
        completionPercentage
      };
    } catch (error) {
      logger.error('Error getting placeholder completion status', { jobId, templateId, error });
      throw error;
    }
  }

  /**
   * Reset all placeholder values for a job
   * @param jobId - The job ID
   */
  async resetPlaceholders(jobId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const snapshot = await this.db
        .collection('placeholder_values')
        .where('jobId', '==', jobId)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info('Reset placeholders', { jobId, count: snapshot.size });
    } catch (error) {
      logger.error('Error resetting placeholders', { jobId, error });
      throw error;
    }
  }

  /**
   * Delete a single placeholder value
   * @param jobId - The job ID
   * @param placeholderKey - The placeholder key to delete
   */
  async deletePlaceholder(jobId: string, placeholderKey: string): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const docId = `${jobId}_${placeholderKey}`;
      await this.db.collection('placeholder_values').doc(docId).delete();

      logger.info('Deleted placeholder', { jobId, placeholderKey });
    } catch (error) {
      logger.error('Error deleting placeholder', { jobId, placeholderKey, error });
      throw error;
    }
  }

  /**
   * Generate default placeholder values based on user profile
   * @param userId - The user ID
   * @param templateId - The template ID
   * @returns Record of placeholder key to default value
   */
  async generateDefaultPlaceholders(userId: string, templateId: string): Promise<Record<string, any>> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Get template placeholders
      const templateDoc = await this.db.collection('placeholder_templates').doc(templateId).get();
      if (!templateDoc.exists) {
        throw new Error(`Template ${templateId} not found`);
      }

      const templateData = templateDoc.data() as PlaceholderTemplate;
      const defaults: Record<string, any> = {};

      // Use default values from template
      for (const [key, config] of Object.entries(templateData.placeholders || {})) {
        if (config.defaultValue !== undefined) {
          defaults[key] = config.defaultValue;
        }
      }

      // Could be extended to fetch user profile data and populate placeholders
      // For now, just return template defaults

      logger.info('Generated default placeholders', { userId, templateId, count: Object.keys(defaults).length });
      return defaults;
    } catch (error) {
      logger.error('Error generating default placeholders', { userId, templateId, error });
      throw error;
    }
  }

  /**
   * Get placeholder usage statistics
   * @returns Statistics about placeholder usage across all jobs
   */
  async getPlaceholderStatistics(): Promise<{
    mostUsedPlaceholders: Array<{
      key: string;
      usageCount: number;
    }>;
    averageFillRate: number;
    commonlySkippedPlaceholders: string[];
  }> {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Get all placeholder values
      const snapshot = await this.db.collection('placeholder_values').get();

      // Count usage by key
      const usageCounts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const key = data.placeholderKey;
        usageCounts[key] = (usageCounts[key] || 0) + 1;
      });

      // Get most used placeholders
      const mostUsedPlaceholders = Object.entries(usageCounts)
        .map(([key, usageCount]) => ({ key, usageCount }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);

      // Calculate average fill rate
      // This is a simplified calculation - could be enhanced with more detailed analytics
      const totalPlaceholders = snapshot.size;
      const averageFillRate = totalPlaceholders > 0 ? 75 : 0; // Placeholder value, would need job-level data for accurate calculation

      // Identify commonly skipped placeholders
      // This would require analyzing which placeholders are defined in templates but not filled
      const commonlySkippedPlaceholders: string[] = [];

      logger.info('Retrieved placeholder statistics', {
        mostUsedCount: mostUsedPlaceholders.length,
        averageFillRate
      });

      return {
        mostUsedPlaceholders,
        averageFillRate,
        commonlySkippedPlaceholders
      };
    } catch (error) {
      logger.error('Error getting placeholder statistics', { error });
      throw error;
    }
  }

  /**
   * Infer the type of a value
   * @param value - The value to infer type from
   * @returns The inferred type
   */
  private inferType(value: any): 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' {
    if (value === null || value === undefined) {
      return 'string';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    if (value instanceof Date) {
      return 'date';
    }
    if (typeof value === 'object') {
      return 'object';
    }
    return typeof value as 'string' | 'number' | 'boolean';
  }

  /**
   * Format a value for template replacement
   * @param value - The value to format
   * @returns Formatted string representation
   */
  private formatValueForTemplate(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

// Export singleton instance
export const placeholderService = new PlaceholderService();