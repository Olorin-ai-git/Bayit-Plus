// @ts-ignore - Export conflicts/**
 * Template Customization Service
 * 
 * Advanced AI-powered template customization service for CVPlus web portals.
 * Provides intelligent template selection, dynamic theme generation, and 
 * industry-specific customization with responsive design optimization.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 * @version 1.0
 */

import { logger } from 'firebase-functions';
import { VerifiedClaudeService } from './verified-claude.service';
import { 
  PortalTemplate, 
  PortalTheme, 
  PortalTemplateCategory,
  PortalSection,
} from '../types/portal';
import { ParsedCV } from '../types/job';
import {
  ColorScheme, 
  TypographyConfig
} from '../types/portal-theme';

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

/**
 * Template customization configuration
 */
export interface TemplateCustomizationConfig {
  /** Enable AI-powered recommendations */
  enableAIRecommendations: boolean;
  
  /** Debug mode for detailed logging */
  debugMode: boolean;
  
  /** Maximum processing time in ms */
  maxProcessingTime: number;
  
  /** Cache customization results */
  enableCaching: boolean;
}

/**
 * CV analysis result for template selection
 */
export interface CVAnalysisResult {
  /** Detected industry/field */
  industry: string;
  
  /** Professional level assessment */
  level: ProfessionalLevel;
  
  /** Career focus areas */
  focusAreas: string[];
  
  /** Personality traits extracted */
  personalityTraits: PersonalityTrait[];
  
  /** Content analysis */
  contentAnalysis: ContentAnalysis;
  
  /** Recommended template category */
  recommendedCategory: PortalTemplateCategory;
  
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Professional experience levels
 */
export enum ProfessionalLevel {
  ENTRY_LEVEL = 'entry_level',
  JUNIOR = 'junior',
  MID_LEVEL = 'mid_level',
  SENIOR = 'senior',
  LEAD = 'lead',
  EXECUTIVE = 'executive',
  C_LEVEL = 'c_level'
}

/**
 * Personality traits for design adaptation
 */
export enum PersonalityTrait {
  CREATIVE = 'creative',
  ANALYTICAL = 'analytical',
  LEADERSHIP = 'leadership',
  INNOVATIVE = 'innovative',
  DETAIL_ORIENTED = 'detail_oriented',
  COLLABORATIVE = 'collaborative',
  ENTREPRENEURIAL = 'entrepreneurial',
  TECHNICAL = 'technical'
}

/**
 * Content analysis results
 */
export interface ContentAnalysis {
  /** Total word count */
  wordCount: number;
  
  /** Key technical skills mentioned */
  technicalSkills: string[];
  
  /** Soft skills mentioned */
  softSkills: string[];
  
  /** Industries mentioned */
  industries: string[];
  
  /** Company types */
  companyTypes: CompanyType[];
  
  /** Content density by section */
  sectionDensity: Record<string, number>;
  
  /** Achievement indicators */
  achievementCount: number;
  
  /** International experience indicators */
  internationalExperience: boolean;
}

/**
 * Company types for industry analysis
 */
export enum CompanyType {
  STARTUP = 'startup',
  SCALE_UP = 'scale_up',
  ENTERPRISE = 'enterprise',
  GOVERNMENT = 'government',
  NON_PROFIT = 'non_profit',
  CONSULTING = 'consulting',
  AGENCY = 'agency',
  FREELANCE = 'freelance'
}

/**
 * Template selection preferences
 */
export interface TemplatePreferences {
  /** Preferred template category */
  category?: PortalTemplateCategory;
  
  /** Color preferences */
  colorPreferences?: {
    preferredColors: string[];
    avoidColors: string[];
    colorTemperature: 'warm' | 'cool' | 'neutral';
  };
  
  /** Layout preferences */
  layoutPreferences?: {
    density: 'compact' | 'comfortable' | 'spacious';
    sectionOrder: PortalSection[];
    mobileFirst: boolean;
  };
  
  /** Industry-specific requirements */
  industryRequirements?: {
    conservative: boolean;
    creative: boolean;
    technical: boolean;
    international: boolean;
  };
}

/**
 * Dynamic theme generation result
 */
export interface GeneratedTheme extends PortalTheme {
  /** Theme generation metadata */
  generationMetadata: {
    aiGenerated: boolean;
    industryAdapted: boolean;
    personalityAdapted: boolean;
    confidence: number;
    generatedAt: Date;
  };
  
  /** Layout configuration */
  layout?: {
    headerStyle: 'minimal' | 'hero' | 'detailed';
    navigationStyle: 'horizontal' | 'vertical' | 'hidden';
    contentLayout: 'single' | 'two-column' | 'grid';
  };
  
  /** Responsive breakpoints */
  breakpoints: ResponsiveBreakpoints;
  
  /** Component variants */
  componentVariants: ComponentVariants;
  
  /** Animation presets */
  animations: AnimationPresets;
}

/**
 * Responsive design breakpoints
 */
export interface ResponsiveBreakpoints {
  mobile: string;    // 320px
  tablet: string;    // 768px
  desktop: string;   // 1024px
  wide: string;      // 1440px
  ultrawide: string; // 1920px
}

/**
 * Component styling variants
 */
export interface ComponentVariants {
  buttons: ButtonVariants;
  cards: CardVariants;
  navigation: NavigationVariants;
  forms: FormVariants;
}

/**
 * Button styling variants
 */
export interface ButtonVariants {
  primary: ComponentStyle;
  secondary: ComponentStyle;
  accent: ComponentStyle;
  ghost: ComponentStyle;
}

/**
 * Card styling variants
 */
export interface CardVariants {
  default: ComponentStyle;
  elevated: ComponentStyle;
  outlined: ComponentStyle;
  transparent: ComponentStyle;
}

/**
 * Navigation styling variants
 */
export interface NavigationVariants {
  header: ComponentStyle;
  sidebar: ComponentStyle;
  footer: ComponentStyle;
  mobile: ComponentStyle;
}

/**
 * Form styling variants
 */
export interface FormVariants {
  input: ComponentStyle;
  textarea: ComponentStyle;
  select: ComponentStyle;
  checkbox: ComponentStyle;
}

/**
 * Component style definition
 */
export interface ComponentStyle {
  base: string;
  hover: string;
  active: string;
  disabled: string;
  focus: string;
}

/**
 * Animation presets
 */
export interface AnimationPresets {
  pageTransitions: string;
  buttonHover: string;
  cardHover: string;
  textReveal: string;
  fadeIn: string;
  slideIn: string;
}

/**
 * Responsive CSS generation result
 */
export interface ResponsiveCSS {
  /** Mobile-first base styles */
  base: string;
  
  /** Tablet styles */
  tablet: string;
  
  /** Desktop styles */
  desktop: string;
  
  /** High-resolution styles */
  highRes: string;
  
  /** Dark mode styles */
  darkMode: string;
  
  /** Print styles */
  print: string;
  
  /** Accessibility enhancements */
  accessibility: string;
}

/**
 * Component configuration for portal sections
 */
export interface ComponentConfig {
  /** Section visibility */
  sections: Record<PortalSection, SectionConfig>;
  
  /** Interactive features */
  interactiveFeatures: InteractiveFeatureConfig;
  
  /** Performance optimizations */
  performance: PerformanceConfig;
  
  /** SEO enhancements */
  seo: SEOConfig;
}

/**
 * Section-specific configuration
 */
export interface SectionConfig {
  enabled: boolean;
  order: number;
  layout: 'default' | 'compact' | 'expanded' | 'sidebar';
  animation: 'none' | 'fade' | 'slide' | 'scale';
  customization: Record<string, any>;
}

/**
 * Interactive feature configuration
 */
export interface InteractiveFeatureConfig {
  chat: {
    enabled: boolean;
    placement: 'fixed' | 'section' | 'modal';
    style: 'bubble' | 'card' | 'fullscreen';
  };
  
