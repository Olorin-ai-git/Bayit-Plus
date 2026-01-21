// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';
// Note: We implement our own portfolio extraction logic instead of using the service's private methods
import * as admin from 'firebase-admin';

/**
 * Portfolio Gallery Feature - Generates interactive portfolio gallery for CV
 * Converted from legacy HTML generation to React component integration
 */
export class PortfolioGalleryFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    try {
      // Extract portfolio data from CV using existing service logic
      const portfolioData = await this.extractPortfolioData(cv, jobId);
      
      // Generate React component placeholder instead of HTML
      return this.generateReactComponentPlaceholder(jobId, portfolioData, options);
    } catch (error) {
      return this.generateErrorFallback(jobId);
    }
  }
  
  /**
   * Extract portfolio data from CV using existing service methods
   */
  private async extractPortfolioData(cv: ParsedCV, jobId: string): Promise<any> {
    const items: any[] = [];
    const categories = new Set<string>();
    
    // Extract projects from experience using existing service logic
    if (cv.experience) {
      for (const exp of cv.experience) {
        // Extract projects from experience using our own logic
        const projects = await this.extractProjectsFromExperience(exp);
        for (const project of projects) {
          categories.add(project.category);
          items.push(project);
        }
        
        // Create showcase items for major achievements
        if (exp.achievements) {
          for (const achievement of exp.achievements.slice(0, 2)) {
            const achievementItem = await this.createAchievementItem(achievement, exp);
            categories.add(achievementItem.category);
            items.push(achievementItem);
          }
        }
      }
    }
    
    // Add certifications as portfolio items
    if (cv.certifications) {
      for (const cert of cv.certifications) {
        const certItem = {
          id: `cert-${items.length}`,
          type: 'certification',
          title: cert.name,
          description: `Professional certification from ${cert.issuer}`,
          category: 'Certifications',
          tags: this.extractTagsFromCertification(cert),
          date: cert.date ? new Date(cert.date) : undefined,
          links: (cert as any).url ? [{
            type: 'other',
            url: (cert as any).url,
            label: 'View Certificate'
          }] : [],
          visibility: 'public'
        };
        categories.add('Certifications');
        items.push(certItem);
      }
    }
    
    // Extract publications if mentioned
    if (cv.achievements) {
      for (const achievement of cv.achievements) {
        if (this.isPublication(achievement)) {
          const pubItem = await this.createPublicationItem(achievement);
          categories.add(pubItem.category);
          items.push(pubItem);
        }
      }
    }
    
    // Generate placeholder media for items without media
    for (const item of items) {
      if (!item.media || item.media.length === 0) {
        item.media = await this.generatePlaceholderMedia(item);
      }
    }
    
    // Calculate statistics
    const statistics = this.calculateStatistics(items, cv);
    
    // Determine layout
    const layout = this.determineOptimalLayout(items);
    
    // Generate branding
    const branding = await this.generateBranding(cv);
    
    return {
      items: items.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)),
      categories: Array.from(categories),
      statistics,
      layout,
      branding
    };
  }
  
  /**
   * Generate React component placeholder for modern CV rendering
   */
  private generateReactComponentPlaceholder(jobId: string, portfolioData: any, options?: any): string {
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      data: portfolioData,
      isEnabled: true,
      customization: {
        viewMode: options?.viewMode || 'grid',
        showStatistics: options?.showStatistics !== false,
        enableLightbox: options?.enableLightbox !== false,
        itemsPerPage: options?.itemsPerPage || 12,
        showCategories: options?.showCategories !== false,
        enableSharing: options?.enableSharing !== false,
        theme: options?.theme || 'auto'
      },
      className: 'cv-portfolio-gallery',
      mode: 'public'
    };
    
    return `
      <div class="cv-feature-container portfolio-gallery-feature">
        <div class="react-component-placeholder" 
             data-component="PortfolioGallery" 
             data-props='${JSON.stringify(componentProps).replace(/'/g, "&apos;")}'>
          <!-- React PortfolioGallery component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading portfolio gallery...</p>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Generate error fallback when portfolio generation fails
   */
  private generateErrorFallback(jobId: string): string {
    return `
      <div class="cv-feature-container portfolio-gallery-feature error-state">
        <div class="error-message">
          <h3>Portfolio Gallery Unavailable</h3>
          <p>Unable to generate portfolio gallery at this time.</p>
        </div>
      </div>
    `;
  }
  
  // Helper methods extracted from portfolio-gallery.service.ts
  
  private extractTagsFromCertification(cert: any): string[] {
    const tags: string[] = [];
    
    const techKeywords = [
      'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes',
      'Python', 'Java', 'JavaScript', 'React', 'Angular', 'Vue',
      'Machine Learning', 'AI', 'Data Science', 'Security',
      'Scrum', 'Agile', 'PMP', 'DevOps', 'Cloud', 'Database'
    ];
    
    const certName = cert.name.toLowerCase();
    for (const keyword of techKeywords) {
      if (certName.includes(keyword.toLowerCase())) {
        tags.push(keyword);
      }
    }
    
    if (tags.length === 0) {
      tags.push('Professional Certification');
    }
    
    return tags;
  }
  
  private isPublication(text: string): boolean {
    const publicationKeywords = [
      'published', 'publication', 'paper', 'article', 'journal',
      'conference', 'proceedings', 'authored', 'co-authored',
      'research', 'study', 'whitepaper'
    ];
    
    const lowerText = text.toLowerCase();
    return publicationKeywords.some(keyword => lowerText.includes(keyword));
  }
  
  private async createPublicationItem(text: string): Promise<any> {
    return {
      id: `publication-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'publication',
      title: this.extractPublicationTitle(text),
      description: text,
      category: 'Publications',
      tags: this.extractResearchTopics(text),
      date: this.extractDateFromText(text),
      visibility: 'public'
    };
  }
  
  private async generatePlaceholderMedia(item: any): Promise<any[]> {
    const placeholderConfig: Record<string, any> = {
      project: {
        background: '#1E40AF',
        icon: '💻',
        template: 'project-showcase'
      },
      achievement: {
        background: '#059669',
        icon: '🏆',
        template: 'achievement-card'
      },
      certification: {
        background: '#7C3AED',
        icon: '📜',
        template: 'certificate-frame'
      },
      publication: {
        background: '#DC2626',
        icon: '📚',
        template: 'publication-cover'
      },
      presentation: {
        background: '#F59E0B',
        icon: '🎤',
        template: 'slide-preview'
      }
    };
    
    const config = placeholderConfig[item.type] || placeholderConfig.project;
    
    const svgPlaceholder = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="600" fill="${config.background}"/>
        <text x="400" y="250" font-family="Arial, sans-serif" font-size="60" fill="white" text-anchor="middle">
          ${config.icon}
        </text>
        <text x="400" y="350" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">
          ${item.title}
        </text>
        <text x="400" y="400" font-family="Arial, sans-serif" font-size="20" fill="white" opacity="0.8" text-anchor="middle">
          ${item.category}
        </text>
      </svg>
    `;
    
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgPlaceholder).toString('base64')}`;
    
    return [{
      type: 'image',
      url: dataUrl,
      thumbnail: dataUrl,
      caption: `${item.type} showcase`
    }];
  }
  
  private calculateStatistics(items: any[], cv: ParsedCV): any {
    const allTechnologies = new Set<string>();
    const impactMetrics = new Map<string, number>();
    
    // Collect all technologies
    for (const item of items) {
      if (item.technologies) {
        item.technologies.forEach((tech: string) => allTechnologies.add(tech));
      }
      if (item.tags) {
        item.tags.forEach((tag: string) => allTechnologies.add(tag));
      }
      
      // Aggregate impact metrics
      if (item.impact) {
        for (const impact of item.impact) {
          const current = impactMetrics.get(impact.metric) || 0;
          const value = this.parseImpactValue(impact.value);
          impactMetrics.set(impact.metric, current + value);
        }
      }
    }
    
    // Calculate year span
    const dates = items
      .filter(item => item.date)
      .map(item => item.date.getFullYear());
    const minYear = Math.min(...dates, new Date().getFullYear());
    const maxYear = Math.max(...dates, new Date().getFullYear());
    
    // Format aggregated impact metrics
    const formattedImpactMetrics = Array.from(impactMetrics.entries())
      .map(([metric, value]) => ({
        metric,
        total: this.formatImpactValue(value, metric)
      }))
      .slice(0, 5); // Top 5 metrics
    
    return {
      totalProjects: items.filter(i => i.type === 'project').length,
      totalTechnologies: allTechnologies.size,
      yearsSpanned: maxYear - minYear + 1,
      impactMetrics: formattedImpactMetrics
    };
  }
  
  private determineOptimalLayout(items: any[]): any {
    let style: 'grid' | 'timeline' | 'showcase' = 'grid';
    
    if (items.length > 15) {
      style = 'grid'; // Grid for many items
    } else if (items.every(item => item.date)) {
      style = 'timeline'; // Timeline if all items have dates
    } else if (items.length <= 6) {
      style = 'showcase'; // Showcase for few, high-impact items
    }
    
    // Select featured items (highest impact or most recent)
    const featuredItems = items
      .filter(item => item.impact && item.impact.length > 0)
      .sort((a, b) => {
        const aImpact = a.impact?.[0]?.value || '0';
        const bImpact = b.impact?.[0]?.value || '0';
        return this.parseImpactValue(bImpact) - this.parseImpactValue(aImpact);
      })
      .slice(0, 3)
      .map(item => item.id);
    
    // Add recent items if not enough featured
    if (featuredItems.length < 3) {
      const recentItems = items
        .filter(item => !featuredItems.includes(item.id))
        .slice(0, 3 - featuredItems.length)
        .map(item => item.id);
      featuredItems.push(...recentItems);
    }
    
    return {
      style,
      featuredItems,
      order: 'chronological'
    };
  }
  
  private async generateBranding(cv: ParsedCV): Promise<any> {
    // Determine color scheme based on industry/role
    const role = cv.experience?.[0]?.position?.toLowerCase() || '';
    const skills = this.getTechnicalSkills(cv.skills)?.join(' ').toLowerCase() || '';
    
    let primaryColor = '#1E40AF'; // Default blue
    let accentColor = '#3B82F6';
    
    if (role.includes('design') || skills.includes('design')) {
      primaryColor = '#7C3AED'; // Purple for designers
      accentColor = '#A78BFA';
    } else if (role.includes('data') || skills.includes('machine learning')) {
      primaryColor = '#059669'; // Green for data/ML
      accentColor = '#10B981';
    } else if (role.includes('manager') || role.includes('director')) {
      primaryColor = '#DC2626'; // Red for leadership
      accentColor = '#EF4444';
    } else if (skills.includes('blockchain') || skills.includes('crypto')) {
      primaryColor = '#F59E0B'; // Amber for blockchain
      accentColor = '#FCD34D';
    }
    
    return {
      primaryColor,
      accentColor,
      font: 'Inter' // Modern, professional font
    };
  }
  
  // Additional helper methods
  
  private getTechnicalSkills(skills: string[] | { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    return skills.technical || [];
  }
  
  private extractPublicationTitle(text: string): string {
    // Try to extract quoted title
    const quotedMatch = text.match(/"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[1];
    }
    
    // Otherwise, take the first meaningful part
    const firstPeriod = text.indexOf('.');
    const cutoff = firstPeriod > 0 && firstPeriod < 50 ? firstPeriod : 50;
    return text.substring(0, cutoff) + (text.length > cutoff ? '...' : '');
  }
  
  private extractResearchTopics(text: string): string[] {
    const topics: string[] = [];
    const topicKeywords = [
      'machine learning', 'artificial intelligence', 'deep learning',
      'computer vision', 'natural language processing', 'nlp',
      'distributed systems', 'blockchain', 'security',
      'data science', 'analytics', 'optimization',
      'algorithms', 'performance', 'scalability'
    ];
    
    const lowerText = text.toLowerCase();
    for (const keyword of topicKeywords) {
      if (lowerText.includes(keyword)) {
        topics.push(keyword.split(' ').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1)
        ).join(' '));
      }
    }
    
    return topics.slice(0, 5); // Max 5 topics
  }
  
  private extractDateFromText(text: string): Date | undefined {
    const patterns = [
      /\b(\d{4})\b/,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
      /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return new Date(match[0]);
      }
    }
    
    return undefined;
  }
  
  private parseImpactValue(value: string): number {
    // Remove currency symbols and convert K/M/B
    const cleaned = value.replace(/[$,]/g, '');
    const multipliers: Record<string, number> = {
      'K': 1000,
      'M': 1000000,
      'B': 1000000000
    };
    
    for (const [suffix, multiplier] of Object.entries(multipliers)) {
      if (cleaned.endsWith(suffix)) {
        return parseFloat(cleaned.slice(0, -1)) * multiplier;
      }
    }
    
    // Handle percentages
    if (cleaned.endsWith('%')) {
      return parseFloat(cleaned.slice(0, -1));
    }
    
    // Handle multipliers (e.g., "5x")
    if (cleaned.endsWith('x')) {
      return parseFloat(cleaned.slice(0, -1));
    }
    
    return parseFloat(cleaned) || 0;
  }
  
  private formatImpactValue(value: number, metric: string): string {
    if (metric.toLowerCase().includes('dollar') || metric.toLowerCase().includes('revenue') || metric.toLowerCase().includes('cost')) {
      // Format as currency
      if (value >= 1000000000) {
        return `$${(value / 1000000000).toFixed(1)}B`;
      } else if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      } else {
        return `$${value.toFixed(0)}`;
      }
    } else if (metric.toLowerCase().includes('percent')) {
      return `${value.toFixed(0)}%`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    } else {
      return value.toFixed(0);
    }
  }
  
  /**
   * Extract projects from work experience
   */
  private async extractProjectsFromExperience(exp: any): Promise<any[]> {
    const projects: any[] = [];
    
    // For now, create a simple project entry from experience data
    // In production, this could use AI to extract specific projects
    if (exp.description || (exp.achievements && exp.achievements.length > 0)) {
      const projectTitle = this.extractProjectTitle(exp);
      const projectDescription = this.createProjectDescription(exp);
      
      projects.push({
        id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'project',
        title: projectTitle,
        description: projectDescription,
        category: this.categorizeProject({ title: projectTitle, description: projectDescription }),
        tags: this.extractTechnologiesFromText(projectDescription),
        date: exp.startDate ? new Date(exp.startDate) : undefined,
        duration: this.calculateDuration(exp.startDate, exp.endDate),
        role: exp.position,
        technologies: this.extractTechnologiesFromText(projectDescription),
        impact: this.extractImpactFromExperience(exp),
        visibility: 'public'
      });
    }
    
    return projects;
  }
  
  /**
   * Create achievement portfolio item
   */
  private async createAchievementItem(achievement: string, exp: any): Promise<any> {
    const impact = this.extractImpactMetrics(achievement);
    
    return {
      id: `achievement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'achievement',
      title: this.extractAchievementTitle(achievement),
      description: achievement,
      category: 'Achievements',
      tags: this.extractTechnologiesFromText(achievement),
      date: exp.startDate ? new Date(exp.startDate) : undefined,
      role: exp.position,
      impact,
      visibility: 'public'
    };
  }
  
  // Additional helper methods for project extraction
  
  private extractProjectTitle(exp: any): string {
    // Try to extract a project name from position or description
    if (exp.position) {
      return `${exp.position} at ${exp.company || 'Company'}`;
    }
    return `Project at ${exp.company || 'Company'}`;
  }
  
  private createProjectDescription(exp: any): string {
    let description = exp.description || '';
    
    if (exp.achievements && exp.achievements.length > 0) {
      description += (description ? ' ' : '') + exp.achievements.join('. ');
    }
    
    return description || `Professional work experience at ${exp.company}`;
  }
  
  private categorizeProject(project: any): string {
    const title = project.title?.toLowerCase() || '';
    const desc = project.description?.toLowerCase() || '';
    const combined = `${title} ${desc}`;
    
    if (combined.includes('web') || combined.includes('website') || combined.includes('frontend')) {
      return 'Web Development';
    } else if (combined.includes('mobile') || combined.includes('app') || combined.includes('ios') || combined.includes('android')) {
      return 'Mobile Development';
    } else if (combined.includes('data') || combined.includes('analytics') || combined.includes('ml') || combined.includes('ai')) {
      return 'Data & AI';
    } else if (combined.includes('infrastructure') || combined.includes('devops') || combined.includes('cloud')) {
      return 'Infrastructure';
    } else if (combined.includes('api') || combined.includes('backend') || combined.includes('service')) {
      return 'Backend Development';
    } else {
      return 'Software Development';
    }
  }
  
  private calculateDuration(startDate?: string, endDate?: string): string | undefined {
    if (!startDate) return undefined;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                   (end.getMonth() - start.getMonth());
    
    if (months < 12) {
      return `${months} months`;
    } else {
      const years = Math.floor(months / 12);
      return `${years} year${years > 1 ? 's' : ''}`;
    }
  }
  
  private extractTechnologiesFromText(text: string): string[] {
    const technologies: string[] = [];
    const techPatterns = [
      /\b(React|Angular|Vue|Next\.js|Node\.js|Express|Django|Flask|Rails)\b/gi,
      /\b(Python|JavaScript|TypeScript|Java|C\+\+|Go|Rust|Swift|Kotlin)\b/gi,
      /\b(AWS|Azure|GCP|Docker|Kubernetes|Terraform|Jenkins)\b/gi,
      /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch)\b/gi,
      /\b(TensorFlow|PyTorch|Scikit-learn|Pandas|NumPy)\b/gi
    ];
    
    for (const pattern of techPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (!technologies.includes(match[1])) {
          technologies.push(match[1]);
        }
      }
    }
    
    return technologies;
  }
  
  private extractImpactFromExperience(exp: any): any[] {
    const impact: any[] = [];
    
    if (exp.achievements) {
      for (const achievement of exp.achievements) {
        const metrics = this.extractImpactMetrics(achievement);
        impact.push(...metrics);
      }
    }
    
    return impact;
  }
  
  private extractImpactMetrics(text: string): any[] {
    const metrics: any[] = [];
    
    // Patterns for extracting metrics
    const patterns = [
      /increased\s+(.+?)\s+by\s+(\d+%)/gi,
      /reduced\s+(.+?)\s+by\s+(\d+%)/gi,
      /improved\s+(.+?)\s+by\s+(\d+%)/gi,
      /saved\s+(\$[\d,]+(?:\.\d+)?[KMB]?)/gi,
      /generated\s+(\$[\d,]+(?:\.\d+)?[KMB]?)/gi,
      /([\d,]+)\s+(users|customers|clients|downloads|views)/gi,
      /(\d+x)\s+(.+)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[2]) {
          metrics.push({
            metric: match[1],
            value: match[2]
          });
        } else if (match[1]) {
          metrics.push({
            metric: 'Impact',
            value: match[1]
          });
        }
      }
    }
    
    return metrics;
  }
  
  private extractAchievementTitle(achievement: string): string {
    // Take first 50 characters or until first period
    const firstPeriod = achievement.indexOf('.');
    const cutoff = firstPeriod > 0 && firstPeriod < 50 ? firstPeriod : 50;
    return achievement.substring(0, cutoff) + (achievement.length > cutoff ? '...' : '');
  }
  
  /**
   * Get CSS styles for the feature
   */
  getStyles(): string {
    return `
      .cv-feature-container.portfolio-gallery-feature {
        margin: 2rem 0;
        border-radius: 0.5rem;
        overflow: hidden;
      }
      
      .portfolio-gallery-feature .component-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        background: #f8fafc;
        border: 2px dashed #cbd5e1;
        border-radius: 0.5rem;
      }
      
      .portfolio-gallery-feature .loading-spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      .portfolio-gallery-feature .error-state {
        padding: 2rem;
        text-align: center;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 0.5rem;
      }
      
      .portfolio-gallery-feature .error-message h3 {
        color: #dc2626;
        margin-bottom: 0.5rem;
      }
      
      .portfolio-gallery-feature .error-message p {
        color: #7f1d1d;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @media (max-width: 768px) {
        .cv-feature-container.portfolio-gallery-feature {
          margin: 1rem 0;
        }
        
        .portfolio-gallery-feature .component-loading {
          padding: 2rem 1rem;
        }
      }
    `;
  }
  
  /**
   * Get JavaScript scripts for the feature
   */
  getScripts(): string {
    return `
      // Portfolio Gallery Feature Scripts
      (function() {
        // Initialize portfolio gallery when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initPortfolioGallery);
        } else {
          initPortfolioGallery();
        }
        
        function initPortfolioGallery() {
          const portfolioContainers = document.querySelectorAll('.portfolio-gallery-feature .react-component-placeholder');
          
          portfolioContainers.forEach(container => {
            // Add accessibility attributes
            container.setAttribute('role', 'region');
            container.setAttribute('aria-label', 'Portfolio Gallery');
            
            // Add keyboard navigation support
            container.addEventListener('keydown', handleKeyNavigation);
          });
        }
        
        function handleKeyNavigation(event) {
          // Portfolio gallery specific keyboard navigation will be handled by React component
          // This is just a placeholder for any additional keyboard shortcuts
          if (event.key === 'Enter' || event.key === ' ') {
            // Focus management will be handled by React component
            event.preventDefault();
          }
        }
        
        // Export utility functions for React component integration
        window.PortfolioGalleryUtils = {
          scrollToGallery: function(galleryId) {
            const gallery = document.getElementById('contact-form-' + galleryId);
            if (gallery) {
              gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          },
          
          trackInteraction: function(action, data) {
            // Analytics tracking for portfolio interactions
            if (typeof gtag !== 'undefined') {
              gtag('event', 'portfolio_interaction', {
                event_category: 'Portfolio',
                event_label: action,
                custom_parameter: data
              });
            }
          }
        };
      })();
    `;
  }
}