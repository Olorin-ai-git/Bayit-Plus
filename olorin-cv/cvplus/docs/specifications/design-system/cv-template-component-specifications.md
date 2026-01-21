# CV Template Component Specifications

**Document ID**: CVPLUS-COMP-SPEC-2025-08-21  
**Author**: Gil Klainert  
**Created**: 2025-08-21  
**Type**: Technical Specification  
**Related**: [CV Template Design System Architecture](/docs/plans/2025-08-21-cv-template-design-system-architecture.md)

## Overview

This document provides detailed specifications for all components within the CVPlus enhanced template design system, including interfaces, data structures, and implementation guidelines for industry-specific CV templates.

## Core Interfaces and Types

### Template Interface Structure

```typescript
// types/cv-templates.ts

export interface CVTemplate {
  // Template Identity
  id: string;
  name: string;
  category: TemplateCategory;
  industry: IndustryType;
  description: string;
  version: string;
  
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
  keywordOptimization: KeywordOptimization;
  
  // Metadata
  previewImage: string;
  demoData: DemoDataSet;
  tags: string[];
  createdAt: string;
  updatedAt: string;
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

export type ATSComplianceLevel = 'high' | 'medium' | 'custom';

export type FeatureSupport = 
  | 'achievement-highlighting'
  | 'skills-visualization' 
  | 'portfolio-gallery'
  | 'video-introduction'
  | 'podcast-generation'
  | 'qr-code'
  | 'calendar-integration'
  | 'social-links'
  | 'certification-badges'
  | 'language-proficiency'
  | 'industry-metrics'
  | 'performance-charts'
  | 'publication-timeline'
  | 'global-experience-map';
```

### Color System Interface

```typescript
export interface ColorScheme {
  // Primary Brand Colors
  primary: string;
  secondary: string;
  accent: string;
  
  // Neutral Palette (Tailwind-inspired)
  neutral: {
    50: string;   // Lightest
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;  // Base
    600: string;
    700: string;
    800: string;
    900: string;  // Darkest
  };
  
  // Semantic Colors
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  
  // Background System
  background: {
    primary: string;     // Main background
    secondary: string;   // Subtle sections
    accent: string;      // Highlight areas
    overlay: string;     // Modal/overlay backgrounds
  };
  
  // Industry-Specific Colors
  industry: {
    highlight: string;   // Industry accent color
    professional: string; // Professional tone color
    trust: string;       // Trust/authority color
  };
  
  // Interactive States
  interactive: {
    hover: string;
    active: string;
    focus: string;
    disabled: string;
  };
}
```

### Typography System Interface

```typescript
export interface TypographySystem {
  // Font Families
  fontFamily: {
    primary: string;     // Main content font
    secondary: string;   // Headers/accents
    monospace: string;   // Code/technical content
    display: string;     // Large display text
  };
  
  // Font Size Scale (rem-based)
  fontSize: {
    xs: string;    // 0.75rem (12px)
    sm: string;    // 0.875rem (14px)
    base: string;  // 1rem (16px)
    lg: string;    // 1.125rem (18px)
    xl: string;    // 1.25rem (20px)
    '2xl': string; // 1.5rem (24px)
    '3xl': string; // 1.875rem (30px)
    '4xl': string; // 2.25rem (36px)
    '5xl': string; // 3rem (48px)
  };
  
  // Font Weights
  fontWeight: {
    thin: number;      // 100
    light: number;     // 300
    normal: number;    // 400
    medium: number;    // 500
    semibold: number;  // 600
    bold: number;      // 700
    extrabold: number; // 800
  };
  
  // Line Heights
  lineHeight: {
    tight: string;   // 1.25
    normal: string;  // 1.5
    relaxed: string; // 1.625
    loose: string;   // 2
  };
  
  // Letter Spacing
  letterSpacing: {
    tighter: string; // -0.05em
    tight: string;   // -0.025em
    normal: string;  // 0
    wide: string;    // 0.025em
    wider: string;   // 0.05em
  };
}
```

