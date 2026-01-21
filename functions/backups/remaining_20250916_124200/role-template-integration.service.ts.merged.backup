// @ts-ignore - Export conflicts/**
 * Role-Template Integration Service
 * 
 * Connects the role system with the template system in CVPlus to provide
 * intelligent template recommendations and customizations based on detected roles.
 * 
 * @author Gil Klainert
 * @created 2025-08-22
 * @version 1.0
 */

import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { 
  RoleProfile, 
  RoleCategory, 
  ExperienceLevel 
} from '../types/role-profile.types';
import { 
  PortalTemplate, 
  PortalTemplateCategory, 
  PortalTheme,
  PortalSection 
} from '../types/portal';
import { RoleProfileService } from './role-profile.service';
import { TemplateCustomizationService } from './template-customization.service';

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

/**
 * Template recommendation based on role analysis
 */
export interface TemplateRecommendation {
  /** Template identifier */
  templateId: string;
  
  /** Template name */
  templateName: string;
  
  /** Template category */
  category: PortalTemplateCategory;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Recommendation priority (1 = highest) */
  priority: number;
  
  /** Reasoning for recommendation */
  reasoning: string;
  
  /** Specific customizations for this role */
  customizations: TemplateCustomizations;
  
  /** Alternative template options */
  alternatives?: string[];
}

/**
 * Template customizations specific to a role
 */
export interface TemplateCustomizations {
  /** Primary color adjustments */
  primaryColor?: string;
  
  /** Secondary color adjustments */
  secondaryColor?: string;
  
  /** Typography preferences */
  typography?: {
    headingFont?: string;
    bodyFont?: string;
    fontSize?: 'small' | 'medium' | 'large';
  };
  
  /** Section priorities */
  sectionPriorities: {
    section: PortalSection;
    priority: number;
    emphasis: 'high' | 'medium' | 'low';
  }[];
  
  /** Layout preferences */
  layoutPreferences: {
    density: 'compact' | 'comfortable' | 'spacious';
    sidebarPosition?: 'left' | 'right' | 'none';
    headerStyle: 'minimal' | 'detailed' | 'hero';
  };
  
  /** Content adjustments */
  contentAdjustments: {
    highlightSkills: boolean;
    emphasizeExperience: boolean;
    showcasePortfolio: boolean;
    includeTestimonials: boolean;
  };
}

/**
 * Optimized template configuration for a specific role
 */
export interface OptimizedTemplate extends PortalTemplate {
  /** Role-specific optimizations applied */
  roleOptimizations: {
    roleId: string;
    roleName: string;
    optimizationScore: number;
    appliedCustomizations: TemplateCustomizations;
  };
  
  /** Enhanced theme for the role */
  enhancedTheme?: PortalTheme;
  
  /** Metadata about optimization */
  optimizationMetadata: {
    optimizedAt: Date;
    confidence: number;
    version: string;
  };
}

/**
 * Role-Template mapping configuration
 */
export interface RoleTemplateMap {
  [roleId: string]: {
    primaryTemplate: string;
    alternativeTemplates: string[];
    customizations: TemplateCustomizations;
    confidence: number;
  };
}

/**
 * Service configuration
 */
export interface RoleTemplateIntegrationConfig {
  /** Enable caching of mappings */
  enableCaching: boolean;
  
  /** Cache timeout in milliseconds */
  cacheTimeout: number;
  
  /** Maximum recommendations to return */
  maxRecommendations: number;
  
  /** Minimum confidence threshold */
  minConfidenceThreshold: number;
  
