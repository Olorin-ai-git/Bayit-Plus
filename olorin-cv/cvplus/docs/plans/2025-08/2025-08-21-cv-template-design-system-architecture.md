# CVPlus Enhanced CV Template Design System Architecture

**Plan ID**: CVPLUS-TEMPLATE-ARCH-2025-08-21  
**Author**: Gil Klainert  
**Created**: 2025-08-21  
**Type**: UI/UX Design System Architecture  
**Priority**: High  
**Status**: Design Phase  
**Related Diagrams**: [Template Architecture Flow](/docs/diagrams/cv-template-design-system-flow.mermaid)

## Executive Summary

This document outlines the comprehensive architecture for CVPlus's enhanced CV template design system, featuring 8 industry-specific professional templates with unique layouts, styling systems, and specialized components. The system maintains ATS compatibility while providing visually distinctive templates that align with industry psychology and professional standards.

## Current Template System Analysis

### Existing Architecture
- **Basic Template Generator**: `CVTemplateGenerator.ts` generates HTML from template strings
- **Single Style System**: `templateStyles.ts` provides unified styling across all templates
- **Limited Customization**: Current system uses `selectedTemplate` as a simple string identifier
- **Generic Components**: All templates use identical section generators without industry-specific adaptations

### Limitations
1. **No Industry Differentiation**: All templates look identical regardless of profession
2. **Limited Visual Identity**: Templates lack industry-appropriate color schemes and typography
3. **Generic Components**: No specialized components for different professional contexts
4. **Poor Mobile Experience**: Templates not optimized for mobile/tablet viewing
5. **Static Layout**: No responsive grid system for different content types

## Enhanced Template Architecture

### 1. Template Interface Structure

```typescript
// types/cv-templates.ts
export interface CVTemplate {
  // Template Identity
  id: string;
  name: string;
  category: TemplateCategory;
  industry: IndustryType;
  
  // Visual Identity System
  colorScheme: ColorScheme;
  typography: TypographySystem;
  spacing: SpacingSystem;
  
  // Layout Configuration
  layout: LayoutConfiguration;
  responsiveBreakpoints: ResponsiveBreakpoints;
  
  // Component Specifications
  components: TemplateComponents;
  sections: SectionConfiguration[];
  
  // Feature Support
  supportedFeatures: FeatureSupport[];
  customizations: CustomizationOptions;
  
  // Industry-Specific
  professionalStandards: ProfessionalStandards;
  atsCompliance: ATSComplianceLevel;
  
  // Metadata
  previewImage: string;
  demoData: DemoDataSet;
  tags: string[];
}

export type TemplateCategory = 
  | 'executive' 
  | 'technical' 
  | 'creative' 
  | 'healthcare' 
  | 'financial' 
  | 'academic' 
  | 'sales' 
  | 'international';

export type IndustryType = 
  | 'executive-leadership'
  | 'technology'
  | 'creative-design'
  | 'healthcare-medical'
  | 'finance-banking'
  | 'academic-research'
  | 'sales-business'
  | 'international-global';

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  background: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface TypographySystem {
  fontFamily: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  fontSize: {
    xs: string;    // 12px
    sm: string;    // 14px
    base: string;  // 16px
    lg: string;    // 18px
    xl: string;    // 20px
    '2xl': string; // 24px
    '3xl': string; // 30px
    '4xl': string; // 36px
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface LayoutConfiguration {
  type: 'single-column' | 'two-column' | 'sidebar' | 'modular';
  maxWidth: string;
  padding: SpacingValues;
  margins: SpacingValues;
  sectionSpacing: string;
  headerLayout: 'centered' | 'left-aligned' | 'full-width' | 'sidebar';
  footerLayout: 'minimal' | 'detailed' | 'hidden';
}

export interface TemplateComponents {
  header: HeaderComponent;
  sections: SectionComponents;
  features: FeatureComponents;
  specializations: SpecializationComponents;
}

export interface SectionComponents {
  summary: SummaryComponent;
  experience: ExperienceComponent;
  education: EducationComponent;
  skills: SkillsComponent;
  certifications: CertificationComponent;
  projects: ProjectComponent;
  achievements: AchievementComponent;
}

export interface SpecializationComponents {
  // Executive Specializations
  leadership?: LeadershipComponent;
  boardPositions?: BoardPositionsComponent;
  strategicMetrics?: StrategyMetricsComponent;
  
  // Tech Specializations
  skillsMatrix?: SkillsMatrixComponent;
  githubIntegration?: GitHubComponent;
  projectShowcase?: ProjectShowcaseComponent;
  
  // Creative Specializations
  portfolioGallery?: PortfolioGalleryComponent;
  designProcess?: DesignProcessComponent;
  brandCampaigns?: BrandCampaignsComponent;
  
  // Healthcare Specializations
  medicalCredentials?: MedicalCredentialsComponent;
  patientOutcomes?: PatientOutcomesComponent;
  researchPublications?: ResearchComponent;
  
  // Financial Specializations
  performanceCharts?: PerformanceChartsComponent;
  clientGrowth?: ClientGrowthComponent;
  complianceRecord?: ComplianceComponent;
  
  // Academic Specializations
  publicationTimeline?: PublicationTimelineComponent;
  grantsAndFunding?: GrantsComponent;
  conferenceHistory?: ConferenceComponent;
  
  // Sales Specializations
  salesDashboard?: SalesDashboardComponent;
  quotaAchievements?: QuotaComponent;
  clientMetrics?: ClientMetricsComponent;
  
  // International Specializations
  globalExperienceMap?: GlobalMapComponent;
  languageProficiency?: LanguageComponent;
  culturalCompetencies?: CulturalComponent;
}
```

