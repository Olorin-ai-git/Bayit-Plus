/**
 * Template Service
 *
 * Service for managing CV templates, template metadata, and template operations
 * within the workflow system.
  */

import { getFirestore } from 'firebase-admin/firestore';
import { CVTemplate, TemplateMetadata, TemplateCategory } from '../../types/Template';

export class TemplateService {
  private db: FirebaseFirestore.Firestore | null = null;

  /**
   * Initialize Firestore database connection
   */
  private async initialize(): Promise<FirebaseFirestore.Firestore> {
    if (!this.db) {
      this.db = getFirestore();
    }
    return this.db;
  }

  /**
   * Get all available CV templates
    */
  async getTemplates(filters?: {
    category?: TemplateCategory;
    featured?: boolean;
    premium?: boolean;
  }): Promise<CVTemplate[]> {
    const db = await this.initialize();

    try {
      let query: FirebaseFirestore.Query = db.collection('templates');

      if (filters) {
        if (filters.category) {
          query = query.where('category', '==', filters.category);
        }
        if (filters.featured !== undefined) {
          query = query.where('isFeatured', '==', filters.featured);
        }
        if (filters.premium !== undefined) {
          query = query.where('isPremium', '==', filters.premium);
        }
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CVTemplate));

    } catch (error) {
      logger.error('[TemplateService] Error retrieving templates:', error);
      throw error;
    }
  }

  /**
   * Get a specific template by ID
    */
  async getTemplate(templateId: string): Promise<CVTemplate | null> {
    const db = await this.initialize();

    try {
      const doc = await db.collection('templates').doc(templateId).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as CVTemplate;

    } catch (error) {
      logger.error(`[TemplateService] Error retrieving template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get templates by category
    */
  async getTemplatesByCategory(category: TemplateCategory): Promise<CVTemplate[]> {
    return this.getTemplates({ category });
  }

  /**
   * Get featured templates
    */
  async getFeaturedTemplates(): Promise<CVTemplate[]> {
    return this.getTemplates({ featured: true });
  }

  /**
   * Get premium templates
    */
  async getPremiumTemplates(): Promise<CVTemplate[]> {
    return this.getTemplates({ premium: true });
  }

  /**
   * Search templates by keywords
    */
  async searchTemplates(query: string): Promise<CVTemplate[]> {
    const db = await this.initialize();

    try {
      const lowerQuery = query.toLowerCase();
      const allTemplates = await this.getTemplates();

      // Client-side filtering (Firestore doesn't support full-text search natively)
      return allTemplates.filter(template => {
        const searchableText = [
          template.name,
          template.description || '',
          template.category,
          ...template.tags,
          ...template.compatibility.industries,
          ...template.compatibility.roles
        ].join(' ').toLowerCase();

        return searchableText.includes(lowerQuery);
      });

    } catch (error) {
      logger.error('[TemplateService] Error searching templates:', error);
      throw error;
    }
  }

  /**
   * Get template metadata
    */
  async getTemplateMetadata(templateId: string): Promise<TemplateMetadata | null> {
    const db = await this.initialize();

    try {
      const doc = await db.collection('template_metadata').doc(templateId).get();

      if (!doc.exists) {
        // Return default metadata if not found
        return {
          templateId,
          usageCount: 0,
          rating: 0,
          reviewCount: 0,
          downloadCount: 0,
          popularWith: {
            industries: [],
            roles: [],
            experienceLevels: []
          },
          successMetrics: {
            jobApplications: 0,
            interviewCallbacks: 0,
            successRate: 0
          }
        };
      }

      return doc.data() as TemplateMetadata;

    } catch (error) {
      logger.error(`[TemplateService] Error retrieving template metadata for ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get template preview URL
    */
  async getTemplatePreview(templateId: string): Promise<string> {
    const db = await this.initialize();

    try {
      const template = await this.getTemplate(templateId);

      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Return preview URL if available, otherwise use thumbnail
      return template.previewUrl || template.thumbnailUrl || `/templates/${templateId}/preview.png`;

    } catch (error) {
      logger.error(`[TemplateService] Error getting template preview for ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Check template compatibility with user subscription
    */
  async checkTemplateAccess(templateId: string, userId: string): Promise<{
    hasAccess: boolean;
    reason?: string;
    upgradeRequired?: boolean;
  }> {
    const db = await this.initialize();

    try {
      const template = await this.getTemplate(templateId);

      if (!template) {
        return {
          hasAccess: false,
          reason: 'Template not found'
        };
      }

      // Non-premium templates are always accessible
      if (!template.isPremium) {
        return {
          hasAccess: true
        };
      }

      // Check user subscription for premium templates
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return {
          hasAccess: false,
          reason: 'User not found',
          upgradeRequired: true
        };
      }

      const userData = userDoc.data();
      const subscriptionDoc = await db
        .collection('user_subscriptions')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

      const hasPremiumAccess = !subscriptionDoc.empty &&
        subscriptionDoc.docs.some(doc => {
          const sub = doc.data();
          return sub.tier === 'premium' || sub.tier === 'pro' || sub.tier === 'enterprise';
        });

      if (!hasPremiumAccess) {
        return {
          hasAccess: false,
          reason: 'Premium subscription required',
          upgradeRequired: true
        };
      }

      return {
        hasAccess: true
      };

    } catch (error) {
      logger.error(`[TemplateService] Error checking template access for ${templateId}:`, error);
      return {
        hasAccess: false,
        reason: 'Error checking access',
        upgradeRequired: false
      };
    }
  }

  /**
   * Get recommended templates for a user
    */
  async getRecommendedTemplates(userId: string): Promise<CVTemplate[]> {
    const db = await this.initialize();

    try {
      // Get user's job history to understand preferences
      const jobsSnapshot = await db
        .collection('jobs')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      // Extract template usage patterns
      const templateIds: Set<string> = new Set();
      const categories: Set<TemplateCategory> = new Set();

      jobsSnapshot.docs.forEach(doc => {
        const jobData = doc.data();
        if (jobData.templateId) {
          templateIds.add(jobData.templateId);
        }
      });

      // Get templates the user has used
      const usedTemplates = await Promise.all(
        Array.from(templateIds).map(id => this.getTemplate(id))
      );

      usedTemplates.forEach(template => {
        if (template) {
          categories.add(template.category);
        }
      });

      // Get all templates
      const allTemplates = await this.getTemplates();

      // Score templates based on recommendations
      const scoredTemplates = allTemplates.map(template => {
        let score = 0;

        // Boost featured templates
        if (template.isFeatured) score += 10;

        // Boost templates in similar categories
        if (categories.has(template.category)) score += 20;

        // Boost highly rated templates (get from metadata)
        // This would be async in real implementation
        score += 5;

        // Penalize already used templates
        if (templateIds.has(template.id)) score -= 50;

        return { template, score };
      });

      // Sort by score and return top recommendations
      return scoredTemplates
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.template);

    } catch (error) {
      logger.error(`[TemplateService] Error getting recommended templates for user ${userId}:`, error);
      // Fallback to featured templates
      return this.getFeaturedTemplates();
    }
  }

  /**
   * Track template usage analytics
    */
  async trackTemplateUsage(templateId: string, userId: string, action: 'view' | 'select' | 'download'): Promise<void> {
    const db = await this.initialize();

    try {
      const usageDoc = {
        templateId,
        userId,
        action,
        timestamp: new Date()
      };

      // Store usage event
      await db.collection('template_usage').add(usageDoc);

      // Update template metadata counters
      const metadataRef = db.collection('template_metadata').doc(templateId);
      const metadataDoc = await metadataRef.get();

      if (metadataDoc.exists) {
        const updates: any = {
          lastUsed: new Date()
        };

        if (action === 'view') {
          updates.usageCount = (metadataDoc.data()?.usageCount || 0) + 1;
        } else if (action === 'download') {
          updates.downloadCount = (metadataDoc.data()?.downloadCount || 0) + 1;
        }

        await metadataRef.update(updates);
      } else {
        // Create new metadata document
        await metadataRef.set({
          templateId,
          usageCount: action === 'view' ? 1 : 0,
          downloadCount: action === 'download' ? 1 : 0,
          rating: 0,
          reviewCount: 0,
          lastUsed: new Date(),
          popularWith: {
            industries: [],
            roles: [],
            experienceLevels: []
          },
          successMetrics: {
            jobApplications: 0,
            interviewCallbacks: 0,
            successRate: 0
          }
        });
      }

      logger.info(`[TemplateService] Tracked ${action} for template ${templateId} by user ${userId}`);

    } catch (error) {
      logger.error('[TemplateService] Error tracking template usage:', error);
      // Don't throw error for tracking failures
    }
  }

  /**
   * Get template usage statistics
    */
  async getTemplateStatistics(): Promise<{
    totalTemplates: number;
    templatesByCategory: Record<TemplateCategory, number>;
    mostPopularTemplates: Array<{
      templateId: string;
      name: string;
      usageCount: number;
    }>;
    averageRating: number;
  }> {
    const db = await this.initialize();

    try {
      // Get all templates
      const templatesSnapshot = await db.collection('templates').get();
      const allTemplates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CVTemplate));

      // Count by category
      const templatesByCategory: Record<TemplateCategory, number> = {
        professional: 0,
        creative: 0,
        technical: 0,
        academic: 0,
        executive: 0,
        'entry-level': 0,
        'industry-specific': 0
      };

      allTemplates.forEach(template => {
        templatesByCategory[template.category] = (templatesByCategory[template.category] || 0) + 1;
      });

      // Get metadata for popular templates
      const metadataSnapshot = await db
        .collection('template_metadata')
        .orderBy('usageCount', 'desc')
        .limit(10)
        .get();

      const mostPopularTemplates = await Promise.all(
        metadataSnapshot.docs.map(async (doc) => {
          const metadata = doc.data() as TemplateMetadata;
          const template = await this.getTemplate(metadata.templateId);
          return {
            templateId: metadata.templateId,
            name: template?.name || 'Unknown',
            usageCount: metadata.usageCount
          };
        })
      );

      // Calculate average rating
      const allMetadataSnapshot = await db.collection('template_metadata').get();
      let totalRating = 0;
      let ratedCount = 0;

      allMetadataSnapshot.docs.forEach(doc => {
        const metadata = doc.data() as TemplateMetadata;
        if (metadata.reviewCount > 0) {
          totalRating += metadata.rating;
          ratedCount++;
        }
      });

      const averageRating = ratedCount > 0 ? totalRating / ratedCount : 0;

      return {
        totalTemplates: allTemplates.length,
        templatesByCategory,
        mostPopularTemplates,
        averageRating
      };

    } catch (error) {
      logger.error('[TemplateService] Error getting template statistics:', error);
      throw error;
    }
  }

  /**
   * Validate template structure
    */
  validateTemplate(template: CVTemplate): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields validation
    if (!template.id) errors.push('Template ID is required');
    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }
    if (!template.category) {
      errors.push('Template category is required');
    }

    // Validate category
    const validCategories: TemplateCategory[] = [
      'professional',
      'creative',
      'technical',
      'academic',
      'executive',
      'entry-level',
      'industry-specific'
    ];

    if (template.category && !validCategories.includes(template.category)) {
      errors.push(`Invalid category: ${template.category}`);
    }

    // Validate boolean fields
    if (typeof template.isPremium !== 'boolean') {
      errors.push('isPremium must be a boolean');
    }
    if (typeof template.isFeatured !== 'boolean') {
      errors.push('isFeatured must be a boolean');
    }

    // Validate arrays
    if (!Array.isArray(template.tags)) {
      errors.push('Tags must be an array');
    }

    // Validate compatibility object
    if (!template.compatibility) {
      errors.push('Compatibility object is required');
    } else {
      if (!Array.isArray(template.compatibility.features)) {
        errors.push('Compatibility.features must be an array');
      }
      if (!Array.isArray(template.compatibility.industries)) {
        errors.push('Compatibility.industries must be an array');
      }
      if (!Array.isArray(template.compatibility.roles)) {
        errors.push('Compatibility.roles must be an array');
      }
    }

    // Validate styling object
    if (!template.styling) {
      errors.push('Styling object is required');
    } else {
      if (!template.styling.colorScheme) {
        errors.push('Styling.colorScheme is required');
      }
      if (!template.styling.fontFamily) {
        errors.push('Styling.fontFamily is required');
      }
      if (!template.styling.layout) {
        errors.push('Styling.layout is required');
      }
      if (!Array.isArray(template.styling.sections)) {
        errors.push('Styling.sections must be an array');
      }
    }

    // Validate dates
    if (template.createdAt && !(template.createdAt instanceof Date)) {
      errors.push('createdAt must be a Date object');
    }
    if (template.updatedAt && !(template.updatedAt instanceof Date)) {
      errors.push('updatedAt must be a Date object');
    }

    // Validate version format (semantic versioning)
    if (template.version && !/^\d+\.\d+\.\d+$/.test(template.version)) {
      errors.push('Version must follow semantic versioning (e.g., 1.0.0)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData: Omit<CVTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<CVTemplate> {
    const db = await this.initialize();

    try {
      const newTemplate: CVTemplate = {
        ...templateData,
        id: '', // Will be set by Firestore
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate before creating
      const validation = this.validateTemplate(newTemplate);
      if (!validation.valid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      const docRef = await db.collection('templates').add(newTemplate);
      newTemplate.id = docRef.id;

      await docRef.update({ id: docRef.id });

      logger.info(`[TemplateService] Created new template ${docRef.id}`);
      return newTemplate;

    } catch (error) {
      logger.error('[TemplateService] Error creating template:', error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, updates: Partial<CVTemplate>): Promise<CVTemplate> {
    const db = await this.initialize();

    try {
      const templateRef = db.collection('templates').doc(templateId);
      const doc = await templateRef.get();

      if (!doc.exists) {
        throw new Error(`Template ${templateId} not found`);
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date()
      };

      await templateRef.update(updatedData);

      const updatedDoc = await templateRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as CVTemplate;

    } catch (error) {
      logger.error(`[TemplateService] Error updating template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const db = await this.initialize();

    try {
      await db.collection('templates').doc(templateId).delete();
      // Also delete associated metadata
      await db.collection('template_metadata').doc(templateId).delete();

      logger.info(`[TemplateService] Deleted template ${templateId}`);

    } catch (error) {
      logger.error(`[TemplateService] Error deleting template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get template versions
   */
  async getTemplateVersions(templateId: string): Promise<CVTemplate[]> {
    const db = await this.initialize();

    try {
      const versionsSnapshot = await db
        .collection('template_versions')
        .where('originalTemplateId', '==', templateId)
        .orderBy('createdAt', 'desc')
        .get();

      return versionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CVTemplate));

    } catch (error) {
      logger.error(`[TemplateService] Error getting versions for template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Get template compatibility info
   */
  async getTemplateCompatibility(templateId: string): Promise<{
    features: string[];
    industries: string[];
    roles: string[];
    recommendedFor: string[];
  } | null> {
    const db = await this.initialize();

    try {
      const template = await this.getTemplate(templateId);

      if (!template) {
        return null;
      }

      return {
        features: template.compatibility.features,
        industries: template.compatibility.industries,
        roles: template.compatibility.roles,
        recommendedFor: [
          ...template.compatibility.industries,
          ...template.compatibility.roles
        ]
      };

    } catch (error) {
      logger.error(`[TemplateService] Error getting compatibility for template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Customize template
   */
  async customizeTemplate(templateId: string, customizations: any): Promise<CVTemplate> {
    const db = await this.initialize();

    try {
      const template = await this.getTemplate(templateId);

      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Create a customized version
      const customizedTemplate: CVTemplate = {
        ...template,
        id: '', // Will be assigned by Firestore
        name: `${template.name} (Customized)`,
        styling: {
          ...template.styling,
          ...customizations.styling
        },
        metadata: {
          ...template.metadata,
          originalTemplateId: templateId,
          customizations
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('templates').add(customizedTemplate);
      customizedTemplate.id = docRef.id;

      await docRef.update({ id: docRef.id });

      logger.info(`[TemplateService] Created customized template ${docRef.id} from ${templateId}`);
      return customizedTemplate;

    } catch (error) {
      logger.error(`[TemplateService] Error customizing template ${templateId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const templateService = new TemplateService();