  contactForm: {
    enabled: boolean;
    fields: string[];
    validation: 'client' | 'server' | 'both';
  };
  
  portfolio: {
    enabled: boolean;
    layout: 'grid' | 'masonry' | 'carousel';
    filtering: boolean;
  };
  
  downloadCenter: {
    enabled: boolean;
    formats: ('pdf' | 'docx' | 'txt')[];
    tracking: boolean;
  };
}

/**
 * Performance optimization settings
 */
export interface PerformanceConfig {
  lazyLoading: boolean;
  imageOptimization: boolean;
  codeMinification: boolean;
  caching: {
    enabled: boolean;
    strategy: 'static' | 'dynamic' | 'hybrid';
    ttl: number;
  };
}

/**
 * SEO configuration
 */
export interface SEOConfig {
  metaTags: boolean;
  structuredData: boolean;
  openGraph: boolean;
  twitterCards: boolean;
  sitemap: boolean;
}

/**
 * Platform deployment optimization
 */
export interface PlatformOptimization {
  /** Target deployment platforms */
  platforms: string[];
  
  /** Platform-specific optimizations */
  optimizations: Record<string, PlatformSpecificConfig>;
  
  /** Cross-platform compatibility */
  compatibility: CompatibilityConfig;
}

/**
 * Platform-specific configuration
 */
export interface PlatformSpecificConfig {
  /** Framework-specific settings */
  framework: Record<string, any>;
  
  /** Asset optimization */
  assets: AssetOptimization;
  
  /** Performance tuning */
  performance: PerformanceOptimization;
  
  /** Security considerations */
  security: SecurityConfig;
}

/**
 * Asset optimization settings
 */
export interface AssetOptimization {
  images: {
    format: 'webp' | 'jpg' | 'png' | 'auto';
    quality: number;
    lazy: boolean;
  };
  
  fonts: {
    strategy: 'embed' | 'link' | 'system';
    preload: boolean;
    display: 'swap' | 'block' | 'fallback';
  };
  
  css: {
    minify: boolean;
    inline: boolean;
    critical: boolean;
  };
  
  javascript: {
    minify: boolean;
    bundle: boolean;
    defer: boolean;
  };
}

/**
 * Performance optimization settings
 */
export interface PerformanceOptimization {
  /** Bundle size limits */
  bundleSize: {
    max: number;
    warning: number;
  };
  
  /** Loading strategies */
  loading: {
    strategy: 'eager' | 'lazy' | 'progressive';
    priority: ('above-fold' | 'below-fold' | 'interactive')[];
  };
  
  /** Caching strategies */
  caching: {
    static: boolean;
    dynamic: boolean;
    ttl: number;
  };
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Content Security Policy */
  csp: boolean;
  
  /** XSS protection */
  xssProtection: boolean;
  
  /** Frame options */
  frameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  
  /** HTTPS enforcement */
  httpsOnly: boolean;
}

/**
 * Cross-platform compatibility settings
 */
export interface CompatibilityConfig {
  /** Browser support targets */
  browsers: string[];
  
  /** Mobile compatibility */
  mobile: {
    responsive: boolean;
    touchOptimized: boolean;
    gestureSupport: boolean;
  };
  