### 2. Template Registry System

```typescript
// utils/template-registry.ts
export class TemplateRegistry {
  private static templates: Map<string, CVTemplate> = new Map();
  
  static registerTemplate(template: CVTemplate): void {
    this.templates.set(template.id, template);
  }
  
  static getTemplate(id: string): CVTemplate | undefined {
    return this.templates.get(id);
  }
  
  static getTemplatesByCategory(category: TemplateCategory): CVTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.category === category);
  }
  
  static getTemplatesByIndustry(industry: IndustryType): CVTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.industry === industry);
  }
  
  static getAllTemplates(): CVTemplate[] {
    return Array.from(this.templates.values());
  }
}
```

### 3. Industry-Specific Template Definitions

#### Executive Authority Template
```typescript
// templates/executive-authority.ts
export const ExecutiveAuthorityTemplate: CVTemplate = {
  id: 'executive-authority',
  name: 'Executive Authority',
  category: 'executive',
  industry: 'executive-leadership',
  
  colorScheme: {
    primary: '#1e293b',      // Slate 800 - Authority
    secondary: '#475569',     // Slate 600 - Professional
    accent: '#dc2626',       // Red 600 - Power
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      // ... complete palette
    },
    semantic: {
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0284c7'
    }
  },
  
  typography: {
    fontFamily: {
      primary: "'Times New Roman', serif", // Traditional authority
      secondary: "'Arial', sans-serif",
      monospace: "'Courier New', monospace"
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px'
    }
  },
  
  layout: {
    type: 'single-column',
    maxWidth: '8.5in',
    padding: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
    headerLayout: 'centered',
    sectionSpacing: '2rem'
  },
  
  components: {
    header: {
      type: 'executive-header',
      nameStyle: 'large-serif-caps',
      contactLayout: 'centered-professional',
      includeTitle: true,
      includeSummaryHook: true
    },
    sections: {
      summary: {
        type: 'executive-summary',
        format: 'paragraph-with-highlights',
        maxLength: 150
      },
      experience: {
        type: 'executive-experience',
        format: 'achievement-focused',
        includeMetrics: true,
        highlightLeadership: true
      },
      skills: {
        type: 'executive-competencies',
        format: 'strategic-categories',
        categories: ['Strategic Leadership', 'Operational Excellence', 'Stakeholder Management']
      }
    },
    specializations: {
      leadership: {
        type: 'leadership-achievements',
        metrics: ['Team Size', 'Budget Managed', 'Revenue Impact'],
        visualFormat: 'executive-metrics-bar'
      },
      boardPositions: {
        type: 'board-service',
        format: 'prestigious-list',
        includeCompanyLogos: false
      },
      strategicMetrics: {
        type: 'strategic-impact',
        visualFormat: 'executive-dashboard',
        keyMetrics: ['P&L Responsibility', 'Market Share Growth', 'Digital Transformation']
      }
    }
  }
};
```