### Layout Configuration Interface

```typescript
export interface LayoutConfiguration {
  type: LayoutType;
  maxWidth: string;
  padding: SpacingValues;
  margins: SpacingValues;
  
  // Section Layout
  sectionSpacing: string;
  columnGap: string;
  rowGap: string;
  
  // Header Configuration
  headerLayout: HeaderLayout;
  headerSpacing: string;
  
  // Footer Configuration
  footerLayout: FooterLayout;
  footerSpacing: string;
  
  // Grid System
  gridColumns: number;
  gridBreakpoints: GridBreakpoints;
  
  // Content Organization
  contentFlow: ContentFlow;
  sectionOrder: string[];
}

export type LayoutType = 
  | 'single-column'     // Traditional CV layout
  | 'two-column'        // Sidebar + content
  | 'sidebar-left'      // Left sidebar
  | 'sidebar-right'     // Right sidebar
  | 'modular-grid'      // CSS Grid based
  | 'masonry'           // Pinterest-style
  | 'timeline'          // Chronological flow
  | 'magazine';         // Editorial style

export type HeaderLayout = 
  | 'centered'          // Traditional centered
  | 'left-aligned'      // Modern left
  | 'full-width'        // Spans full width
  | 'sidebar'           // In sidebar
  | 'split'             // Name left, contact right
  | 'stacked';          // Vertical stack

export type ContentFlow = 
  | 'traditional'       // Standard CV order
  | 'skills-first'      // Skills prominence
  | 'project-focused'   // Projects highlighted
  | 'achievement-led'   // Achievements first
  | 'chronological'     // Time-based
  | 'functional';       // Skill-based grouping
```

### Spacing System Interface

```typescript
export interface SpacingSystem {
  // Base spacing scale (rem-based)
  scale: {
    0: string;     // 0
    1: string;     // 0.25rem (4px)
    2: string;     // 0.5rem (8px)
    3: string;     // 0.75rem (12px)
    4: string;     // 1rem (16px)
    5: string;     // 1.25rem (20px)
    6: string;     // 1.5rem (24px)
    8: string;     // 2rem (32px)
    10: string;    // 2.5rem (40px)
    12: string;    // 3rem (48px)
    16: string;    // 4rem (64px)
    20: string;    // 5rem (80px)
  };
  
  // Semantic spacing
  semantic: {
    xs: string;    // Extra small spacing
    sm: string;    // Small spacing
    md: string;    // Medium spacing
    lg: string;    // Large spacing
    xl: string;    // Extra large spacing
  };
  
  // Component-specific spacing
  components: {
    section: string;      // Between sections
    paragraph: string;    // Between paragraphs
    list: string;         // List item spacing
    header: string;       // Header spacing
    footer: string;       // Footer spacing
  };
}

export interface SpacingValues {
  top: string;
  right: string;
  bottom: string;
  left: string;
}
```

## Component Specifications

### Base Component Architecture

```typescript
// components/template-components/BaseTemplateComponent.ts

export abstract class BaseTemplateComponent<T = any> {
  protected template: CVTemplate;
  protected data: T;
  protected className: string;
  protected responsive: boolean;
  
  constructor(
    template: CVTemplate, 
    data: T, 
    options?: ComponentOptions
  ) {
    this.template = template;
    this.data = data;
    this.className = options?.className || '';
    this.responsive = options?.responsive ?? true;
  }
  
  abstract render(): string;
  
  // Utility methods for consistent styling
  protected getColorVar(path: string): string {
    const keys = path.split('.');
    let value: any = this.template.colorScheme;
    for (const key of keys) {
      value = value?.[key];
    }
    return value || '#000000';
  }
  
  protected getFontVar(path: string): string {
    const keys = path.split('.');
    let value: any = this.template.typography;
    for (const key of keys) {
      value = value?.[key];
    }
    return value || 'inherit';
  }
  
  protected getSpacingVar(key: string): string {
    return this.template.spacing.scale[key as keyof typeof this.template.spacing.scale] || '0';
  }
  
  protected generateResponsiveClass(baseClass: string): string {
    if (!this.responsive) return baseClass;
    return `${baseClass} ${this.template.id}-responsive`;
  }
  
  protected wrapInSection(content: string, sectionId: string): string {
    return `
      <section class="template-section ${sectionId}-section ${this.template.id}-section" data-section="${sectionId}">
        ${content}
      </section>
    `;
  }
}

export interface ComponentOptions {
  className?: string;
  responsive?: boolean;
  collapsible?: boolean;
  editable?: boolean;
}
```