  /** Enable AI-powered optimization */
  enableAIOptimization: boolean;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class RoleTemplateIntegrationService {
  private db: FirebaseFirestore.Firestore;
  private roleProfileService: RoleProfileService;
  private templateCustomizationService: TemplateCustomizationService;
  private config: RoleTemplateIntegrationConfig;
  private cache: Map<string, any>;
  private lastCacheUpdate: number;

  /**
   * Static role-template mappings
   */
  private static readonly ROLE_TEMPLATE_MAPPINGS: Record<string, {
    primary: PortalTemplateCategory;
    alternatives: PortalTemplateCategory[];
    reasoning: string;
  }> = {
    // Engineering roles
    'software-engineer': {
      primary: PortalTemplateCategory.TECHNICAL_EXPERT,
      alternatives: [PortalTemplateCategory.MODERN, PortalTemplateCategory.MINIMAL],
      reasoning: 'Technical showcase with clean code presentation and project highlights'
    },
    'devops-engineer': {
      primary: PortalTemplateCategory.TECHNICAL_EXPERT,
      alternatives: [PortalTemplateCategory.PROFESSIONAL, PortalTemplateCategory.MODERN],
      reasoning: 'Infrastructure and automation focus with technical depth'
    },
    'quality-assurance-engineer': {
      primary: PortalTemplateCategory.TECHNICAL,
      alternatives: [PortalTemplateCategory.PROFESSIONAL, PortalTemplateCategory.CORPORATE_PROFESSIONAL],
      reasoning: 'Process-oriented layout with testing metrics showcase'
    },
    
    // Design roles
    'ui-ux-designer': {
      primary: PortalTemplateCategory.CREATIVE_PORTFOLIO,
      alternatives: [PortalTemplateCategory.CREATIVE, PortalTemplateCategory.MODERN],
      reasoning: 'Visual portfolio showcase with creative flair and interactive elements'
    },
    
    // Business roles
    'business-analyst': {
      primary: PortalTemplateCategory.BUSINESS,
      alternatives: [PortalTemplateCategory.CORPORATE_PROFESSIONAL, PortalTemplateCategory.PROFESSIONAL],
      reasoning: 'Executive-style presentation with data-driven insights'
    },
    'project-manager': {
      primary: PortalTemplateCategory.PROFESSIONAL,
      alternatives: [PortalTemplateCategory.BUSINESS, PortalTemplateCategory.CORPORATE_PROFESSIONAL],
      reasoning: 'Project achievements and leadership focus with clean structure'
    },
    'product-manager': {
      primary: PortalTemplateCategory.BUSINESS,
      alternatives: [PortalTemplateCategory.MODERN, PortalTemplateCategory.PROFESSIONAL],
      reasoning: 'Product showcase with strategic vision and metrics'
    },
    
    // Marketing roles
    'digital-marketing-specialist': {
      primary: PortalTemplateCategory.CREATIVE,
      alternatives: [PortalTemplateCategory.MODERN, PortalTemplateCategory.PROFESSIONAL],
      reasoning: 'Campaign showcase with creative and analytical balance'
    },
    'product-marketing-manager': {
      primary: PortalTemplateCategory.BUSINESS,
      alternatives: [PortalTemplateCategory.CREATIVE, PortalTemplateCategory.MODERN],
      reasoning: 'Strategic marketing with product focus and campaign results'
    },
    
    // HR roles
    'hr-specialist': {
      primary: PortalTemplateCategory.CORPORATE_PROFESSIONAL,
      alternatives: [PortalTemplateCategory.PROFESSIONAL, PortalTemplateCategory.BUSINESS],
      reasoning: 'People-focused design with professional corporate appeal'
    },
    
    // Management roles
    'engineering-manager': {
      primary: PortalTemplateCategory.BUSINESS,
      alternatives: [PortalTemplateCategory.TECHNICAL_EXPERT, PortalTemplateCategory.PROFESSIONAL],
      reasoning: 'Leadership and technical balance with team achievements'
    },
    'sales-manager': {
      primary: PortalTemplateCategory.BUSINESS,
      alternatives: [PortalTemplateCategory.PROFESSIONAL, PortalTemplateCategory.CORPORATE_PROFESSIONAL],
      reasoning: 'Results-driven layout with achievement metrics'
    },
    
    // Data roles
    'data-scientist': {
      primary: PortalTemplateCategory.TECHNICAL_EXPERT,
      alternatives: [PortalTemplateCategory.ACADEMIC, PortalTemplateCategory.MODERN],
      reasoning: 'Research and technical focus with data visualization capabilities'
    },
    'ai-product-expert': {
      primary: PortalTemplateCategory.TECHNICAL_EXPERT,
      alternatives: [PortalTemplateCategory.MODERN, PortalTemplateCategory.BUSINESS],
      reasoning: 'AI innovation showcase with product and technical balance'
    },
    
    // Other roles
    'financial-analyst': {
      primary: PortalTemplateCategory.CORPORATE_PROFESSIONAL,
      alternatives: [PortalTemplateCategory.BUSINESS, PortalTemplateCategory.PROFESSIONAL],
      reasoning: 'Data-focused with financial metrics and conservative design'
    },
    'customer-success-manager': {
      primary: PortalTemplateCategory.PROFESSIONAL,
      alternatives: [PortalTemplateCategory.BUSINESS, PortalTemplateCategory.MODERN],
      reasoning: 'Customer-centric design with success stories and metrics'
    },
    'operations-manager': {
      primary: PortalTemplateCategory.CORPORATE_PROFESSIONAL,
      alternatives: [PortalTemplateCategory.BUSINESS, PortalTemplateCategory.PROFESSIONAL],
      reasoning: 'Process optimization focus with operational metrics'
    },
    'healthcare-professional': {
      primary: PortalTemplateCategory.PROFESSIONAL,
      alternatives: [PortalTemplateCategory.ACADEMIC, PortalTemplateCategory.MINIMAL],
      reasoning: 'Clean, professional design with credentials focus'
    },
    'teacher-educator': {
      primary: PortalTemplateCategory.ACADEMIC,
      alternatives: [PortalTemplateCategory.PROFESSIONAL, PortalTemplateCategory.CLASSIC],
      reasoning: 'Education-focused with achievements and curriculum highlights'
    }
  };

  /**
   * Role-specific color schemes
   */
  private static readonly ROLE_COLOR_SCHEMES: Record<string, {
    primary: string;
    secondary: string;
    accent: string;
  }> = {
    'software-engineer': { primary: '#0066cc', secondary: '#64748b', accent: '#10b981' },
    'devops-engineer': { primary: '#ff6b6b', secondary: '#4ecdc4', accent: '#45b7d1' },
    'ui-ux-designer': { primary: '#8b5cf6', secondary: '#ec4899', accent: '#f59e0b' },
    'business-analyst': { primary: '#1e40af', secondary: '#374151', accent: '#059669' },
    'project-manager': { primary: '#2563eb', secondary: '#475569', accent: '#0891b2' },
    'digital-marketing-specialist': { primary: '#dc2626', secondary: '#f59e0b', accent: '#8b5cf6' },
    'hr-specialist': { primary: '#059669', secondary: '#0891b2', accent: '#7c3aed' },
    'engineering-manager': { primary: '#1e3a8a', secondary: '#475569', accent: '#059669' },
    'data-scientist': { primary: '#7c3aed', secondary: '#0891b2', accent: '#10b981' },
    'ai-product-expert': { primary: '#9333ea', secondary: '#0ea5e9', accent: '#f59e0b' }
  };

  constructor(config?: Partial<RoleTemplateIntegrationConfig>) {
    this.db = admin.firestore();
    this.cache = new Map();
    this.lastCacheUpdate = 0;

    this.config = {
      enableCaching: true,
      cacheTimeout: 3600000, // 1 hour
      maxRecommendations: 5,
      minConfidenceThreshold: 0.6,
      enableAIOptimization: true,
      ...config
    };

    this.roleProfileService = new RoleProfileService();
    this.templateCustomizationService = new TemplateCustomizationService();

    logger.info('[ROLE-TEMPLATE-INTEGRATION] Service initialized', {
      caching: this.config.enableCaching,
      aiOptimization: this.config.enableAIOptimization
    });
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get recommended templates for a specific role
   */
  async getRecommendedTemplates(roleId: string): Promise<TemplateRecommendation[]> {
    logger.info('[ROLE-TEMPLATE-INTEGRATION] Getting template recommendations', { roleId });

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.getCachedRecommendations(roleId);
        if (cached) {
          logger.info('[ROLE-TEMPLATE-INTEGRATION] Returning cached recommendations');
          return cached;
        }
      }

      // Get role profile
      const roleProfile = await this.roleProfileService.getProfileById(roleId);
      if (!roleProfile) {
        throw new Error(`Role profile not found: ${roleId}`);
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(roleProfile);

      // Sort by priority
      recommendations.sort((a, b) => a.priority - b.priority);

      // Limit to max recommendations
      const limitedRecommendations = recommendations.slice(0, this.config.maxRecommendations);

      // Cache results
      if (this.config.enableCaching) {
        this.cacheRecommendations(roleId, limitedRecommendations);
      }

      logger.info('[ROLE-TEMPLATE-INTEGRATION] Generated recommendations', {
        roleId,
        count: limitedRecommendations.length,
        primary: limitedRecommendations[0]?.templateName
      });

      return limitedRecommendations;

    } catch (error) {
      logger.error('[ROLE-TEMPLATE-INTEGRATION] Failed to get recommendations', error);
      throw new Error(`Failed to get template recommendations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Optimize a template for a specific role
   */
  async optimizeTemplateForRole(templateId: string, roleId: string): Promise<OptimizedTemplate> {
    logger.info('[ROLE-TEMPLATE-INTEGRATION] Optimizing template for role', { templateId, roleId });

    try {
      // Get role profile
      const roleProfile = await this.roleProfileService.getProfileById(roleId);
      if (!roleProfile) {
        throw new Error(`Role profile not found: ${roleId}`);
      }

      // Get base template
      const baseTemplate = await this.getTemplateById(templateId);
      if (!baseTemplate) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Generate customizations
      const customizations = this.generateCustomizations(roleProfile, baseTemplate);

      // Apply optimizations
      const optimizedTemplate = this.applyOptimizations(baseTemplate, roleProfile, customizations);

      logger.info('[ROLE-TEMPLATE-INTEGRATION] Template optimization completed', {
        templateId,
        roleId,
        optimizationScore: optimizedTemplate.roleOptimizations.optimizationScore
      });

      return optimizedTemplate;

    } catch (error) {
      logger.error('[ROLE-TEMPLATE-INTEGRATION] Template optimization failed', error);
      throw new Error(`Failed to optimize template: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get complete role-template mapping
   */
  async getRoleTemplateMapping(): Promise<RoleTemplateMap> {
    logger.info('[ROLE-TEMPLATE-INTEGRATION] Getting role-template mapping');

    try {
      // Check cache
      if (this.config.enableCaching) {
        const cached = this.cache.get('role-template-map');
        if (cached && this.isCacheValid()) {
          return cached;
        }
      }

      // Get all role profiles
      const roleProfiles = await this.roleProfileService.getAllProfiles();

      // Build mapping
      const mapping: RoleTemplateMap = {};
      
      for (const profile of roleProfiles) {
        const recommendations = await this.getRecommendedTemplates(profile.id);
        
        if (recommendations.length > 0) {
          mapping[profile.id] = {
            primaryTemplate: recommendations[0].templateId,
            alternativeTemplates: recommendations.slice(1).map(r => r.templateId),
            customizations: recommendations[0].customizations,
            confidence: recommendations[0].confidence
          };
        }
      }

      // Cache mapping
      if (this.config.enableCaching) {
        this.cache.set('role-template-map', mapping);
        this.lastCacheUpdate = Date.now();
      }

      logger.info('[ROLE-TEMPLATE-INTEGRATION] Role-template mapping generated', {
        roleCount: Object.keys(mapping).length
      });

      return mapping;

    } catch (error) {
      logger.error('[ROLE-TEMPLATE-INTEGRATION] Failed to get mapping', error);
      throw new Error(`Failed to get role-template mapping: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get template customizations for a specific role
   */
  async getTemplateCustomizations(roleId: string, templateId: string): Promise<TemplateCustomizations> {
    logger.info('[ROLE-TEMPLATE-INTEGRATION] Getting template customizations', { roleId, templateId });

    try {
      // Get role profile
      const roleProfile = await this.roleProfileService.getProfileById(roleId);
      if (!roleProfile) {
        throw new Error(`Role profile not found: ${roleId}`);
      }

      // Get template
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Generate customizations
      const customizations = this.generateCustomizations(roleProfile, template);

      logger.info('[ROLE-TEMPLATE-INTEGRATION] Customizations generated', {
        roleId,
        templateId,
        sectionCount: customizations.sectionPriorities.length
      });

      return customizations;

    } catch (error) {
      logger.error('[ROLE-TEMPLATE-INTEGRATION] Failed to get customizations', error);
      throw new Error(`Failed to get template customizations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Batch get recommendations for multiple roles
   */
  async batchGetRecommendations(roleIds: string[]): Promise<Map<string, TemplateRecommendation[]>> {
    logger.info('[ROLE-TEMPLATE-INTEGRATION] Batch getting recommendations', {
      roleCount: roleIds.length
    });

    try {
      const results = new Map<string, TemplateRecommendation[]>();

      // Process in parallel with limit
      const batchSize = 5;
      for (let i = 0; i < roleIds.length; i += batchSize) {
        const batch = roleIds.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(roleId => this.getRecommendedTemplates(roleId))
        );

        batch.forEach((roleId, index) => {
          results.set(roleId, batchResults[index]);
        });
      }

      logger.info('[ROLE-TEMPLATE-INTEGRATION] Batch recommendations completed', {
        processedCount: results.size
      });

      return results;

    } catch (error) {
      logger.error('[ROLE-TEMPLATE-INTEGRATION] Batch processing failed', error);
      throw new Error(`Failed to batch get recommendations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateRecommendations(roleProfile: RoleProfile): TemplateRecommendation[] {
    const recommendations: TemplateRecommendation[] = [];
    
    // Get role-specific mapping
    const roleKey = this.getRoleKey(roleProfile);
    const mapping = RoleTemplateIntegrationService.ROLE_TEMPLATE_MAPPINGS[roleKey];

    if (mapping) {
      // Add primary recommendation
      recommendations.push({
        templateId: `${mapping.primary}-template`,
        templateName: this.formatTemplateName(mapping.primary),
        category: mapping.primary,
        confidence: 0.95,
        priority: 1,
        reasoning: mapping.reasoning,
        customizations: this.generateCustomizationsForRole(roleProfile, mapping.primary),
        alternatives: mapping.alternatives.map(alt => `${alt}-template`)
      });

      // Add alternative recommendations
      mapping.alternatives.forEach((altCategory, index) => {
        recommendations.push({
          templateId: `${altCategory}-template`,
          templateName: this.formatTemplateName(altCategory),
          category: altCategory,
          confidence: 0.85 - (index * 0.1),
          priority: index + 2,
          reasoning: `Alternative template suitable for ${roleProfile.name}`,
          customizations: this.generateCustomizationsForRole(roleProfile, altCategory)
        });
      });
    } else {
      // Fallback recommendations based on category
      const defaultTemplate = this.getDefaultTemplateForCategory(roleProfile.category);
      recommendations.push({
        templateId: `${defaultTemplate}-template`,
        templateName: this.formatTemplateName(defaultTemplate),
        category: defaultTemplate,
        confidence: 0.7,
        priority: 1,
        reasoning: `Default template for ${roleProfile.category} category`,
        customizations: this.generateCustomizationsForRole(roleProfile, defaultTemplate)
      });
    }

    return recommendations;
  }

  private generateCustomizationsForRole(
    roleProfile: RoleProfile, 
    templateCategory: PortalTemplateCategory
  ): TemplateCustomizations {
    const roleKey = this.getRoleKey(roleProfile);
    const colorScheme = RoleTemplateIntegrationService.ROLE_COLOR_SCHEMES[roleKey];

    return {
      primaryColor: colorScheme?.primary,
      secondaryColor: colorScheme?.secondary,
      typography: this.getTypographyForRole(roleProfile),
      sectionPriorities: this.getSectionPrioritiesForRole(roleProfile),
      layoutPreferences: this.getLayoutPreferencesForRole(roleProfile, templateCategory),
      contentAdjustments: this.getContentAdjustmentsForRole(roleProfile)
    };
  }

  private generateCustomizations(
    roleProfile: RoleProfile, 
    template: PortalTemplate
  ): TemplateCustomizations {
    return this.generateCustomizationsForRole(roleProfile, template.category);
  }

  private applyOptimizations(
    template: PortalTemplate,
    roleProfile: RoleProfile,
    customizations: TemplateCustomizations
  ): OptimizedTemplate {
    const optimizedTemplate: OptimizedTemplate = {
      ...template,
      roleOptimizations: {
        roleId: roleProfile.id,
        roleName: roleProfile.name,
        optimizationScore: this.calculateOptimizationScore(roleProfile, template),
        appliedCustomizations: customizations
      },
      optimizationMetadata: {
        optimizedAt: new Date(),
        confidence: 0.9,
        version: '1.0'
      }
    };

    // Apply theme enhancements if colors are customized
    if (customizations.primaryColor || customizations.secondaryColor) {
      optimizedTemplate.enhancedTheme = {
        ...template.theme,
        colors: {
          ...template.theme.colors,
          primary: customizations.primaryColor || template.theme.colors.primary,
          secondary: customizations.secondaryColor || template.theme.colors.secondary
        }
      };
    }

    return optimizedTemplate;
  }

  private getRoleKey(roleProfile: RoleProfile): string {
    // Convert role name to key format
    return roleProfile.name.toLowerCase().replace(/\s+/g, '-');
  }

  private formatTemplateName(category: PortalTemplateCategory): string {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private getDefaultTemplateForCategory(category: RoleCategory): PortalTemplateCategory {
    const categoryTemplateMap: Record<RoleCategory, PortalTemplateCategory> = {
      [RoleCategory.ENGINEERING]: PortalTemplateCategory.TECHNICAL_EXPERT,
      [RoleCategory.MANAGEMENT]: PortalTemplateCategory.BUSINESS,
      [RoleCategory.BUSINESS]: PortalTemplateCategory.CORPORATE_PROFESSIONAL,
      [RoleCategory.DESIGN]: PortalTemplateCategory.CREATIVE_PORTFOLIO,
      [RoleCategory.DATA]: PortalTemplateCategory.TECHNICAL,
      [RoleCategory.OPERATIONS]: PortalTemplateCategory.PROFESSIONAL,
      [RoleCategory.MARKETING]: PortalTemplateCategory.CREATIVE,
      [RoleCategory.SALES]: PortalTemplateCategory.BUSINESS,
      [RoleCategory.HR]: PortalTemplateCategory.CORPORATE_PROFESSIONAL,
      [RoleCategory.CONSULTING]: PortalTemplateCategory.PROFESSIONAL
    };

    return categoryTemplateMap[category] || PortalTemplateCategory.PROFESSIONAL;
  }

  private getTypographyForRole(roleProfile: RoleProfile): TemplateCustomizations['typography'] {
    const typography: TemplateCustomizations['typography'] = {
      fontSize: 'medium'
    };

    if (roleProfile.category === RoleCategory.DESIGN) {
      typography.headingFont = 'Poppins, sans-serif';
      typography.bodyFont = 'Inter, sans-serif';
    } else if (roleProfile.category === RoleCategory.ENGINEERING) {
      typography.headingFont = 'Inter, sans-serif';
      typography.bodyFont = 'Inter, sans-serif';
      typography.fontSize = 'small';
    } else if (roleProfile.experienceLevel === ExperienceLevel.EXECUTIVE) {
      typography.headingFont = 'Playfair Display, serif';
      typography.bodyFont = 'Inter, sans-serif';
      typography.fontSize = 'large';
    }

    return typography;
  }

  private getSectionPrioritiesForRole(roleProfile: RoleProfile): TemplateCustomizations['sectionPriorities'] {
    const basePriorities: TemplateCustomizations['sectionPriorities'] = [
      { section: PortalSection.HERO, priority: 1, emphasis: 'high' },
      { section: PortalSection.ABOUT, priority: 2, emphasis: 'high' },
      { section: PortalSection.EXPERIENCE, priority: 3, emphasis: 'high' },
      { section: PortalSection.SKILLS, priority: 4, emphasis: 'medium' },
      { section: PortalSection.PROJECTS, priority: 5, emphasis: 'medium' },
      { section: PortalSection.EDUCATION, priority: 6, emphasis: 'low' },
      { section: PortalSection.CONTACT, priority: 7, emphasis: 'medium' }
    ];

    // Adjust based on role
    if (roleProfile.category === RoleCategory.DESIGN) {
      // Prioritize portfolio for designers
      const projectsIndex = basePriorities.findIndex(p => p.section === PortalSection.PROJECTS);
      if (projectsIndex > -1) {
        basePriorities[projectsIndex].priority = 3;
        basePriorities[projectsIndex].emphasis = 'high';
      }
    } else if (roleProfile.category === RoleCategory.ENGINEERING) {
      // Prioritize skills for engineers
      const skillsIndex = basePriorities.findIndex(p => p.section === PortalSection.SKILLS);
      if (skillsIndex > -1) {
        basePriorities[skillsIndex].priority = 3;
        basePriorities[skillsIndex].emphasis = 'high';
      }
    } else if (roleProfile.experienceLevel === ExperienceLevel.EXECUTIVE) {
      // De-emphasize education for executives
      const educationIndex = basePriorities.findIndex(p => p.section === PortalSection.EDUCATION);
      if (educationIndex > -1) {
        basePriorities[educationIndex].priority = 8;
        basePriorities[educationIndex].emphasis = 'low';
      }
    }

    // Sort by priority
    return basePriorities.sort((a, b) => a.priority - b.priority);
  }

  private getLayoutPreferencesForRole(
    roleProfile: RoleProfile,
    templateCategory: PortalTemplateCategory
  ): TemplateCustomizations['layoutPreferences'] {
    let density: 'compact' | 'comfortable' | 'spacious' = 'comfortable';
    let headerStyle: 'minimal' | 'detailed' | 'hero' = 'detailed';

    if (roleProfile.category === RoleCategory.ENGINEERING) {
      density = 'compact';
      headerStyle = 'minimal';
    } else if (roleProfile.category === RoleCategory.DESIGN) {
      density = 'spacious';
      headerStyle = 'hero';
    } else if (roleProfile.experienceLevel === ExperienceLevel.EXECUTIVE) {
      density = 'spacious';
      headerStyle = 'hero';
    }

    return {
      density,
      sidebarPosition: templateCategory === PortalTemplateCategory.TECHNICAL ? 'left' : 'none',
      headerStyle
    };
  }

  private getContentAdjustmentsForRole(roleProfile: RoleProfile): TemplateCustomizations['contentAdjustments'] {
    return {
      highlightSkills: roleProfile.category === RoleCategory.ENGINEERING || roleProfile.category === RoleCategory.DATA,
      emphasizeExperience: roleProfile.experienceLevel >= ExperienceLevel.SENIOR,
      showcasePortfolio: roleProfile.category === RoleCategory.DESIGN || roleProfile.category === RoleCategory.MARKETING,
      includeTestimonials: roleProfile.category === RoleCategory.CONSULTING || roleProfile.category === RoleCategory.SALES
    };
  }

  private calculateOptimizationScore(roleProfile: RoleProfile, template: PortalTemplate): number {
    let score = 0.5; // Base score

    // Check category match
    const roleKey = this.getRoleKey(roleProfile);
    const mapping = RoleTemplateIntegrationService.ROLE_TEMPLATE_MAPPINGS[roleKey];
    
    if (mapping) {
      if (template.category === mapping.primary) {
        score = 0.95;
      } else if (mapping.alternatives.includes(template.category)) {
        score = 0.85;
      }
    }

    // Adjust based on experience level
    if (roleProfile.experienceLevel === ExperienceLevel.EXECUTIVE && 
        template.category === PortalTemplateCategory.BUSINESS) {
      score += 0.05;
    }

    return Math.min(1, score);
  }

  private async getTemplateById(templateId: string): Promise<PortalTemplate | null> {
    // This would normally fetch from a database or template registry
    // For now, return a mock template based on ID
    const category = templateId.replace('-template', '').toUpperCase().replace(/-/g, '_') as PortalTemplateCategory;
    
    return {
      id: templateId,
      name: this.formatTemplateName(category),
      description: `Template for ${category}`,
      category,
      version: '1.0',
      isPremium: false,
      theme: {
        id: `${templateId}-theme`,
        name: `${this.formatTemplateName(category)} Theme`,
        colors: {
          primary: '#0066cc',
          secondary: '#64748b',
          background: {
            primary: '#ffffff',
            secondary: '#f8fafc',
            accent: '#f1f5f9'
          },
          text: {
            primary: '#1f2937',
            secondary: '#6b7280',
            muted: '#9ca3af',
            accent: '#0f172a'
          },
          border: {
            primary: '#e5e7eb',
            light: '#f3f4f6',
            accent: '#cbd5e1'
          },
          status: {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6'
          }
        },
        typography: {
          fontFamilies: {
            heading: 'Inter, sans-serif',
            body: 'Inter, sans-serif',
            mono: 'JetBrains Mono, monospace'
          },
          fontSizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem'
          },
          lineHeights: {
            tight: 1.25,
            normal: 1.5,
            relaxed: 1.75
          },
          fontWeights: {
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
          }
        },
        spacing: {
          baseUnit: 1,
          sectionPadding: 2,
          elementMargin: 1
        },
        borderRadius: {
          sm: '0.25rem',
          md: '0.5rem',
          lg: '0.75rem'
        },
        shadows: {
          sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
          md: '0 4px 6px rgba(0, 0, 0, 0.1)',
          lg: '0 10px 15px rgba(0, 0, 0, 0.1)'
        }
      },
      requiredSections: [PortalSection.HERO, PortalSection.ABOUT, PortalSection.EXPERIENCE],
      optionalSections: [PortalSection.SKILLS, PortalSection.PROJECTS, PortalSection.EDUCATION]
    };
  }

  private getCachedRecommendations(roleId: string): TemplateRecommendation[] | null {
    if (!this.isCacheValid()) {
      return null;
    }
    return this.cache.get(`recommendations-${roleId}`) || null;
  }

  private cacheRecommendations(roleId: string, recommendations: TemplateRecommendation[]): void {
    this.cache.set(`recommendations-${roleId}`, recommendations);
    this.lastCacheUpdate = Date.now();
  }

  private isCacheValid(): boolean {
    if (!this.config.enableCaching) {
      return false;
    }
    return (Date.now() - this.lastCacheUpdate) < this.config.cacheTimeout;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastCacheUpdate = 0;
    logger.info('[ROLE-TEMPLATE-INTEGRATION] Cache cleared');
  }

  /**
   * Get service status
   */
  getStatus(): {
    service: string;
    cacheEnabled: boolean;
    cacheSize: number;
    lastUpdate: number;
    aiOptimization: boolean;
  } {
    return {
      service: 'RoleTemplateIntegrationService',
      cacheEnabled: this.config.enableCaching,
      cacheSize: this.cache.size,
      lastUpdate: this.lastCacheUpdate,
      aiOptimization: this.config.enableAIOptimization
    };
  }
}