#### Tech Innovation Template
```typescript
// templates/tech-innovation.ts
export const TechInnovationTemplate: CVTemplate = {
  id: 'tech-innovation',
  name: 'Tech Innovation',
  category: 'technical',
  industry: 'technology',
  
  colorScheme: {
    primary: '#0f172a',      // Slate 900 - Tech Dark
    secondary: '#3b82f6',    // Blue 500 - Tech Blue
    accent: '#10b981',       // Emerald 500 - Success
    neutral: {
      50: '#f8fafc',
      // ... complete palette
    }
  },
  
  typography: {
    fontFamily: {
      primary: "'Inter', sans-serif",     // Modern tech font
      secondary: "'JetBrains Mono', monospace", // Code font
      monospace: "'Fira Code', monospace"
    }
  },
  
  layout: {
    type: 'two-column',
    maxWidth: '8.5in',
    headerLayout: 'left-aligned'
  },
  
  components: {
    header: {
      type: 'tech-header',
      nameStyle: 'modern-sans-bold',
      contactLayout: 'tech-compact',
      includeGitHub: true,
      includePortfolio: true
    },
    specializations: {
      skillsMatrix: {
        type: 'tech-skills-matrix',
        visualFormat: 'heatmap-grid',
        categories: ['Languages', 'Frameworks', 'Tools', 'Cloud Platforms'],
        skillLevels: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
      },
      githubIntegration: {
        type: 'github-stats',
        includeContributions: true,
        includeTopRepos: true,
        includeLanguageStats: true
      },
      projectShowcase: {
        type: 'tech-projects',
        format: 'card-based',
        includeCode: true,
        includeTechStack: true,
        includeLiveDemo: true
      }
    }
  }
};
```

#### Creative Showcase Template
```typescript
// templates/creative-showcase.ts
export const CreativeShowcaseTemplate: CVTemplate = {
  id: 'creative-showcase',
  name: 'Creative Showcase',
  category: 'creative',
  industry: 'creative-design',
  
  colorScheme: {
    primary: '#7c3aed',      // Violet 600 - Creative
    secondary: '#ec4899',    // Pink 500 - Artistic
    accent: '#f59e0b',       // Amber 500 - Creative Energy
    neutral: {
      50: '#fafaf9',
      // ... complete palette with creative flair
    }
  },
  
  typography: {
    fontFamily: {
      primary: "'Poppins', sans-serif",   // Creative modern
      secondary: "'Playfair Display', serif", // Elegant display
      monospace: "'Space Mono', monospace"
    }
  },
  
  layout: {
    type: 'modular',
    maxWidth: '8.5in',
    headerLayout: 'full-width'
  },
  
  components: {
    specializations: {
      portfolioGallery: {
        type: 'creative-portfolio',
        visualFormat: 'masonry-grid',
        includeImages: true,
        includeCaseStudies: true,
        includeClientLogos: true
      },
      designProcess: {
        type: 'design-methodology',
        visualFormat: 'process-flow',
        steps: ['Research', 'Ideation', 'Design', 'Prototype', 'Test', 'Launch']
      },
      brandCampaigns: {
        type: 'campaign-showcase',
        format: 'visual-timeline',
        includeMetrics: true,
        includeAwards: true
      }
    }
  }
};
```

### 4. Component Architecture System

#### Base Component Structure
```typescript
// components/template-components/BaseTemplateComponent.ts
export abstract class BaseTemplateComponent<T = any> {
  protected template: CVTemplate;
  protected data: T;
  protected className: string;
  
  constructor(template: CVTemplate, data: T, className?: string) {
    this.template = template;
    this.data = data;
    this.className = className || '';
  }
  
  abstract render(): string;
  
  protected getColorVar(colorKey: keyof ColorScheme): string {
    return this.template.colorScheme[colorKey] as string;
  }
  
  protected getTypographyVar(key: string): string {
    // Access typography system values
    return '';
  }
  
  protected getSpacing(size: keyof SpacingValues): string {
    return this.template.spacing[size];
  }
  
  protected applyResponsive(styles: ResponsiveStyles): string {
    // Apply responsive breakpoints
    return '';
  }
}
```

#### Specialized Components