### Header Components

```typescript
// components/template-components/headers/BaseHeaderComponent.ts

export interface HeaderData {
  personalInfo: CVPersonalInfo;
  professionalTitle?: string;
  tagline?: string;
  socialLinks?: SocialLink[];
  profileImage?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon?: string;
  verified?: boolean;
}

export abstract class BaseHeaderComponent extends BaseTemplateComponent<HeaderData> {
  abstract render(): string;
  
  protected renderName(): string {
    const name = this.data.personalInfo.fullName || this.data.personalInfo.name || 'Professional Name';
    const style = this.template.components.header.nameStyle;
    
    return `
      <h1 class="cv-name ${style} ${this.generateResponsiveClass('name')}">
        ${name}
      </h1>
    `;
  }
  
  protected renderContact(): string {
    const { email, phone, location } = this.data.personalInfo;
    const layout = this.template.components.header.contactLayout;
    
    return `
      <div class="contact-info ${layout} ${this.generateResponsiveClass('contact')}">
        ${email ? `<span class="contact-item email">${email}</span>` : ''}
        ${phone ? `<span class="contact-item phone">${phone}</span>` : ''}
        ${location ? `<span class="contact-item location">${location}</span>` : ''}
      </div>
    `;
  }
  
  protected renderSocialLinks(): string {
    if (!this.data.socialLinks?.length) return '';
    
    return `
      <div class="social-links ${this.generateResponsiveClass('social')}">
        ${this.data.socialLinks.map(link => `
          <a href="${link.url}" class="social-link ${link.platform}" target="_blank" rel="noopener">
            ${link.icon ? `<i class="${link.icon}"></i>` : ''}
            <span class="social-text">${link.platform}</span>
            ${link.verified ? '<span class="verified-badge">✓</span>' : ''}
          </a>
        `).join('')}
      </div>
    `;
  }
}

// Executive Header Component
export class ExecutiveHeaderComponent extends BaseHeaderComponent {
  render(): string {
    const styles = this.generateHeaderStyles();
    
    return `
      ${styles}
      <header class="executive-header ${this.className}">
        <div class="header-content">
          ${this.renderName()}
          ${this.data.professionalTitle ? `<h2 class="professional-title">${this.data.professionalTitle}</h2>` : ''}
          ${this.renderContact()}
          ${this.renderSocialLinks()}
          ${this.data.tagline ? `<p class="executive-tagline">${this.data.tagline}</p>` : ''}
        </div>
      </header>
    `;
  }
  
  private generateHeaderStyles(): string {
    return `
      <style>
        .executive-header {
          text-align: center;
          padding: ${this.getSpacingVar('8')} 0;
          border-bottom: 2px solid ${this.getColorVar('neutral.200')};
          margin-bottom: ${this.getSpacingVar('8')};
        }
        
        .executive-header .cv-name {
          font-size: ${this.getFontVar('fontSize.4xl')};
          font-weight: ${this.getFontVar('fontWeight.bold')};
          font-family: ${this.getFontVar('fontFamily.primary')};
          color: ${this.getColorVar('primary')};
          margin-bottom: ${this.getSpacingVar('2')};
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        
        .executive-header .professional-title {
          font-size: ${this.getFontVar('fontSize.xl')};
          font-weight: ${this.getFontVar('fontWeight.medium')};
          color: ${this.getColorVar('secondary')};
          margin-bottom: ${this.getSpacingVar('4')};
        }
        
        .executive-header .contact-info {
          display: flex;
          justify-content: center;
          gap: ${this.getSpacingVar('6')};
          flex-wrap: wrap;
          margin-bottom: ${this.getSpacingVar('4')};
        }
        
        .executive-header .contact-item {
          color: ${this.getColorVar('neutral.600')};
          font-weight: ${this.getFontVar('fontWeight.medium')};
        }
        
        .executive-header .executive-tagline {
          font-style: italic;
          color: ${this.getColorVar('neutral.700')};
          max-width: 600px;
          margin: 0 auto;
          line-height: ${this.getFontVar('lineHeight.relaxed')};
        }
        
        @media (max-width: 768px) {
          .executive-header .cv-name {
            font-size: ${this.getFontVar('fontSize.3xl')};
          }
          
          .executive-header .contact-info {
            gap: ${this.getSpacingVar('4')};
          }
        }
      </style>
    `;
  }
}
```

### Experience Components

```typescript
// components/template-components/experience/ExperienceComponents.ts

export interface ExperienceData {
  items: CVExperienceItem[];
  showMetrics: boolean;
  highlightAchievements: boolean;
  groupByIndustry: boolean;
}

export abstract class BaseExperienceComponent extends BaseTemplateComponent<ExperienceData> {
  abstract render(): string;
  
  protected formatDuration(item: CVExperienceItem): string {
    if (item.duration) return item.duration;
    if (item.startDate && item.endDate) {
      return `${item.startDate} - ${item.endDate}`;
    }
    return 'Duration not specified';
  }
  
  protected extractMetrics(achievements: string[]): { metric: string; value: string }[] {
    const metricPattern = /(\d+(?:\.\d+)?(?:%|K|M|B)?)/g;
    return achievements.map(achievement => {
      const matches = achievement.match(metricPattern);
      return {
        metric: achievement,
        value: matches?.[0] || ''
      };
    }).filter(item => item.value);
  }
}

// Executive Experience Component
export class ExecutiveExperienceComponent extends BaseExperienceComponent {
  render(): string {
    const styles = this.generateExperienceStyles();
    
    return `
      ${styles}
      <div class="executive-experience ${this.className}">
        <h3 class="section-title">Professional Experience</h3>
        <div class="experience-list">
          ${this.data.items.map(item => this.renderExperienceItem(item)).join('')}
        </div>
      </div>
    `;
  }
  
  private renderExperienceItem(item: CVExperienceItem): string {
    const metrics = this.extractMetrics(item.achievements || []);
    
    return `
      <div class="experience-item executive-item">
        <div class="item-header">
          <div class="position-info">
            <h4 class="position">${item.position || item.title || 'Position'}</h4>
            <h5 class="company">${item.company || 'Company'}</h5>
          </div>
          <div class="duration-info">
            <span class="duration">${this.formatDuration(item)}</span>
            ${item.location ? `<span class="location">${item.location}</span>` : ''}
          </div>
        </div>
        
        ${item.description ? `<p class="description">${item.description}</p>` : ''}
        
        ${metrics.length > 0 ? `
          <div class="achievement-metrics">
            ${metrics.slice(0, 3).map(metric => `
              <div class="metric-highlight">
                <span class="metric-value">${metric.value}</span>
                <span class="metric-context">${metric.metric}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${item.achievements && item.achievements.length > 0 ? `
          <ul class="achievements executive-achievements">
            ${item.achievements.map(achievement => `
              <li class="achievement-item">${achievement}</li>
            `).join('')}
          </ul>
        ` : ''}
        
        ${item.technologies && item.technologies.length > 0 ? `
          <div class="technologies">
            <strong>Key Technologies:</strong>
            <span class="tech-list">${item.technologies.join(', ')}</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  private generateExperienceStyles(): string {
    return `
      <style>
        .executive-experience {
          margin: ${this.getSpacingVar('8')} 0;
        }
        
        .executive-experience .experience-item {
          margin-bottom: ${this.getSpacingVar('8')};
          padding: ${this.getSpacingVar('6')};
          border-left: 4px solid ${this.getColorVar('primary')};
          background: ${this.getColorVar('background.secondary')};
          border-radius: 8px;
          position: relative;
        }
        
        .executive-experience .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: ${this.getSpacingVar('4')};
        }
        
        .executive-experience .position {
          font-size: ${this.getFontVar('fontSize.xl')};
          font-weight: ${this.getFontVar('fontWeight.bold')};
          color: ${this.getColorVar('primary')};
          margin-bottom: ${this.getSpacingVar('1')};
        }
        
        .executive-experience .company {
          font-size: ${this.getFontVar('fontSize.lg')};
          font-weight: ${this.getFontVar('fontWeight.semibold')};
          color: ${this.getColorVar('secondary')};
        }
        
        .executive-experience .duration-info {
          text-align: right;
          color: ${this.getColorVar('neutral.600')};
        }
        
        .executive-experience .achievement-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: ${this.getSpacingVar('4')};
          margin: ${this.getSpacingVar('4')} 0;
          padding: ${this.getSpacingVar('4')};
          background: ${this.getColorVar('background.primary')};
          border-radius: 6px;
        }
        
        .executive-experience .metric-highlight {
          text-align: center;
        }
        
        .executive-experience .metric-value {
          display: block;
          font-size: ${this.getFontVar('fontSize.2xl')};
          font-weight: ${this.getFontVar('fontWeight.bold')};
          color: ${this.getColorVar('accent')};
        }
        
        .executive-experience .metric-context {
          font-size: ${this.getFontVar('fontSize.sm')};
          color: ${this.getColorVar('neutral.600')};
        }
        
        .executive-experience .executive-achievements {
          list-style: none;
          padding: 0;
          margin: ${this.getSpacingVar('4')} 0;
        }
        
        .executive-experience .achievement-item {
          position: relative;
          padding-left: ${this.getSpacingVar('6')};
          margin-bottom: ${this.getSpacingVar('2')};
          line-height: ${this.getFontVar('lineHeight.relaxed')};
        }
        
        .executive-experience .achievement-item::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: ${this.getColorVar('accent')};
          font-weight: bold;
          font-size: ${this.getFontVar('fontSize.lg')};
        }
        
        @media (max-width: 768px) {
          .executive-experience .item-header {
            flex-direction: column;
            gap: ${this.getSpacingVar('2')};
          }
          
          .executive-experience .achievement-metrics {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }
}
```

### Specialization Components

```typescript
// components/template-components/specializations/LeadershipComponent.ts