  /** Accessibility compliance */
  accessibility: {
    wcagLevel: 'A' | 'AA' | 'AAA';
    screenReader: boolean;
    keyboardNavigation: boolean;
  };
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class TemplateCustomizationService {
  private claudeService: VerifiedClaudeService;
  private config: TemplateCustomizationConfig;

  // Industry-specific color palettes
  private industryColorPalettes = {
    technology: {
      primary: ['#0066cc', '#1e40af', '#3b82f6', '#2563eb'],
      secondary: ['#64748b', '#475569', '#334155'],
      accent: ['#10b981', '#06b6d4', '#8b5cf6']
    },
    finance: {
      primary: ['#1e40af', '#1e3a8a', '#1d4ed8', '#2563eb'],
      secondary: ['#374151', '#4b5563', '#6b7280'],
      accent: ['#059669', '#0d9488', '#0891b2']
    },
    creative: {
      primary: ['#8b5cf6', '#a855f7', '#9333ea', '#7c3aed'],
      secondary: ['#ec4899', '#f43f5e', '#ef4444'],
      accent: ['#f59e0b', '#eab308', '#84cc16']
    },
    healthcare: {
      primary: ['#0891b2', '#0284c7', '#0369a1', '#075985'],
      secondary: ['#059669', '#047857', '#065f46'],
      accent: ['#dc2626', '#b91c1c', '#991b1b']
    },
    education: {
      primary: ['#059669', '#047857', '#065f46', '#064e3b'],
      secondary: ['#7c3aed', '#6d28d9', '#5b21b6'],
      accent: ['#ea580c', '#dc2626', '#c2410c']
    },
    consulting: {
      primary: ['#374151', '#4b5563', '#6b7280', '#9ca3af'],
      secondary: ['#1e40af', '#1e3a8a', '#1d4ed8'],
      accent: ['#059669', '#0d9488', '#0891b2']
    }
  };

  // Typography combinations by industry
  private industryTypography = {
    technology: {
      heading: 'Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      code: 'JetBrains Mono, Fira Code, monospace'
    },
    creative: {
      heading: 'Poppins, Montserrat, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      code: 'JetBrains Mono, monospace'
    },
    finance: {
      heading: 'Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      code: 'JetBrains Mono, monospace'
    },
    healthcare: {
      heading: 'Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      code: 'JetBrains Mono, monospace'
    },
    education: {
      heading: 'Merriweather, Georgia, serif',
      body: 'Inter, system-ui, sans-serif',
      code: 'JetBrains Mono, monospace'
    },
    consulting: {
      heading: 'Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      code: 'JetBrains Mono, monospace'
    }
  };

  constructor(config?: Partial<TemplateCustomizationConfig>) {
    this.config = {
      enableAIRecommendations: true,
      debugMode: false,
      maxProcessingTime: 30000,
      enableCaching: true,
      ...config
    };

    this.claudeService = new VerifiedClaudeService({
      service: 'template-customization',
      context: 'template-design-analysis',
      enableVerification: true,
      fallbackToOriginal: true,
      maxRetries: 3,
      confidenceThreshold: 0.7,
      qualityThreshold: 75,
      timeout: 30000
    });

    logger.info('[TEMPLATE-CUSTOMIZATION] Service initialized', {
      aiRecommendations: this.config.enableAIRecommendations,
      caching: this.config.enableCaching
    });
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Analyze CV content to determine optimal template and styling approach
   */
  async analyzeCV(cvData: ParsedCV): Promise<CVAnalysisResult> {
    logger.info('[TEMPLATE-CUSTOMIZATION] Starting CV analysis', {
      hasPersonalInfo: !!cvData.personalInfo,
      hasExperience: !!cvData.experience?.length,
      hasSkills: !!cvData.skills
    });

    try {
      const startTime = Date.now();

      // Extract content for analysis
      const contentForAnalysis = this.extractAnalysisContent(cvData);
      
      // Perform AI-powered analysis
      const analysisResult = await this.performAIAnalysis(contentForAnalysis, cvData);
      
      // Enhance with rule-based analysis
      const enhancedResult = this.enhanceWithRuleBasedAnalysis(analysisResult, cvData);

      const processingTime = Date.now() - startTime;
      logger.info('[TEMPLATE-CUSTOMIZATION] CV analysis completed', {
        industry: enhancedResult.industry,
        level: enhancedResult.level,
        confidence: enhancedResult.confidence,
        processingTimeMs: processingTime
      });

      return enhancedResult;
    } catch (error) {
      logger.error('[TEMPLATE-CUSTOMIZATION] CV analysis failed', error);
      throw new Error(`CV analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Select optimal template based on CV analysis and user preferences
   */
  async selectTemplate(
    cvData: ParsedCV, 
    preferences?: TemplatePreferences
  ): Promise<PortalTemplate> {
    logger.info('[TEMPLATE-CUSTOMIZATION] Starting template selection');

    try {
      // Analyze CV if analysis not provided
      const analysis = await this.analyzeCV(cvData);
      
      // Get base template for the recommended category
      const baseTemplate = this.getBaseTemplate(analysis.recommendedCategory);
      
      // Apply industry-specific customizations
      const customizedTemplate = await this.customizeTemplateForIndustry(
        baseTemplate, 
        analysis, 
        preferences
      );

      logger.info('[TEMPLATE-CUSTOMIZATION] Template selection completed', {
        selectedTemplate: customizedTemplate.id,
        category: customizedTemplate.category,
        confidence: analysis.confidence
      });

      return customizedTemplate;
    } catch (error) {
      logger.error('[TEMPLATE-CUSTOMIZATION] Template selection failed', error);
      throw new Error(`Template selection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate dynamic theme based on industry, personal brand, and preferences
   */
  async generateTheme(
    industry: string, 
    personalBrand?: any, 
    preferences?: TemplatePreferences
  ): Promise<GeneratedTheme> {
    logger.info('[TEMPLATE-CUSTOMIZATION] Starting theme generation', {
      industry,
      hasPersonalBrand: !!personalBrand,
      hasPreferences: !!preferences
    });

    try {
      // Generate base color scheme
      const colorScheme = this.generateIndustryColorScheme(industry, preferences);
      
      // Generate typography
      const typography = this.generateIndustryTypography(industry, preferences);
      
      // Generate responsive breakpoints
      const breakpoints = this.generateResponsiveBreakpoints();
      
      // Generate component variants
      const componentVariants = this.generateComponentVariants(colorScheme);
      
      // Generate animation presets
      const animations = this.generateAnimationPresets(industry);

      const theme: GeneratedTheme = {
        id: `${industry}-theme-${Date.now()}`,
        name: `${this.capitalizeFirst(industry)} Professional Theme`,
        colors: colorScheme,
        typography,
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
        },
        layout: {
          headerStyle: 'detailed',
          navigationStyle: 'horizontal',
          contentLayout: 'two-column'
        },
        animations,
        breakpoints,
        componentVariants,
        generationMetadata: {
          aiGenerated: this.config.enableAIRecommendations,
          industryAdapted: true,
          personalityAdapted: !!personalBrand,
          confidence: 0.9,
          generatedAt: new Date()
        }
      };

      logger.info('[TEMPLATE-CUSTOMIZATION] Theme generation completed', {
        themeId: theme.id,
        industry,
        primaryColor: colorScheme.primary
      });

      return theme;
    } catch (error) {
      logger.error('[TEMPLATE-CUSTOMIZATION] Theme generation failed', error);
      throw new Error(`Theme generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Customize layout based on template and CV content
   */
  async customizeLayout(
    template: PortalTemplate, 
    cvData: ParsedCV
  ): Promise<PortalTemplate> {
    logger.info('[TEMPLATE-CUSTOMIZATION] Starting layout customization');

    try {
      // Analyze content density and structure
      const contentAnalysis = this.analyzeContentStructure(cvData);
      
      // Determine optimal section ordering
      const sectionOrder = this.optimizeSectionOrder(contentAnalysis, template);
      
      // Configure responsive behavior
      const responsiveConfig = this.generateResponsiveConfig(contentAnalysis);
      
      // Apply layout optimizations
      const optimizedTemplate = {
        ...template,
        config: {
          ...template.config,
          sectionOrder,
          responsiveConfig,
          contentOptimization: {
            density: contentAnalysis.density,
            mobileFirst: true,
            accessibilityEnhanced: true
          }
        }
      };

      logger.info('[TEMPLATE-CUSTOMIZATION] Layout customization completed', {
        templateId: template.id,
        sectionCount: sectionOrder.length,
        optimizations: Object.keys(responsiveConfig)
      });

      return optimizedTemplate;
    } catch (error) {
      logger.error('[TEMPLATE-CUSTOMIZATION] Layout customization failed', error);
      throw new Error(`Layout customization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate responsive CSS for mobile-first design
   */
  async generateResponsiveCSS(
    theme: GeneratedTheme, 
    layout: any
  ): Promise<ResponsiveCSS> {
    logger.info('[TEMPLATE-CUSTOMIZATION] Starting responsive CSS generation');

    try {
      const css: ResponsiveCSS = {
        base: this.generateBaseCSS(theme),
        tablet: this.generateTabletCSS(theme),
        desktop: this.generateDesktopCSS(theme),
        highRes: this.generateHighResCSS(theme),
        darkMode: this.generateDarkModeCSS(theme),
        print: this.generatePrintCSS(theme),
        accessibility: this.generateAccessibilityCSS(theme)
      };

      logger.info('[TEMPLATE-CUSTOMIZATION] Responsive CSS generation completed', {
        totalCSSSize: Object.values(css).join('').length,
        variants: Object.keys(css)
      });

      return css;
    } catch (error) {
      logger.error('[TEMPLATE-CUSTOMIZATION] Responsive CSS generation failed', error);
      throw new Error(`Responsive CSS generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create component configuration based on CV sections
   */
  async createComponentConfig(sections: PortalSection[]): Promise<ComponentConfig> {
    logger.info('[TEMPLATE-CUSTOMIZATION] Creating component configuration', {
      sectionCount: sections.length
    });

    try {
      const sectionConfigs: Record<PortalSection, SectionConfig> = {} as any;
      
      // Configure each section
      sections.forEach((section, index) => {
        sectionConfigs[section] = {
          enabled: true,
          order: index,
          layout: this.getOptimalSectionLayout(section),
          animation: this.getOptimalSectionAnimation(section),
          customization: this.getSectionCustomization(section)
        };
      });

      const componentConfig: ComponentConfig = {
        sections: sectionConfigs,
        interactiveFeatures: {
          chat: {
            enabled: true,
            placement: 'fixed',
            style: 'bubble'
          },
          contactForm: {
            enabled: true,
            fields: ['name', 'email', 'message'],
            validation: 'both'
          },
          portfolio: {
            enabled: sections.includes(PortalSection.PROJECTS),
            layout: 'grid',
            filtering: true
          },
          downloadCenter: {
            enabled: true,
            formats: ['pdf', 'docx'],
            tracking: true
          }
        },
        performance: {
          lazyLoading: true,
          imageOptimization: true,
          codeMinification: true,
          caching: {
            enabled: true,
            strategy: 'hybrid',
            ttl: 3600
          }
        },
        seo: {
          metaTags: true,
          structuredData: true,
          openGraph: true,
          twitterCards: true,
          sitemap: true
        }
      };

      logger.info('[TEMPLATE-CUSTOMIZATION] Component configuration created', {
        enabledSections: Object.values(sectionConfigs).filter(s => s.enabled).length,
        interactiveFeatures: Object.keys(componentConfig.interactiveFeatures)
      });

      return componentConfig;
    } catch (error) {
      logger.error('[TEMPLATE-CUSTOMIZATION] Component configuration creation failed', error);
      throw new Error(`Component configuration creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Optimize template for specific deployment platforms
   */
  async optimizeForDeployment(
    template: PortalTemplate, 
    platform: string
  ): Promise<PortalTemplate> {
    logger.info('[TEMPLATE-CUSTOMIZATION] Optimizing for deployment platform', {
      platform,
      templateId: template.id
    });

    try {
      // Platform-specific optimizations
      const optimization = this.getPlatformOptimization(platform);
      
      // Apply optimization to template
      const optimizedTemplate = {
        ...template,
        config: {
          ...template.config,
          platformOptimization: optimization,
          deployment: {
            platform,
            optimizedAt: new Date(),
            version: '1.0'
          }
        }
      };

      logger.info('[TEMPLATE-CUSTOMIZATION] Deployment optimization completed', {
        platform,
        optimizations: Object.keys(optimization)
      });

      return optimizedTemplate;
    } catch (error) {
      logger.error('[TEMPLATE-CUSTOMIZATION] Deployment optimization failed', error);
      throw new Error(`Deployment optimization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private extractAnalysisContent(cvData: ParsedCV): string {
    const contentParts = [];
    
    if (cvData.summary) contentParts.push(`Summary: ${cvData.summary}`);
    
    if (cvData.experience) {
      const experienceText = cvData.experience.map(exp => 
        `${exp.position} at ${exp.company}: ${exp.description || ''}`
      ).join('. ');
      contentParts.push(`Experience: ${experienceText}`);
    }
    
    if (cvData.skills) {
      const skillsText = Array.isArray(cvData.skills) 
        ? cvData.skills.join(', ')
        : Object.values(cvData.skills).flat().join(', ');
      contentParts.push(`Skills: ${skillsText}`);
    }
    
    if (cvData.education) {
      const educationText = cvData.education.map(edu => 
        `${edu.degree} from ${edu.institution}`
      ).join('. ');
      contentParts.push(`Education: ${educationText}`);
    }

    return contentParts.join('\n\n');
  }

  private async performAIAnalysis(content: string, cvData: ParsedCV): Promise<CVAnalysisResult> {
    if (!this.config.enableAIRecommendations) {
      return this.createFallbackAnalysis(cvData);
    }

    try {
      const prompt = `Analyze this professional CV content and provide insights for template customization:

${content}

Please analyze and provide:
1. Primary industry/field (technology, finance, creative, healthcare, education, consulting, etc.)
2. Professional level (entry_level, junior, mid_level, senior, lead, executive, c_level)
3. Key focus areas (3-5 main areas of expertise)
4. Personality traits based on content (creative, analytical, leadership, innovative, etc.)
5. Content analysis (technical vs soft skills ratio, achievement count, international experience)
6. Recommended template category
7. Confidence score (0-1)

Format as JSON with these exact keys: industry, level, focusAreas, personalityTraits, contentAnalysis, recommendedCategory, confidence`;

      const response = await this.claudeService.createVerifiedMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.3,
        system: 'You are an expert CV analyzer and design consultant. Analyze professional profiles to recommend optimal template designs.',
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const analysisData = this.parseAIAnalysisResponse(response.content[0].text);
      return this.validateAndEnhanceAnalysis(analysisData, cvData);
    } catch (error) {
      logger.warn('[TEMPLATE-CUSTOMIZATION] AI analysis failed, using fallback', error);
      return this.createFallbackAnalysis(cvData);
    }
  }

  private parseAIAnalysisResponse(response: string): Partial<CVAnalysisResult> {
    try {
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      return JSON.parse(cleanResponse);
    } catch (error) {
      logger.warn('[TEMPLATE-CUSTOMIZATION] Failed to parse AI response, using defaults');
      return {};
    }
  }

  private validateAndEnhanceAnalysis(
    analysisData: Partial<CVAnalysisResult>, 
    cvData: ParsedCV
  ): CVAnalysisResult {
    return {
      industry: analysisData.industry || this.detectIndustryFromSkills(cvData),
      level: analysisData.level || this.assessProfessionalLevel(cvData),
      focusAreas: analysisData.focusAreas || this.extractFocusAreas(cvData),
      personalityTraits: analysisData.personalityTraits || this.inferPersonalityTraits(cvData),
      contentAnalysis: analysisData.contentAnalysis || this.analyzeContent(cvData),
      recommendedCategory: analysisData.recommendedCategory || this.recommendTemplateCategory(cvData),
      confidence: analysisData.confidence || 0.7
    };
  }

  private createFallbackAnalysis(cvData: ParsedCV): CVAnalysisResult {
    return {
      industry: this.detectIndustryFromSkills(cvData),
      level: this.assessProfessionalLevel(cvData),
      focusAreas: this.extractFocusAreas(cvData),
      personalityTraits: this.inferPersonalityTraits(cvData),
      contentAnalysis: this.analyzeContent(cvData),
      recommendedCategory: this.recommendTemplateCategory(cvData),
      confidence: 0.6
    };
  }

  private detectIndustryFromSkills(cvData: ParsedCV): string {
    const skills = Array.isArray(cvData.skills) 
      ? cvData.skills 
      : Object.values(cvData.skills || {}).flat();
    
    const skillsText = skills.join(' ').toLowerCase();
    
    if (skillsText.includes('javascript') || skillsText.includes('python') || skillsText.includes('react')) {
      return 'technology';
    } else if (skillsText.includes('finance') || skillsText.includes('accounting') || skillsText.includes('investment')) {
      return 'finance';
    } else if (skillsText.includes('design') || skillsText.includes('creative') || skillsText.includes('art')) {
      return 'creative';
    } else if (skillsText.includes('healthcare') || skillsText.includes('medical') || skillsText.includes('nursing')) {
      return 'healthcare';
    } else if (skillsText.includes('education') || skillsText.includes('teaching') || skillsText.includes('research')) {
      return 'education';
    } else {
      return 'consulting';
    }
  }

  private assessProfessionalLevel(cvData: ParsedCV): ProfessionalLevel {
    const experienceYears = cvData.experience?.length || 0;
    const hasLeadershipKeywords = this.hasLeadershipIndicators(cvData);
    
    if (experienceYears >= 15 || hasLeadershipKeywords) return ProfessionalLevel.EXECUTIVE;
    if (experienceYears >= 10) return ProfessionalLevel.SENIOR;
    if (experienceYears >= 5) return ProfessionalLevel.MID_LEVEL;
    if (experienceYears >= 2) return ProfessionalLevel.JUNIOR;
    return ProfessionalLevel.ENTRY_LEVEL;
  }

  private hasLeadershipIndicators(cvData: ParsedCV): boolean {
    const content = JSON.stringify(cvData).toLowerCase();
    const leadershipKeywords = ['director', 'manager', 'lead', 'head', 'chief', 'vp', 'ceo', 'cto', 'cfo'];
    return leadershipKeywords.some(keyword => content.includes(keyword));
  }

  private extractFocusAreas(cvData: ParsedCV): string[] {
    const areas = [];
    
    if (cvData.skills) {
      const skills = Array.isArray(cvData.skills) ? cvData.skills : Object.values(cvData.skills).flat();
      areas.push(...skills.slice(0, 3));
    }
    
    if (cvData.experience?.length) {
      areas.push(cvData.experience[0].position);
    }
    
    return areas.slice(0, 5);
  }

  private inferPersonalityTraits(cvData: ParsedCV): PersonalityTrait[] {
    const traits: PersonalityTrait[] = [];
    const content = JSON.stringify(cvData).toLowerCase();
    
    if (content.includes('design') || content.includes('creative')) {
      traits.push(PersonalityTrait.CREATIVE);
    }
    
    if (content.includes('data') || content.includes('analysis')) {
      traits.push(PersonalityTrait.ANALYTICAL);
    }
    
    if (content.includes('lead') || content.includes('manage')) {
      traits.push(PersonalityTrait.LEADERSHIP);
    }
    
    if (content.includes('innovation') || content.includes('startup')) {
      traits.push(PersonalityTrait.INNOVATIVE);
    }
    
    return traits;
  }

  private analyzeContent(cvData: ParsedCV): ContentAnalysis {
    const content = JSON.stringify(cvData);
    
    return {
      wordCount: content.split(' ').length,
      technicalSkills: this.extractTechnicalSkills(cvData),
      softSkills: this.extractSoftSkills(cvData),
      industries: [this.detectIndustryFromSkills(cvData)],
      companyTypes: this.detectCompanyTypes(cvData),
      sectionDensity: this.calculateSectionDensity(cvData),
      achievementCount: this.countAchievements(cvData),
      internationalExperience: this.hasInternationalExperience(cvData)
    };
  }

  private extractTechnicalSkills(cvData: ParsedCV): string[] {
    const skills = Array.isArray(cvData.skills) 
      ? cvData.skills 
      : cvData.skills?.technical || [];
    
    return skills.filter(skill => 
      typeof skill === 'string' && 
      /^[A-Z]/.test(skill) // Likely technical if capitalized
    ).slice(0, 10);
  }

  private extractSoftSkills(cvData: ParsedCV): string[] {
    const skills = Array.isArray(cvData.skills) 
      ? [] 
      : cvData.skills?.soft || [];
    
    return skills.slice(0, 5);
  }

  private detectCompanyTypes(cvData: ParsedCV): CompanyType[] {
    const types: CompanyType[] = [];
    const content = JSON.stringify(cvData).toLowerCase();
    
    if (content.includes('startup')) types.push(CompanyType.STARTUP);
    if (content.includes('enterprise')) types.push(CompanyType.ENTERPRISE);
    if (content.includes('consulting')) types.push(CompanyType.CONSULTING);
    if (content.includes('freelance')) types.push(CompanyType.FREELANCE);
    
    return types;
  }

  private calculateSectionDensity(cvData: ParsedCV): Record<string, number> {
    return {
      experience: cvData.experience?.length || 0,
      education: cvData.education?.length || 0,
      skills: Array.isArray(cvData.skills) ? cvData.skills.length : Object.keys(cvData.skills || {}).length,
      projects: cvData.projects?.length || 0
    };
  }

  private countAchievements(cvData: ParsedCV): number {
    const content = JSON.stringify(cvData).toLowerCase();
    const achievementKeywords = ['awarded', 'achieved', 'won', 'recognized', 'increased', 'improved'];
    return achievementKeywords.filter(keyword => content.includes(keyword)).length;
  }

  private hasInternationalExperience(cvData: ParsedCV): boolean {
    const content = JSON.stringify(cvData).toLowerCase();
    const internationalKeywords = ['international', 'global', 'remote', 'worldwide'];
    return internationalKeywords.some(keyword => content.includes(keyword));
  }

  private recommendTemplateCategory(cvData: ParsedCV): PortalTemplateCategory {
    const industry = this.detectIndustryFromSkills(cvData);
    const level = this.assessProfessionalLevel(cvData);
    
    if (industry === 'technology') return PortalTemplateCategory.TECHNICAL;
    if (industry === 'creative') return PortalTemplateCategory.CREATIVE;
    if (level === ProfessionalLevel.EXECUTIVE) return PortalTemplateCategory.BUSINESS;
    if (industry === 'education') return PortalTemplateCategory.ACADEMIC;
    if (industry === 'consulting') return PortalTemplateCategory.PROFESSIONAL;
    
    return PortalTemplateCategory.PROFESSIONAL;
  }

  private enhanceWithRuleBasedAnalysis(
    aiResult: CVAnalysisResult, 
    cvData: ParsedCV
  ): CVAnalysisResult {
    // Apply rule-based validation and enhancement
    const ruleBasedIndustry = this.detectIndustryFromSkills(cvData);
    const ruleBasedLevel = this.assessProfessionalLevel(cvData);
    
    // If AI and rule-based results differ significantly, blend them
    if (aiResult.industry !== ruleBasedIndustry) {
      aiResult.confidence *= 0.8; // Reduce confidence for conflicting results
    }
    
    return {
      ...aiResult,
      // Enhance with rule-based validation
      contentAnalysis: {
        ...aiResult.contentAnalysis,
        ...this.analyzeContent(cvData)
      }
    };
  }

  private getBaseTemplate(category: PortalTemplateCategory): PortalTemplate {
    const templates = {
      [PortalTemplateCategory.PROFESSIONAL]: {
        id: 'corporate-professional',
        name: 'Corporate Professional',
        description: 'Clean, conservative design perfect for business professionals',
        category: PortalTemplateCategory.PROFESSIONAL,
        version: '1.0',
        isPremium: false,
        theme: this.createBaseTheme('corporate'),
        config: this.createBaseTemplateConfig(),
        requiredSections: [PortalSection.HERO, PortalSection.ABOUT, PortalSection.EXPERIENCE, PortalSection.SKILLS, PortalSection.CONTACT],
        optionalSections: [PortalSection.EDUCATION, PortalSection.PROJECTS, PortalSection.CHAT]
      },
      [PortalTemplateCategory.CREATIVE]: {
        id: 'creative-portfolio',
        name: 'Creative Portfolio',
        description: 'Visual-focused design for creative professionals and artists',
        category: PortalTemplateCategory.CREATIVE,
        version: '1.0',
        isPremium: false,
        theme: this.createBaseTheme('creative'),
        config: this.createBaseTemplateConfig(),
        requiredSections: [PortalSection.HERO, PortalSection.ABOUT, PortalSection.PROJECTS, PortalSection.SKILLS, PortalSection.CONTACT],
        optionalSections: [PortalSection.EXPERIENCE, PortalSection.EDUCATION, PortalSection.CHAT]
      },
      [PortalTemplateCategory.TECHNICAL]: {
        id: 'technical-expert',
        name: 'Technical Expert',
        description: 'Developer-focused design with technical project showcases',
        category: PortalTemplateCategory.TECHNICAL,
        version: '1.0',
        isPremium: false,
        theme: this.createBaseTheme('technical'),
        config: this.createBaseTemplateConfig(),
        requiredSections: [PortalSection.HERO, PortalSection.ABOUT, PortalSection.EXPERIENCE, PortalSection.SKILLS, PortalSection.PROJECTS, PortalSection.CONTACT],
        optionalSections: [PortalSection.EDUCATION, PortalSection.CHAT, PortalSection.SIDEBAR]
      },
      [PortalTemplateCategory.BUSINESS]: {
        id: 'executive-leadership',
        name: 'Executive Leadership',
        description: 'High-level, authoritative design for senior executives',
        category: PortalTemplateCategory.BUSINESS,
        version: '1.0',
        isPremium: true,
        theme: this.createBaseTheme('executive'),
        config: this.createBaseTemplateConfig(),
        requiredSections: [PortalSection.HERO, PortalSection.ABOUT, PortalSection.EXPERIENCE, PortalSection.PROJECTS, PortalSection.CONTACT],
        optionalSections: [PortalSection.SKILLS, PortalSection.EDUCATION, PortalSection.CHAT]
      },
      [PortalTemplateCategory.ACADEMIC]: {
        id: 'academic-research',
        name: 'Academic Research',
        description: 'Research-focused design for academics and researchers',
        category: PortalTemplateCategory.ACADEMIC,
        version: '1.0',
        isPremium: false,
        theme: this.createBaseTheme('academic'),
        config: this.createBaseTemplateConfig(),
        requiredSections: [PortalSection.HERO, PortalSection.ABOUT, PortalSection.EDUCATION, PortalSection.PROJECTS, PortalSection.CONTACT],
        optionalSections: [PortalSection.EXPERIENCE, PortalSection.SKILLS, PortalSection.CHAT]
      }
    };
    
    return templates[category] || templates[PortalTemplateCategory.PROFESSIONAL];
  }

  private createBaseTheme(type: string): PortalTheme {
    const colorScheme = this.industryColorPalettes[type as keyof typeof this.industryColorPalettes] 
      || this.industryColorPalettes.consulting;
    
    const typography = this.industryTypography[type as keyof typeof this.industryTypography] 
      || this.industryTypography.consulting;

    return {
      id: `${type}-theme`,
      name: `${this.capitalizeFirst(type)} Theme`,
      colors: {
        primary: colorScheme.primary[0],
        secondary: colorScheme.secondary[0],
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
          heading: typography.heading,
          body: typography.body,
          mono: typography.code || 'ui-monospace, SFMono-Regular, monospace'
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
    };
  }

  private createBaseTemplateConfig(): any {
    return {
      supportedLanguages: ['en'],
      defaultLanguage: 'en',
      mobileOptimization: 'enhanced' as const,
      seo: {
        metaTags: {},
        openGraph: {},
        schema: {},
        sitemap: true,
        robotsTxt: {}
      },
      performance: {},
      accessibility: {}
    };
  }

  private async customizeTemplateForIndustry(
    template: PortalTemplate,
    analysis: CVAnalysisResult,
    preferences?: TemplatePreferences
  ): Promise<PortalTemplate> {
    // Apply industry-specific customizations
    const industryTheme = await this.generateTheme(analysis.industry, null, preferences);
    
    return {
      ...template,
      theme: industryTheme,
      config: {
        ...template.config
        // Industry optimization applied via theme
      }
    };
  }

  private generateIndustryColorScheme(
    industry: string, 
    preferences?: TemplatePreferences
  ): ColorScheme {
    const palette = this.industryColorPalettes[industry as keyof typeof this.industryColorPalettes] 
      || this.industryColorPalettes.consulting;
    
    // Apply user preferences if provided
    let primaryColor = palette.primary[0];
    if (preferences?.colorPreferences?.preferredColors?.length) {
      primaryColor = preferences.colorPreferences.preferredColors[0];
    }

    return {
      primary: primaryColor,
      secondary: palette.secondary[0],
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
      },
      gradients: {
        primary: `linear-gradient(135deg, ${primaryColor}, ${palette.secondary[0]})`,
        secondary: `linear-gradient(45deg, ${palette.secondary[0]}, ${palette.accent[0]})`,
        hero: `linear-gradient(135deg, ${primaryColor}20, ${palette.secondary[0]}20)`
      }
    };
  }

  private generateIndustryTypography(
    industry: string, 
    preferences?: TemplatePreferences
  ): TypographyConfig {
    const typography = this.industryTypography[industry as keyof typeof this.industryTypography] 
      || this.industryTypography.consulting;

    return {
      fontFamilies: {
        heading: typography.heading,
        body: typography.body,
        mono: typography.code || 'ui-monospace, SFMono-Regular, monospace'
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
    };
  }

  private generateResponsiveBreakpoints(): ResponsiveBreakpoints {
    return {
      mobile: '320px',
      tablet: '768px',
      desktop: '1024px',
      wide: '1440px',
      ultrawide: '1920px'
    };
  }

  private generateComponentVariants(colorScheme: ColorScheme): ComponentVariants {
    return {
      buttons: {
        primary: {
          base: `bg-[${colorScheme.primary}] text-white px-6 py-3 rounded-lg font-medium transition-all duration-200`,
          hover: `hover:bg-[${colorScheme.primary}]/90 hover:shadow-lg`,
          active: `active:bg-[${colorScheme.primary}]/80 active:scale-95`,
          disabled: `disabled:bg-gray-300 disabled:cursor-not-allowed`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/50`
        },
        secondary: {
          base: `bg-[${colorScheme.secondary}] text-white px-6 py-3 rounded-lg font-medium transition-all duration-200`,
          hover: `hover:bg-[${colorScheme.secondary}]/90`,
          active: `active:bg-[${colorScheme.secondary}]/80`,
          disabled: `disabled:bg-gray-300 disabled:cursor-not-allowed`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.secondary}]/50`
        },
        accent: {
          base: `bg-gradient-to-r ${colorScheme.gradients?.primary} text-white px-6 py-3 rounded-lg font-medium transition-all duration-200`,
          hover: `hover:shadow-lg hover:scale-105`,
          active: `active:scale-95`,
          disabled: `disabled:opacity-50 disabled:cursor-not-allowed`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/50`
        },
        ghost: {
          base: `text-[${colorScheme.primary}] border border-[${colorScheme.primary}] px-6 py-3 rounded-lg font-medium transition-all duration-200`,
          hover: `hover:bg-[${colorScheme.primary}]/10`,
          active: `active:bg-[${colorScheme.primary}]/20`,
          disabled: `disabled:opacity-50 disabled:cursor-not-allowed`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/50`
        }
      },
      cards: {
        default: {
          base: `bg-white rounded-xl border border-[${colorScheme.border.primary}] p-6 transition-all duration-200`,
          hover: `hover:shadow-lg hover:-translate-y-1`,
          active: `active:scale-98`,
          disabled: `opacity-50`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/20`
        },
        elevated: {
          base: `bg-white rounded-xl shadow-lg p-6 transition-all duration-200`,
          hover: `hover:shadow-xl hover:-translate-y-2`,
          active: `active:scale-98`,
          disabled: `opacity-50`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/20`
        },
        outlined: {
          base: `bg-transparent rounded-xl border-2 border-[${colorScheme.primary}] p-6 transition-all duration-200`,
          hover: `hover:bg-[${colorScheme.primary}]/5`,
          active: `active:bg-[${colorScheme.primary}]/10`,
          disabled: `opacity-50`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/20`
        },
        transparent: {
          base: `bg-transparent p-6 transition-all duration-200`,
          hover: `hover:bg-gray-50`,
          active: `active:bg-gray-100`,
          disabled: `opacity-50`,
          focus: `focus:outline-none`
        }
      },
      navigation: {
        header: {
          base: `bg-white/95 backdrop-blur-sm border-b border-[${colorScheme.border.primary}] sticky top-0 z-50`,
          hover: ``,
          active: ``,
          disabled: ``,
          focus: ``
        },
        sidebar: {
          base: `bg-white border-r border-[${colorScheme.border.primary}] h-full`,
          hover: ``,
          active: ``,
          disabled: ``,
          focus: ``
        },
        footer: {
          base: `bg-gray-50 border-t border-[${colorScheme.border.primary}] mt-auto`,
          hover: ``,
          active: ``,
          disabled: ``,
          focus: ``
        },
        mobile: {
          base: `bg-white/95 backdrop-blur-sm border-b border-[${colorScheme.border.primary}]`,
          hover: ``,
          active: ``,
          disabled: ``,
          focus: ``
        }
      },
      forms: {
        input: {
          base: `w-full px-4 py-3 border border-[${colorScheme.border.primary}] rounded-lg transition-all duration-200`,
          hover: `hover:border-[${colorScheme.primary}]/50`,
          active: ``,
          disabled: `disabled:bg-gray-50 disabled:cursor-not-allowed`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/20 focus:border-[${colorScheme.primary}]`
        },
        textarea: {
          base: `w-full px-4 py-3 border border-[${colorScheme.border.primary}] rounded-lg resize-vertical transition-all duration-200`,
          hover: `hover:border-[${colorScheme.primary}]/50`,
          active: ``,
          disabled: `disabled:bg-gray-50 disabled:cursor-not-allowed`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/20 focus:border-[${colorScheme.primary}]`
        },
        select: {
          base: `w-full px-4 py-3 border border-[${colorScheme.border.primary}] rounded-lg appearance-none transition-all duration-200`,
          hover: `hover:border-[${colorScheme.primary}]/50`,
          active: ``,
          disabled: `disabled:bg-gray-50 disabled:cursor-not-allowed`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/20 focus:border-[${colorScheme.primary}]`
        },
        checkbox: {
          base: `w-4 h-4 text-[${colorScheme.primary}] border border-[${colorScheme.border.primary}] rounded transition-all duration-200`,
          hover: `hover:border-[${colorScheme.primary}]/50`,
          active: ``,
          disabled: `disabled:opacity-50 disabled:cursor-not-allowed`,
          focus: `focus:outline-none focus:ring-2 focus:ring-[${colorScheme.primary}]/20`
        }
      }
    };
  }

  private generateAnimationPresets(industry: string): AnimationPresets {
    const baseAnimations = {
      pageTransitions: 'transition-all duration-300 ease-in-out',
      buttonHover: 'transition-all duration-200 ease-in-out hover:scale-105',
      cardHover: 'transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1',
      textReveal: 'opacity-0 translate-y-4 transition-all duration-500 ease-out',
      fadeIn: 'opacity-0 transition-opacity duration-500 ease-in-out',
      slideIn: 'translate-x-full transition-transform duration-500 ease-in-out'
    };

    // Industry-specific animation adjustments
    if (industry === 'creative') {
      return {
        ...baseAnimations,
        buttonHover: 'transition-all duration-300 ease-in-out hover:scale-110 hover:rotate-1',
        cardHover: 'transition-all duration-400 ease-in-out hover:shadow-2xl hover:-translate-y-2 hover:rotate-1'
      };
    }

    if (industry === 'technology') {
      return {
        ...baseAnimations,
        pageTransitions: 'transition-all duration-200 ease-in-out',
        buttonHover: 'transition-all duration-150 ease-in-out hover:scale-102'
      };
    }

    return baseAnimations;
  }

  private analyzeContentStructure(cvData: ParsedCV): any {
    const sections = Object.keys(cvData).filter(key => cvData[key as keyof ParsedCV]);
    const totalContent = JSON.stringify(cvData).length;
    
    return {
      sectionCount: sections.length,
      totalContentLength: totalContent,
      density: totalContent > 5000 ? 'high' : totalContent > 2000 ? 'medium' : 'low',
      hasPortfolio: !!cvData.projects?.length || !!cvData.customSections?.portfolio,
      hasTestimonials: !!cvData.references?.length,
      primarySections: sections
    };
  }

  private optimizeSectionOrder(contentAnalysis: any, template: PortalTemplate): PortalSection[] {
    const baseOrder = template.requiredSections;
    const optionalSections = template.optionalSections;
    
    // Customize order based on content analysis
    const optimizedOrder = [...baseOrder];
    
    if (contentAnalysis.hasPortfolio && !optimizedOrder.includes(PortalSection.PROJECTS)) {
      optimizedOrder.splice(3, 0, PortalSection.PROJECTS); // Add after ABOUT
    }
    
    if (contentAnalysis.hasTestimonials && !optimizedOrder.includes(PortalSection.CHAT)) {
      optimizedOrder.push(PortalSection.CHAT);
    }
    
    // Add chat section if not present
    if (!optimizedOrder.includes(PortalSection.CHAT)) {
      optimizedOrder.push(PortalSection.CHAT);
    }
    
    return optimizedOrder;
  }

  private generateResponsiveConfig(contentAnalysis: any): any {
    return {
      mobile: {
        sectionSpacing: contentAnalysis.density === 'high' ? 'compact' : 'normal',
        cardLayout: 'single-column',
        navigationStyle: 'hamburger'
      },
      tablet: {
        sectionSpacing: 'normal',
        cardLayout: 'two-column',
        navigationStyle: 'horizontal'
      },
      desktop: {
        sectionSpacing: 'spacious',
        cardLayout: contentAnalysis.density === 'high' ? 'three-column' : 'two-column',
        navigationStyle: 'horizontal'
      }
    };
  }

  private generateBaseCSS(theme: GeneratedTheme): string {
    return `
/* Base Mobile-First Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: ${theme.typography.fontFamilies.body};
  font-size: ${theme.typography.fontSizes.base};
  line-height: ${theme.typography.lineHeights.normal};
  color: ${theme.colors.text.primary};
  background-color: ${theme.colors.background};
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: ${theme.typography.fontFamilies.heading};
  font-weight: ${theme.typography.fontWeights.semibold};
  line-height: ${theme.typography.lineHeights.tight};
  margin-bottom: 0.5em;
}

h1 { font-size: ${theme.typography.fontSizes['4xl']}; }
h2 { font-size: ${theme.typography.fontSizes['3xl']}; }
h3 { font-size: ${theme.typography.fontSizes['2xl']}; }
h4 { font-size: ${theme.typography.fontSizes.xl}; }
h5 { font-size: ${theme.typography.fontSizes.lg}; }
h6 { font-size: ${theme.typography.fontSizes.base}; }

p {
  margin-bottom: 1em;
  line-height: ${theme.typography.lineHeights.relaxed};
}

/* Layout */
.container {
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

.section {
  padding: 2rem 0;
}

/* Components */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: ${theme.typography.fontWeights.medium};
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-primary {
  background-color: ${theme.colors.primary};
  color: white;
}

.btn-primary:hover {
  background-color: ${theme.colors.primary}dd;
  transform: translateY(-1px);
}

.card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid ${theme.colors.border.primary};
  transition: all 0.3s ease-in-out;
}

.card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* Utilities */
.text-primary { color: ${theme.colors.primary}; }
.text-secondary { color: ${theme.colors.secondary}; }
.text-muted { color: ${theme.colors.text.muted}; }
.bg-primary { background-color: ${theme.colors.primary}; }
.border-primary { border-color: ${theme.colors.border.primary}; }

/* Accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus styles */
*:focus {
  outline: 2px solid ${theme.colors.primary};
  outline-offset: 2px;
}

/* Animation utilities */
.fade-in {
  opacity: 0;
  animation: fadeIn 0.5s ease-in forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

.slide-up {
  transform: translateY(20px);
  opacity: 0;
  animation: slideUp 0.6s ease-out forwards;
}

@keyframes slideUp {
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
`;
  }

  private generateTabletCSS(theme: GeneratedTheme): string {
    return `
/* Tablet Styles (768px and up) */
@media (min-width: ${theme.breakpoints.tablet}) {
  .container {
    max-width: 768px;
    padding: 2rem;
  }
  
  .section {
    padding: 3rem 0;
  }
  
  h1 { font-size: ${theme.typography.fontSizes['4xl']}; }
  h2 { font-size: ${theme.typography.fontSizes['3xl']}; }
  
  .grid-tablet-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }
  
  .card {
    padding: 2rem;
  }
}
`;
  }

  private generateDesktopCSS(theme: GeneratedTheme): string {
    return `
/* Desktop Styles (1024px and up) */
@media (min-width: ${theme.breakpoints.desktop}) {
  .container {
    max-width: 1024px;
    padding: 3rem;
  }
  
  .section {
    padding: 4rem 0;
  }
  
  .grid-desktop-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  
  .grid-desktop-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }
  
  .hero {
    min-height: 60vh;
    display: flex;
    align-items: center;
  }
}
`;
  }

  private generateHighResCSS(theme: GeneratedTheme): string {
    return `
/* High Resolution Styles (1440px and up) */
@media (min-width: ${theme.breakpoints.wide}) {
  .container {
    max-width: 1200px;
  }
  
  .section {
    padding: 5rem 0;
  }
  
  h1 { font-size: calc(${theme.typography.fontSizes['4xl']} * 1.2); }
}
`;
  }

  private generateDarkModeCSS(theme: GeneratedTheme): string {
    return `
/* Dark Mode Styles */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #e5e5e5;
  }
  
  .card {
    background-color: #2d2d2d;
    border-color: #404040;
  }
  
  .text-muted {
    color: #a3a3a3;
  }
}

[data-theme="dark"] {
  background-color: #1a1a1a;
  color: #e5e5e5;
}

[data-theme="dark"] .card {
  background-color: #2d2d2d;
  border-color: #404040;
}
`;
  }

  private generatePrintCSS(theme: GeneratedTheme): string {
    return `
/* Print Styles */
@media print {
  * {
    color: black !important;
    background: white !important;
  }
  
  .no-print {
    display: none !important;
  }
  
  .container {
    max-width: none;
    padding: 0;
  }
  
  .section {
    break-inside: avoid;
  }
  
  .card {
    border: 1px solid #ccc;
    box-shadow: none;
    transform: none;
  }
}
`;
  }

  private generateAccessibilityCSS(theme: GeneratedTheme): string {
    return `
/* Accessibility Enhancements */

/* High contrast mode */
@media (prefers-contrast: high) {
  .btn {
    border: 2px solid;
  }
  
  .card {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus management */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: ${theme.colors.primary};
  color: white;
  padding: 8px;
  text-decoration: none;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 6px;
}

/* Screen reader helpers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Keyboard navigation */
.btn:focus,
.card:focus,
input:focus,
textarea:focus,
select:focus {
  outline: 3px solid ${theme.colors.primary};
  outline-offset: 2px;
}

/* Touch targets */
@media (hover: none) and (pointer: coarse) {
  .btn {
    min-height: 44px;
    min-width: 44px;
  }
}
`;
  }

  private getOptimalSectionLayout(section: PortalSection): 'default' | 'compact' | 'expanded' | 'sidebar' {
    const layoutMap = {
      [PortalSection.HERO]: 'expanded' as const,
      [PortalSection.ABOUT]: 'default' as const,
      [PortalSection.EXPERIENCE]: 'default' as const,
      [PortalSection.SKILLS]: 'compact' as const,
      [PortalSection.PROJECTS]: 'expanded' as const,
      [PortalSection.CONTACT]: 'compact' as const,
      [PortalSection.CHAT]: 'sidebar' as const
    };
    
    return layoutMap[section] || 'default';
  }

  private getOptimalSectionAnimation(section: PortalSection): 'none' | 'fade' | 'slide' | 'scale' {
    const animationMap = {
      [PortalSection.HERO]: 'fade' as const,
      [PortalSection.ABOUT]: 'slide' as const,
      [PortalSection.EXPERIENCE]: 'fade' as const,
      [PortalSection.SKILLS]: 'scale' as const,
      [PortalSection.PROJECTS]: 'slide' as const,
      [PortalSection.CONTACT]: 'fade' as const,
      [PortalSection.CHAT]: 'slide' as const
    };
    
    return animationMap[section] || 'fade';
  }

  private getSectionCustomization(section: PortalSection): Record<string, any> {
    return {
      [PortalSection.HERO]: {
        fullHeight: true,
        backgroundType: 'gradient',
        textAlign: 'center'
      },
      [PortalSection.SKILLS]: {
        displayType: 'grid',
        showProgress: true,
        groupByCategory: true
      },
      [PortalSection.PROJECTS]: {
        layoutType: 'masonry',
        enableLightbox: true,
        showCategories: true
      }
    }[section] || {};
  }

  private getPlatformOptimization(platform: string): PlatformOptimization {
    const baseOptimization: PlatformOptimization = {
      platforms: [platform],
      optimizations: {
        ['gradio']: {
          framework: {
            interfaceType: 'blocks',
            theme: 'default',
            cssOptimization: true
          },
          assets: {
            images: { format: 'webp', quality: 85, lazy: true },
            fonts: { strategy: 'link', preload: true, display: 'swap' },
            css: { minify: true, inline: false, critical: true },
            javascript: { minify: true, bundle: true, defer: true }
          },
          performance: {
            bundleSize: { max: 2048, warning: 1024 },
            loading: { strategy: 'progressive', priority: ['above-fold', 'interactive', 'below-fold'] },
            caching: { static: true, dynamic: false, ttl: 3600 }
          },
          security: {
            csp: true,
            xssProtection: true,
            frameOptions: 'SAMEORIGIN',
            httpsOnly: true
          }
        },
        ['streamlit']: {
          framework: {
            layout: 'wide',
            sidebar: true,
            theme: 'light'
          },
          assets: {
            images: { format: 'webp', quality: 80, lazy: true },
            fonts: { strategy: 'system', preload: false, display: 'swap' },
            css: { minify: true, inline: true, critical: false },
            javascript: { minify: true, bundle: false, defer: false }
          },
          performance: {
            bundleSize: { max: 1024, warning: 512 },
            loading: { strategy: 'eager', priority: ['above-fold'] },
            caching: { static: true, dynamic: true, ttl: 1800 }
          },
          security: {
            csp: false,
            xssProtection: true,
            frameOptions: 'SAMEORIGIN',
            httpsOnly: true
          }
        },
        ['docker']: {
          framework: {
            containerized: true,
            port: 7860,
            healthCheck: true
          },
          assets: {
            images: { format: 'auto', quality: 90, lazy: false },
            fonts: { strategy: 'embed', preload: true, display: 'block' },
            css: { minify: true, inline: false, critical: true },
            javascript: { minify: true, bundle: true, defer: false }
          },
          performance: {
            bundleSize: { max: 5120, warning: 2048 },
            loading: { strategy: 'eager', priority: ['above-fold', 'below-fold', 'interactive'] },
            caching: { static: true, dynamic: true, ttl: 7200 }
          },
          security: {
            csp: true,
            xssProtection: true,
            frameOptions: 'DENY',
            httpsOnly: true
          }
        },
        ['static']: {
          framework: {
            staticGeneration: true,
            prerender: true,
            seo: true
          },
          assets: {
            images: { format: 'webp', quality: 95, lazy: true },
            fonts: { strategy: 'link', preload: true, display: 'swap' },
            css: { minify: true, inline: true, critical: true },
            javascript: { minify: true, bundle: true, defer: true }
          },
          performance: {
            bundleSize: { max: 1024, warning: 512 },
            loading: { strategy: 'lazy', priority: ['above-fold', 'interactive'] },
            caching: { static: true, dynamic: false, ttl: 86400 }
          },
          security: {
            csp: true,
            xssProtection: true,
            frameOptions: 'DENY',
            httpsOnly: true
          }
        }
      },
      compatibility: {
        browsers: ['> 1%', 'last 2 versions', 'not dead'],
        mobile: {
          responsive: true,
          touchOptimized: true,
          gestureSupport: true
        },
        accessibility: {
          wcagLevel: 'AA',
          screenReader: true,
          keyboardNavigation: true
        }
      }
    };
    
    return baseOptimization;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}