##### Executive Leadership Component
```typescript
// components/template-components/executive/LeadershipComponent.ts
export class LeadershipComponent extends BaseTemplateComponent<LeadershipData> {
  render(): string {
    return `
      <div class="leadership-achievements-section ${this.className}">
        <style>
          .leadership-achievements-section {
            background: linear-gradient(135deg, ${this.getColorVar('background.secondary')} 0%, ${this.getColorVar('background.primary')} 100%);
            border-left: 4px solid ${this.getColorVar('primary')};
            padding: 2rem;
            border-radius: 8px;
            margin: 2rem 0;
          }
          
          .leadership-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin: 1.5rem 0;
          }
          
          .metric-card {
            background: ${this.getColorVar('background.primary')};
            padding: 1.5rem;
            border-radius: 6px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .metric-value {
            font-size: ${this.template.typography.fontSize['3xl']};
            font-weight: ${this.template.typography.fontWeight.bold};
            color: ${this.getColorVar('primary')};
            display: block;
          }
          
          .metric-label {
            font-size: ${this.template.typography.fontSize.sm};
            color: ${this.getColorVar('neutral.600')};
            font-weight: ${this.template.typography.fontWeight.medium};
            margin-top: 0.5rem;
          }
        </style>
        
        <h3 class="section-title">Leadership Impact</h3>
        <div class="leadership-metrics">
          ${this.renderMetrics()}
        </div>
        <div class="leadership-narrative">
          ${this.renderAchievements()}
        </div>
      </div>
    `;
  }
  
  private renderMetrics(): string {
    return this.data.metrics.map(metric => `
      <div class="metric-card">
        <span class="metric-value">${metric.value}</span>
        <span class="metric-label">${metric.label}</span>
      </div>
    `).join('');
  }
  
  private renderAchievements(): string {
    return `
      <ul class="achievement-list">
        ${this.data.achievements.map(achievement => `
          <li class="achievement-item">
            <span class="achievement-text">${achievement.description}</span>
            <span class="achievement-impact">${achievement.impact}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }
}
```

##### Tech Skills Matrix Component
```typescript
// components/template-components/tech/SkillsMatrixComponent.ts
export class SkillsMatrixComponent extends BaseTemplateComponent<TechSkillsData> {
  render(): string {
    return `
      <div class="tech-skills-matrix ${this.className}">
        <style>
          .tech-skills-matrix {
            background: ${this.getColorVar('background.primary')};
            border: 1px solid ${this.getColorVar('neutral.200')};
            border-radius: 12px;
            padding: 2rem;
            margin: 2rem 0;
          }
          
          .skills-heatmap {
            display: grid;
            gap: 0.5rem;
            margin: 1.5rem 0;
          }
          
          .skill-category {
            margin-bottom: 2rem;
          }
          
          .category-title {
            font-family: ${this.template.typography.fontFamily.primary};
            font-size: ${this.template.typography.fontSize.lg};
            font-weight: ${this.template.typography.fontWeight.semibold};
            color: ${this.getColorVar('primary')};
            margin-bottom: 1rem;
          }
          
          .skill-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 0.5rem;
          }
          
          .skill-item {
            padding: 0.75rem;
            border-radius: 6px;
            text-align: center;
            font-size: ${this.template.typography.fontSize.sm};
            font-weight: ${this.template.typography.fontWeight.medium};
            transition: all 0.2s ease;
          }
          
          .skill-level-1 { background: ${this.getColorVar('neutral.100')}; color: ${this.getColorVar('neutral.600')}; }
          .skill-level-2 { background: ${this.getColorVar('secondary')}20; color: ${this.getColorVar('secondary')}; }
          .skill-level-3 { background: ${this.getColorVar('secondary')}40; color: ${this.getColorVar('primary')}; }
          .skill-level-4 { background: ${this.getColorVar('secondary')}; color: white; }
          .skill-level-5 { background: ${this.getColorVar('primary')}; color: white; }
        </style>
        
        <h3 class="section-title">Technical Expertise</h3>
        ${this.renderSkillCategories()}
      </div>
    `;
  }
  
  private renderSkillCategories(): string {
    return Object.entries(this.data.categories).map(([category, skills]) => `
      <div class="skill-category">
        <h4 class="category-title">${category}</h4>
        <div class="skill-grid">
          ${skills.map(skill => `
            <div class="skill-item skill-level-${skill.level}">
              ${skill.name}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }
}
```

##### Creative Portfolio Gallery Component
```typescript
// components/template-components/creative/PortfolioGalleryComponent.ts
export class PortfolioGalleryComponent extends BaseTemplateComponent<PortfolioData> {
  render(): string {
    return `
      <div class="creative-portfolio-gallery ${this.className}">
        <style>
          .creative-portfolio-gallery {
            margin: 3rem 0;
          }
          
          .portfolio-masonry {
            columns: 3;
            column-gap: 1.5rem;
            margin: 2rem 0;
          }
          
          @media (max-width: 768px) {
            .portfolio-masonry {
              columns: 1;
            }
          }
          
          @media (max-width: 1024px) and (min-width: 769px) {
            .portfolio-masonry {
              columns: 2;
            }
          }
          
          .portfolio-item {
            background: ${this.getColorVar('background.primary')};
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 1.5rem;
            break-inside: avoid;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
          }
          
          .portfolio-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          }
          
          .portfolio-image {
            width: 100%;
            height: auto;
            display: block;
          }
          
          .portfolio-content {
            padding: 1.5rem;
          }
          
          .portfolio-title {
            font-size: ${this.template.typography.fontSize.lg};
            font-weight: ${this.template.typography.fontWeight.semibold};
            color: ${this.getColorVar('primary')};
            margin-bottom: 0.5rem;
          }
          
          .portfolio-description {
            color: ${this.getColorVar('neutral.600')};
            font-size: ${this.template.typography.fontSize.sm};
            line-height: ${this.template.typography.lineHeight.relaxed};
            margin-bottom: 1rem;
          }
          
          .portfolio-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          
          .portfolio-tag {
            background: ${this.getColorVar('accent')}20;
            color: ${this.getColorVar('accent')};
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            font-size: ${this.template.typography.fontSize.xs};
            font-weight: ${this.template.typography.fontWeight.medium};
          }
        </style>
        
        <h3 class="section-title">Portfolio Showcase</h3>
        <div class="portfolio-masonry">
          ${this.renderPortfolioItems()}
        </div>
      </div>
    `;
  }
  
  private renderPortfolioItems(): string {
    return this.data.items.map(item => `
      <div class="portfolio-item">
        <img src="${item.imageUrl}" alt="${item.title}" class="portfolio-image" />
        <div class="portfolio-content">
          <h4 class="portfolio-title">${item.title}</h4>
          <p class="portfolio-description">${item.description}</p>
          <div class="portfolio-tags">
            ${item.tags.map(tag => `<span class="portfolio-tag">${tag}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }
}
```

### 5. Responsive Design System

#### Breakpoint Configuration
```typescript
// utils/responsive-system.ts
export interface ResponsiveBreakpoints {
  mobile: string;    // 0-768px
  tablet: string;    // 769-1024px
  desktop: string;   // 1025px+
  print: string;     // Print styles
}

export const DefaultBreakpoints: ResponsiveBreakpoints = {
  mobile: '(max-width: 768px)',
  tablet: '(min-width: 769px) and (max-width: 1024px)',
  desktop: '(min-width: 1025px)',
  print: 'print'
};

export class ResponsiveStyleGenerator {
  static generateMediaQueries(template: CVTemplate): string {
    return `
      /* Mobile Styles */
      @media ${template.responsiveBreakpoints.mobile} {
        .cv-preview-container {
          padding: 1rem;
          font-size: 14px;
        }
        
        .${template.id} .two-column-layout {
          grid-template-columns: 1fr;
        }
        
        .${template.id} .skills-matrix {
          grid-template-columns: 1fr;
        }
        
        .${template.id} .portfolio-masonry {
          columns: 1;
        }
      }
      
      /* Tablet Styles */
      @media ${template.responsiveBreakpoints.tablet} {
        .cv-preview-container {
          padding: 2rem;
          font-size: 15px;
        }
        
        .${template.id} .portfolio-masonry {
          columns: 2;
        }
      }
      
      /* Desktop Styles */
      @media ${template.responsiveBreakpoints.desktop} {
        .cv-preview-container {
          padding: 3rem;
          font-size: 16px;
        }
      }
      
      /* Print Styles */
      @media ${template.responsiveBreakpoints.print} {
        .cv-preview-container {
          padding: 0.5in;
          font-size: 12pt;
          line-height: 1.4;
          background: white;
          box-shadow: none;
        }
        
        .feature-preview {
          border: 1px solid #ccc;
          background: white;
        }
        
        .portfolio-masonry {
          columns: 2;
          break-inside: avoid;
        }
      }
    `;
  }
}
```

### 6. Integration with Existing System

#### Enhanced CVTemplateGenerator
```typescript
// utils/cv-preview/enhancedCVTemplateGenerator.ts
export class EnhancedCVTemplateGenerator extends CVTemplateGenerator {
  static generateHTML(
    previewData: CVParsedData,
    templateId: string,
    selectedFeatures: Record<string, boolean>,
    qrCodeSettings: QRCodeSettings,
    collapsedSections: Record<string, boolean>,
    generateFeaturePreview: (featureId: string, isEnabled: boolean, isCollapsed: boolean) => string
  ): string {
    
    // Get template configuration
    const template = TemplateRegistry.getTemplate(templateId);
    if (!template) {
      // Fallback to legacy generator
      return super.generateHTML(previewData, templateId, selectedFeatures, qrCodeSettings, collapsedSections, generateFeaturePreview);
    }
    
    // Generate template-specific HTML
    const componentRenderer = new TemplateComponentRenderer(template);
    
    return `
      <div class="cv-preview-container ${template.id}" data-template="${template.id}">
        ${this.generateTemplateStyles(template)}
        
        <!-- Template-specific Header -->
        ${componentRenderer.renderHeader(previewData.personalInfo)}
        
        <!-- Core Sections with Template Styling -->
        ${componentRenderer.renderSummary(previewData.summary, collapsedSections)}
        ${componentRenderer.renderExperience(previewData.experience, collapsedSections)}
        ${componentRenderer.renderEducation(previewData.education, collapsedSections)}
        ${componentRenderer.renderSkills(previewData.skills, collapsedSections)}
        
        <!-- Industry-Specific Specialization Components -->
        ${componentRenderer.renderSpecializations(previewData, collapsedSections)}
        
        <!-- Feature Previews with Template Styling -->
        ${this.renderTemplateFeatures(template, selectedFeatures, collapsedSections, generateFeaturePreview)}
        
        <!-- QR Code with Template Integration -->
        ${componentRenderer.renderQRCode(qrCodeSettings, collapsedSections)}
      </div>
    `;
  }
  
  private static generateTemplateStyles(template: CVTemplate): string {
    return `
      <style>
        ${TemplateStyleGenerator.generateBaseStyles(template)}
        ${TemplateStyleGenerator.generateComponentStyles(template)}
        ${ResponsiveStyleGenerator.generateMediaQueries(template)}
        ${TemplateStyleGenerator.generateColorVariables(template)}
        ${TemplateStyleGenerator.generateTypographyStyles(template)}
      </style>
    `;
  }
  
  private static renderTemplateFeatures(
    template: CVTemplate,
    selectedFeatures: Record<string, boolean>,
    collapsedSections: Record<string, boolean>,
    generateFeaturePreview: Function
  ): string {
    const supportedFeatures = template.supportedFeatures || [];
    
    return Object.entries(selectedFeatures)
      .filter(([featureId, enabled]) => enabled && supportedFeatures.includes(featureId as any))
      .map(([featureId, enabled]) => {
        const isCollapsed = collapsedSections[featureId] || false;
        return `
          <div class="feature-preview ${template.id}-feature" data-feature="${featureId}">
            ${generateFeaturePreview(featureId, enabled, isCollapsed)}
          </div>
        `;
      })
      .join('');
  }
}
```

#### Template Component Renderer
```typescript
// utils/template-components/TemplateComponentRenderer.ts
export class TemplateComponentRenderer {
  private template: CVTemplate;
  private componentFactory: ComponentFactory;
  
  constructor(template: CVTemplate) {
    this.template = template;
    this.componentFactory = new ComponentFactory(template);
  }
  
  renderHeader(personalInfo: CVPersonalInfo): string {
    const headerComponent = this.componentFactory.createHeaderComponent(personalInfo);
    return headerComponent.render();
  }
  
  renderSummary(summary: string, collapsedSections: Record<string, boolean>): string {
    if (collapsedSections['summary']) return '';
    
    const summaryComponent = this.componentFactory.createSummaryComponent(summary);
    return summaryComponent.render();
  }
  
  renderExperience(experience: CVExperienceItem[], collapsedSections: Record<string, boolean>): string {
    if (collapsedSections['experience']) return '';
    
    const experienceComponent = this.componentFactory.createExperienceComponent(experience);
    return experienceComponent.render();
  }
  
  renderSpecializations(previewData: CVParsedData, collapsedSections: Record<string, boolean>): string {
    const specializations = this.template.components.specializations;
    if (!specializations) return '';
    
    let html = '';
    
    // Render industry-specific components based on template category
    switch (this.template.category) {
      case 'executive':
        if (specializations.leadership) {
          html += this.renderLeadershipComponent(previewData, collapsedSections);
        }
        if (specializations.boardPositions) {
          html += this.renderBoardPositionsComponent(previewData, collapsedSections);
        }
        break;
        
      case 'technical':
        if (specializations.skillsMatrix) {
          html += this.renderSkillsMatrixComponent(previewData, collapsedSections);
        }
        if (specializations.githubIntegration) {
          html += this.renderGitHubComponent(previewData, collapsedSections);
        }
        break;
        
      case 'creative':
        if (specializations.portfolioGallery) {
          html += this.renderPortfolioComponent(previewData, collapsedSections);
        }
        if (specializations.designProcess) {
          html += this.renderDesignProcessComponent(previewData, collapsedSections);
        }
        break;
    }
    
    return html;
  }
  
  private renderLeadershipComponent(previewData: CVParsedData, collapsedSections: Record<string, boolean>): string {
    if (collapsedSections['leadership']) return '';
    
    // Extract leadership data from experience or custom sections
    const leadershipData = this.extractLeadershipData(previewData);
    const component = new LeadershipComponent(this.template, leadershipData);
    return component.render();
  }
  
  private renderSkillsMatrixComponent(previewData: CVParsedData, collapsedSections: Record<string, boolean>): string {
    if (collapsedSections['skillsMatrix']) return '';
    
    const skillsData = this.transformSkillsToMatrix(previewData.skills);
    const component = new SkillsMatrixComponent(this.template, skillsData);
    return component.render();
  }
  
  private renderPortfolioComponent(previewData: CVParsedData, collapsedSections: Record<string, boolean>): string {
    if (collapsedSections['portfolio']) return '';
    
    const portfolioData = this.extractPortfolioData(previewData);
    const component = new PortfolioGalleryComponent(this.template, portfolioData);
    return component.render();
  }
}
```

### 7. Template Style Generation System

```typescript
// utils/template-styles/TemplateStyleGenerator.ts
export class TemplateStyleGenerator {
  static generateBaseStyles(template: CVTemplate): string {
    return `
      .cv-preview-container.${template.id} {
        font-family: ${template.typography.fontFamily.primary};
        max-width: ${template.layout.maxWidth};
        padding: ${this.formatSpacing(template.layout.padding)};
        margin: ${this.formatSpacing(template.layout.margins)};
        background: ${template.colorScheme.background.primary};
        color: ${template.colorScheme.neutral[800]};
        line-height: ${template.typography.lineHeight.normal};
      }
    `;
  }
  
  static generateColorVariables(template: CVTemplate): string {
    const colors = template.colorScheme;
    return `
      .${template.id} {
        --color-primary: ${colors.primary};
        --color-secondary: ${colors.secondary};
        --color-accent: ${colors.accent};
        --color-success: ${colors.semantic.success};
        --color-warning: ${colors.semantic.warning};
        --color-error: ${colors.semantic.error};
        --color-info: ${colors.semantic.info};
        
        ${Object.entries(colors.neutral).map(([key, value]) => 
          `--color-neutral-${key}: ${value};`
        ).join('\n        ')}
        
        ${Object.entries(colors.background).map(([key, value]) => 
          `--color-bg-${key}: ${value};`
        ).join('\n        ')}
      }
    `;
  }
  
  static generateTypographyStyles(template: CVTemplate): string {
    const typography = template.typography;
    return `
      .${template.id} {
        --font-primary: ${typography.fontFamily.primary};
        --font-secondary: ${typography.fontFamily.secondary};
        --font-mono: ${typography.fontFamily.monospace};
        
        ${Object.entries(typography.fontSize).map(([key, value]) => 
          `--font-size-${key}: ${value};`
        ).join('\n        ')}
        
        ${Object.entries(typography.fontWeight).map(([key, value]) => 
          `--font-weight-${key}: ${value};`
        ).join('\n        ')}
        
        ${Object.entries(typography.lineHeight).map(([key, value]) => 
          `--line-height-${key}: ${value};`
        ).join('\n        ')}
      }
    `;
  }
  
  static generateComponentStyles(template: CVTemplate): string {
    let styles = '';
    
    // Header styles based on template configuration
    if (template.components.header) {
      styles += this.generateHeaderStyles(template);
    }
    
    // Section styles
    styles += this.generateSectionStyles(template);
    
    // Specialization component styles
    if (template.components.specializations) {
      styles += this.generateSpecializationStyles(template);
    }
    
    return styles;
  }
  
  private static generateHeaderStyles(template: CVTemplate): string {
    const header = template.components.header;
    const layout = header.contactLayout;
    
    return `
      .${template.id} .header-section {
        text-align: ${layout === 'centered-professional' ? 'center' : 'left'};
        margin-bottom: ${template.layout.sectionSpacing};
        padding-bottom: 1.5rem;
        border-bottom: 2px solid var(--color-neutral-200);
      }
      
      .${template.id} .name {
        font-size: var(--font-size-4xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-primary);
        margin-bottom: 0.75rem;
        ${header.nameStyle === 'large-serif-caps' ? 'text-transform: uppercase; letter-spacing: 2px;' : ''}
      }
      
      .${template.id} .contact-info {
        display: flex;
        ${layout === 'centered-professional' ? 'justify-content: center;' : 'justify-content: flex-start;'}
        gap: 1.5rem;
        flex-wrap: wrap;
        font-size: var(--font-size-base);
        color: var(--color-neutral-600);
      }
    `;
  }
  
  private static generateSectionStyles(template: CVTemplate): string {
    return `
      .${template.id} .section-title {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-primary);
        margin-bottom: 1.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--color-secondary);
        position: relative;
      }
      
      .${template.id} .section-content {
        margin-bottom: ${template.layout.sectionSpacing};
      }
      
      .${template.id} .experience-item,
      .${template.id} .education-item {
        margin-bottom: 2rem;
        padding-left: 1.5rem;
        border-left: 3px solid var(--color-secondary);
        position: relative;
      }
      
      .${template.id} .position,
      .${template.id} .degree {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-primary);
        margin-bottom: 0.5rem;
      }
      
      .${template.id} .company,
      .${template.id} .institution {
        font-size: var(--font-size-lg);
        color: var(--color-secondary);
        font-weight: var(--font-weight-medium);
        margin-bottom: 0.25rem;
      }
    `;
  }
  
  private static generateSpecializationStyles(template: CVTemplate): string {
    let styles = '';
    const specializations = template.components.specializations;
    
    if (specializations?.leadership) {
      styles += this.generateLeadershipStyles(template);
    }
    
    if (specializations?.skillsMatrix) {
      styles += this.generateSkillsMatrixStyles(template);
    }
    
    if (specializations?.portfolioGallery) {
      styles += this.generatePortfolioStyles(template);
    }
    
    return styles;
  }
  
  private static generateLeadershipStyles(template: CVTemplate): string {
    return `
      .${template.id} .leadership-achievements-section {
        background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-primary) 100%);
        border: 1px solid var(--color-neutral-200);
        border-left: 4px solid var(--color-primary);
        border-radius: 8px;
        padding: 2rem;
        margin: 2rem 0;
      }
      
      .${template.id} .leadership-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin: 1.5rem 0;
      }
      
      .${template.id} .metric-card {
        background: var(--color-bg-primary);
        padding: 1.5rem;
        border-radius: 6px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border: 1px solid var(--color-neutral-100);
      }
    `;
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. **Template Interface & Registry**
   - Implement CVTemplate interface and type system
   - Create TemplateRegistry for template management
   - Set up dependency injection for template system

2. **Base Component Architecture**
   - Create BaseTemplateComponent abstract class
   - Implement ComponentFactory for template-specific components
   - Set up responsive system foundation

### Phase 2: Core Templates (Week 2-3)
1. **Executive Authority Template**
   - Implement LeadershipComponent and BoardPositionsComponent
   - Create executive-specific styling system
   - Develop strategic metrics visualization

2. **Tech Innovation Template**
   - Build SkillsMatrixComponent with heatmap visualization
   - Implement GitHubIntegration component
   - Create tech-focused project showcase

3. **Creative Showcase Template**
   - Develop PortfolioGalleryComponent with masonry layout
   - Implement DesignProcessComponent with visual flow
   - Create brand campaign showcase

### Phase 3: Additional Templates (Week 3-4)
1. **Healthcare Professional Template**
   - Medical credentials and certifications display
   - Patient outcomes and research publications
   - Healthcare-specific compliance indicators

2. **Financial Expert Template**
   - Performance charts and metrics visualization
   - Client growth tracking components
   - Regulatory compliance records

3. **Academic Scholar Template**
   - Publication timeline with citation metrics
   - Grants and funding history
   - Conference presentation showcase

### Phase 4: Integration & Testing (Week 4-5)
1. **System Integration**
   - Update CVTemplateGenerator to use new system
   - Maintain backward compatibility with existing templates
   - Implement template switching and preview functionality

2. **Responsive Optimization**
   - Test all templates across mobile, tablet, desktop
   - Optimize print layouts for each template
   - Ensure ATS compatibility across all templates

3. **Performance & Quality Assurance**
   - Component performance optimization
   - Cross-browser compatibility testing
   - Accessibility compliance validation

## Success Metrics

### User Experience Metrics
- **Template Differentiation**: 100% visual distinction between industry templates
- **Mobile Responsiveness**: All templates optimized for mobile viewing
- **ATS Compatibility**: 100% ATS-readable formatting across all templates
- **Load Performance**: <2s template switching and preview generation

### Technical Metrics
- **Component Reusability**: 80% component reuse across similar templates
- **Code Maintainability**: All template components <200 lines
- **Test Coverage**: 95% coverage for template system components
- **Bundle Size Impact**: <50KB additional bundle size for enhanced system

### Business Metrics
- **User Engagement**: 40% increase in template usage diversity
- **Professional Appeal**: Industry-appropriate visual design validation
- **Conversion Rate**: Improved CV quality scores across all template types

This enhanced CV template design system will position CVPlus as the premier platform for professional CV creation, offering industry-specific expertise while maintaining the flexibility and power that users expect from a modern AI-powered career platform.