export interface LeadershipData {
  metrics: LeadershipMetric[];
  achievements: LeadershipAchievement[];
  leadershipStyle: string;
  teamSizes: number[];
  budgetManaged: string[];
  industries: string[];
}

export interface LeadershipMetric {
  label: string;
  value: string;
  context: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface LeadershipAchievement {
  description: string;
  impact: string;
  metrics?: string[];
  timeframe: string;
}

export class LeadershipComponent extends BaseTemplateComponent<LeadershipData> {
  render(): string {
    const styles = this.generateLeadershipStyles();
    
    return `
      ${styles}
      <div class="leadership-showcase ${this.className}">
        <h3 class="section-title">Leadership Impact</h3>
        
        <div class="leadership-overview">
          ${this.renderMetricsGrid()}
          ${this.renderLeadershipStyle()}
        </div>
        
        <div class="leadership-achievements">
          <h4 class="subsection-title">Key Leadership Achievements</h4>
          ${this.renderAchievements()}
        </div>
        
        <div class="leadership-experience">
          ${this.renderExperienceMetrics()}
        </div>
      </div>
    `;
  }
  
  private renderMetricsGrid(): string {
    return `
      <div class="metrics-grid">
        ${this.data.metrics.map(metric => `
          <div class="metric-card">
            <div class="metric-value">
              ${metric.value}
              ${metric.trend ? `<span class="trend-indicator ${metric.trend}"></span>` : ''}
            </div>
            <div class="metric-label">${metric.label}</div>
            <div class="metric-context">${metric.context}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  private renderLeadershipStyle(): string {
    if (!this.data.leadershipStyle) return '';
    
    return `
      <div class="leadership-style">
        <h4 class="style-title">Leadership Approach</h4>
        <p class="style-description">${this.data.leadershipStyle}</p>
      </div>
    `;
  }
  
  private renderAchievements(): string {
    return `
      <div class="achievements-list">
        ${this.data.achievements.map(achievement => `
          <div class="achievement-card">
            <div class="achievement-description">${achievement.description}</div>
            <div class="achievement-impact">${achievement.impact}</div>
            <div class="achievement-timeframe">${achievement.timeframe}</div>
            ${achievement.metrics ? `
              <div class="achievement-metrics">
                ${achievement.metrics.map(metric => `<span class="metric-badge">${metric}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }
  
  private renderExperienceMetrics(): string {
    const maxTeamSize = Math.max(...this.data.teamSizes);
    const industries = this.data.industries.slice(0, 5); // Limit display
    
    return `
      <div class="experience-metrics">
        <div class="team-leadership">
          <h5>Team Leadership Experience</h5>
          <div class="team-size-visual">
            <span class="team-count">${maxTeamSize}+</span>
            <span class="team-label">Maximum Team Size Managed</span>
          </div>
        </div>
        
        <div class="industry-breadth">
          <h5>Industry Experience</h5>
          <div class="industry-tags">
            ${industries.map(industry => `<span class="industry-tag">${industry}</span>`).join('')}
          </div>
        </div>
        
        ${this.data.budgetManaged.length > 0 ? `
          <div class="budget-responsibility">
            <h5>Budget Management</h5>
            <div class="budget-levels">
              ${this.data.budgetManaged.map(budget => `<span class="budget-item">${budget}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  private generateLeadershipStyles(): string {
    return `
      <style>
        .leadership-showcase {
          background: linear-gradient(135deg, ${this.getColorVar('background.secondary')} 0%, ${this.getColorVar('background.primary')} 100%);
          border: 1px solid ${this.getColorVar('neutral.200')};
          border-left: 4px solid ${this.getColorVar('primary')};
          border-radius: 12px;
          padding: ${this.getSpacingVar('8')};
          margin: ${this.getSpacingVar('8')} 0;
        }
        
        .leadership-showcase .section-title {
          color: ${this.getColorVar('primary')};
          font-size: ${this.getFontVar('fontSize.2xl')};
          font-weight: ${this.getFontVar('fontWeight.bold')};
          margin-bottom: ${this.getSpacingVar('6')};
          text-align: center;
        }
        
        .leadership-showcase .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: ${this.getSpacingVar('4')};
          margin-bottom: ${this.getSpacingVar('6')};
        }
        
        .leadership-showcase .metric-card {
          background: ${this.getColorVar('background.primary')};
          padding: ${this.getSpacingVar('4')};
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border: 1px solid ${this.getColorVar('neutral.100')};
        }
        
        .leadership-showcase .metric-value {
          font-size: ${this.getFontVar('fontSize.3xl')};
          font-weight: ${this.getFontVar('fontWeight.bold')};
          color: ${this.getColorVar('accent')};
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: ${this.getSpacingVar('2')};
        }
        
        .leadership-showcase .trend-indicator {
          width: 0;
          height: 0;
          border-style: solid;
        }
        
        .leadership-showcase .trend-indicator.up {
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 8px solid ${this.getColorVar('semantic.success')};
        }
        
        .leadership-showcase .trend-indicator.down {
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${this.getColorVar('semantic.error')};
        }
        
        .leadership-showcase .metric-label {
          font-weight: ${this.getFontVar('fontWeight.semibold')};
          margin: ${this.getSpacingVar('2')} 0;
          color: ${this.getColorVar('neutral.700')};
        }
        
        .leadership-showcase .metric-context {
          font-size: ${this.getFontVar('fontSize.sm')};
          color: ${this.getColorVar('neutral.500')};
        }
        
        .leadership-showcase .achievements-list {
          display: grid;
          gap: ${this.getSpacingVar('4')};
          margin: ${this.getSpacingVar('4')} 0;
        }
        
        .leadership-showcase .achievement-card {
          background: ${this.getColorVar('background.primary')};
          padding: ${this.getSpacingVar('4')};
          border-radius: 8px;
          border-left: 3px solid ${this.getColorVar('secondary')};
        }
        
        .leadership-showcase .achievement-description {
          font-weight: ${this.getFontVar('fontWeight.semibold')};
          margin-bottom: ${this.getSpacingVar('2')};
          color: ${this.getColorVar('neutral.800')};
        }
        
        .leadership-showcase .achievement-impact {
          color: ${this.getColorVar('neutral.600')};
          margin-bottom: ${this.getSpacingVar('2')};
          line-height: ${this.getFontVar('lineHeight.relaxed')};
        }
        
        .leadership-showcase .achievement-metrics {
          display: flex;
          gap: ${this.getSpacingVar('2')};
          flex-wrap: wrap;
          margin-top: ${this.getSpacingVar('2')};
        }
        
        .leadership-showcase .metric-badge {
          background: ${this.getColorVar('accent')}20;
          color: ${this.getColorVar('accent')};
          padding: ${this.getSpacingVar('1')} ${this.getSpacingVar('2')};
          border-radius: 999px;
          font-size: ${this.getFontVar('fontSize.xs')};
          font-weight: ${this.getFontVar('fontWeight.medium')};
        }
        
        .leadership-showcase .experience-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: ${this.getSpacingVar('6')};
          margin-top: ${this.getSpacingVar('6')};
          padding-top: ${this.getSpacingVar('6')};
          border-top: 1px solid ${this.getColorVar('neutral.200')};
        }
        
        .leadership-showcase .team-size-visual {
          text-align: center;
          padding: ${this.getSpacingVar('4')};
        }
        
        .leadership-showcase .team-count {
          display: block;
          font-size: ${this.getFontVar('fontSize.3xl')};
          font-weight: ${this.getFontVar('fontWeight.bold')};
          color: ${this.getColorVar('primary')};
        }
        
        .leadership-showcase .industry-tags,
        .leadership-showcase .budget-levels {
          display: flex;
          gap: ${this.getSpacingVar('2')};
          flex-wrap: wrap;
          margin-top: ${this.getSpacingVar('2')};
        }
        
        .leadership-showcase .industry-tag,
        .leadership-showcase .budget-item {
          background: ${this.getColorVar('secondary')}20;
          color: ${this.getColorVar('secondary')};
          padding: ${this.getSpacingVar('1')} ${this.getSpacingVar('3')};
          border-radius: 6px;
          font-size: ${this.getFontVar('fontSize.sm')};
          font-weight: ${this.getFontVar('fontWeight.medium')};
        }
        
        @media (max-width: 768px) {
          .leadership-showcase .metrics-grid {
            grid-template-columns: 1fr;
          }
          
          .leadership-showcase .experience-metrics {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }
}
```

## Responsive Design Specifications

### Breakpoint System

```typescript
// utils/responsive/breakpoint-system.ts

export interface ResponsiveBreakpoints {
  mobile: {
    min: string;    // 0px
    max: string;    // 768px
  };
  tablet: {
    min: string;    // 769px
    max: string;    // 1024px
  };
  desktop: {
    min: string;    // 1025px
    max: string;    // 1440px
  };
  wide: {
    min: string;    // 1441px
    max: string;    // ∞
  };
  print: {
    media: string;  // print
  };
}

export const StandardBreakpoints: ResponsiveBreakpoints = {
  mobile: { min: '0px', max: '768px' },
  tablet: { min: '769px', max: '1024px' },
  desktop: { min: '1025px', max: '1440px' },
  wide: { min: '1441px', max: '9999px' },
  print: { media: 'print' }
};

export class ResponsiveManager {
  static generateMediaQueries(template: CVTemplate): string {
    return `
      /* Mobile First Approach */
      .${template.id} {
        /* Base mobile styles */
        font-size: 14px;
        padding: 1rem;
      }
      
      /* Tablet Styles */
      @media (min-width: 769px) and (max-width: 1024px) {
        .${template.id} {
          font-size: 15px;
          padding: 2rem;
        }
        
        .${template.id} .two-column-layout {
          grid-template-columns: 1fr 2fr;
        }
        
        .${template.id} .metrics-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      
      /* Desktop Styles */
      @media (min-width: 1025px) {
        .${template.id} {
          font-size: 16px;
          padding: 3rem;
        }
        
        .${template.id} .two-column-layout {
          grid-template-columns: 300px 1fr;
        }
        
        .${template.id} .metrics-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
      
      /* Print Styles */
      @media print {
        .${template.id} {
          font-size: 11pt;
          padding: 0.5in;
          background: white !important;
          color: black !important;
        }
        
        .${template.id} .feature-preview {
          border: 1px solid #ccc !important;
          background: white !important;
        }
        
        .${template.id} .no-print {
          display: none !important;
        }
      }
    `;
  }
}
```

## Integration Guidelines

### Template Registration

```typescript
// templates/template-registry-setup.ts

import { TemplateRegistry } from '../utils/template-registry';
import { ExecutiveAuthorityTemplate } from './executive-authority';
import { TechInnovationTemplate } from './tech-innovation';
// ... other template imports

export function registerAllTemplates(): void {
  // Register Executive Templates
  TemplateRegistry.registerTemplate(ExecutiveAuthorityTemplate);
  
  // Register Technical Templates
  TemplateRegistry.registerTemplate(TechInnovationTemplate);
  
  // Register Creative Templates
  TemplateRegistry.registerTemplate(CreativeShowcaseTemplate);
  
  // Register Healthcare Templates
  TemplateRegistry.registerTemplate(HealthcareProfessionalTemplate);
  
  // Register Financial Templates
  TemplateRegistry.registerTemplate(FinancialExpertTemplate);
  
  // Register Academic Templates
  TemplateRegistry.registerTemplate(AcademicScholarTemplate);
  
  // Register Sales Templates
  TemplateRegistry.registerTemplate(SalesPerformanceTemplate);
  
  // Register International Templates
  TemplateRegistry.registerTemplate(InternationalProfessionalTemplate);
}

// Initialize templates on application start
registerAllTemplates();
```

### Template Usage in CVPreviewContent

```typescript
// Integration with existing CVPreviewContent component

// In CVPreviewContent.tsx - updated useMemo for template generation
const generatedHTML = useMemo(() => {
  console.log('🔄 [ENHANCED TEMPLATE] Generating with new template system');
  
  // Check if template exists in new system
  const enhancedTemplate = TemplateRegistry.getTemplate(selectedTemplate);
  
  if (enhancedTemplate) {
    // Use enhanced template system
    return EnhancedCVTemplateGenerator.generateHTML(
      previewData,
      selectedTemplate,
      selectedFeatures,
      qrCodeSettings,
      collapsedSections,
      generateFeaturePreview
    );
  } else {
    // Fallback to legacy system
    return CVTemplateGenerator.generateHTML(
      previewData,
      selectedTemplate,
      selectedFeatures,
      qrCodeSettings,
      collapsedSections,
      generateFeaturePreview
    );
  }
}, [selectedFeaturesString, previewData, selectedTemplate, showFeaturePreviews, qrCodeSettings, collapsedSections, generateFeaturePreview]);
```

This comprehensive component specification provides the foundation for implementing the enhanced CV template design system while maintaining compatibility with the existing CVPlus architecture. The modular approach ensures scalability and maintainability as new templates and components are added to the system.