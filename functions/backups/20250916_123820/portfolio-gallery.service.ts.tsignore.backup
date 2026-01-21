// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Portfolio Gallery Service
 * Creates visual showcases for projects and achievements
 */

import { ParsedCV } from '../types/enhanced-models';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
// import axios from 'axios'; // Commented out unused import
import { config } from '../config/environment';

interface PortfolioItem {
  id: string;
  type: 'project' | 'achievement' | 'certification' | 'publication' | 'presentation';
  title: string;
  description: string;
  category: string;
  tags: string[];
  date?: Date;
  duration?: string;
  role?: string;
  technologies?: string[];
  impact?: {
    metric: string;
    value: string;
  }[];
  media?: {
    type: 'image' | 'video' | 'document' | 'link';
    url: string;
    thumbnail?: string;
    caption?: string;
  }[];
  links?: {
    type: 'github' | 'website' | 'demo' | 'documentation' | 'other';
    url: string;
    label: string;
  }[];
  collaborators?: string[];
  visibility: 'public' | 'private' | 'unlisted';
}

interface PortfolioGallery {
  items: PortfolioItem[];
  categories: string[];
  statistics: {
    totalProjects: number;
    totalTechnologies: number;
    yearsSpanned: number;
    impactMetrics: {
      metric: string;
      total: string;
    }[];
  };
  layout: {
    style: 'grid' | 'timeline' | 'showcase';
    featuredItems: string[];
    order: 'chronological' | 'category' | 'impact';
  };
  branding: {
    primaryColor: string;
    accentColor: string;
    font: string;
  };
}

export class PortfolioGalleryService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY || ''
    });
  }
  
  /**
   * Generate portfolio gallery from CV data
   */
  async generatePortfolioGallery(parsedCV: ParsedCV, jobId: string): Promise<PortfolioGallery> {
    const items: PortfolioItem[] = [];
    const categories = new Set<string>();
    
    // Extract projects from experience
    if (parsedCV.experience) {
      for (const exp of parsedCV.experience) {
        // Extract projects from achievements and descriptions
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
    if (parsedCV.certifications) {
      for (const cert of parsedCV.certifications) {
        const certItem: PortfolioItem = {
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
    if (parsedCV.achievements) {
      for (const achievement of parsedCV.achievements) {
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
    const statistics = this.calculateStatistics(items, parsedCV);
    
    // Determine layout
    const layout = this.determineOptimalLayout(items);
    
    // Generate branding
    const branding = await this.generateBranding(parsedCV);
    
    const gallery: PortfolioGallery = {
      items: items.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)),
      categories: Array.from(categories),
      statistics,
      layout,
      branding
    };
    
    // Store gallery data
    await this.storeGalleryData(jobId, gallery);
    
    return gallery;
  }

  /**
   * Get technical skills from skills union type
   */
  private getTechnicalSkills(skills: string[] | { [key: string]: string[]; technical?: string[]; soft?: string[]; languages?: string[]; tools?: string[]; frontend?: string[]; backend?: string[]; databases?: string[]; cloud?: string[]; competencies?: string[]; frameworks?: string[]; expertise?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    return skills.technical || [];
  }
  
  /**
   * Extract projects from work experience
   */
  private async extractProjectsFromExperience(exp: any): Promise<PortfolioItem[]> {
    const projects: PortfolioItem[] = [];
    
    // Use AI to extract project information
    const prompt = `Extract specific projects from this work experience. Return as JSON array.
    
Position: ${exp.position}
Company: ${exp.company}
Description: ${exp.description || ''}
Achievements: ${(exp.achievements || []).join('. ')}

Look for:
- Specific named projects or initiatives
- Product launches or feature development
- System implementations or migrations
- Research projects or studies

For each project, extract:
- title: Project name
- description: What was done
- impact: Quantifiable results
- technologies: Tech stack used

Return empty array if no specific projects found.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional portfolio analyzer. Extract project information and return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.choices[0].message?.content || '{"projects":[]}');
      const extractedProjects = result.projects || [];
      
      for (const proj of extractedProjects) {
        projects.push({
          id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'project',
          title: proj.title,
          description: proj.description,
          category: this.categorizeProject(proj),
          tags: proj.technologies || [],
          date: exp.startDate ? new Date(exp.startDate) : undefined,
          duration: this.calculateDuration(exp.startDate, exp.endDate),
          role: exp.position,
          technologies: proj.technologies || [],
          impact: proj.impact ? [{
            metric: 'Result',
            value: proj.impact
          }] : [],
          visibility: 'public'
        });
      }
    } catch (error) {
    }
    
    return projects;
  }
  
  /**
   * Create achievement portfolio item
   */
  private async createAchievementItem(achievement: string, exp: any): Promise<PortfolioItem> {
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
  
  /**
   * Check if text describes a publication
   */
  private isPublication(text: string): boolean {
    const publicationKeywords = [
      'published', 'publication', 'paper', 'article', 'journal',
      'conference', 'proceedings', 'authored', 'co-authored',
      'research', 'study', 'whitepaper'
    ];
    
    const lowerText = text.toLowerCase();
    return publicationKeywords.some(keyword => lowerText.includes(keyword));
  }
  
  /**
   * Create publication portfolio item
   */
  private async createPublicationItem(text: string): Promise<PortfolioItem> {
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
  
  /**
   * Generate placeholder media for portfolio items
   */
  private async generatePlaceholderMedia(item: PortfolioItem): Promise<PortfolioItem['media']> {
    // In production, this could integrate with services like:
    // - Bannerbear for dynamic image generation
    // - Placid for template-based graphics
    // - Carbon for code screenshots
    
    const media: PortfolioItem['media'] = [];
    
    // Generate a placeholder image based on item type
    const placeholderConfig = {
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
    
    const config = placeholderConfig[item.type];
    
    // Create a data URL for a simple SVG placeholder
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
    
    media.push({
      type: 'image',
      url: dataUrl,
      thumbnail: dataUrl,
      caption: `${item.type} showcase`
    });
    
    return media;
  }
  
  /**
   * Calculate portfolio statistics
   */
  private calculateStatistics(items: PortfolioItem[], cv: ParsedCV): PortfolioGallery['statistics'] {
    const allTechnologies = new Set<string>();
    const impactMetrics = new Map<string, number>();
    
    // Collect all technologies
    for (const item of items) {
      if (item.technologies) {
        item.technologies.forEach(tech => allTechnologies.add(tech));
      }
      if (item.tags) {
        item.tags.forEach(tag => allTechnologies.add(tag));
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
      .map(item => item.date!.getFullYear());
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
  
  /**
   * Determine optimal layout for gallery
   */
  private determineOptimalLayout(items: PortfolioItem[]): PortfolioGallery['layout'] {
    // Determine best layout style based on content
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
  
  /**
   * Generate branding based on CV
   */
  private async generateBranding(cv: ParsedCV): Promise<PortfolioGallery['branding']> {
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
  
  /**
   * Helper methods
   */
  
  private extractTagsFromCertification(cert: any): string[] {
    const tags: string[] = [];
    
    // Extract technology/skill from certification name
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
  
  private extractImpactMetrics(text: string): PortfolioItem['impact'] {
    const metrics: PortfolioItem['impact'] = [];
    
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
  
  private extractPublicationTitle(text: string): string {
    // Try to extract quoted title
    const quotedMatch = text.match(/"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[1];
    }
    
    // Otherwise, take the first meaningful part
    return this.extractAchievementTitle(text);
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
   * Store gallery data in Firestore
   */
  private async storeGalleryData(jobId: string, gallery: PortfolioGallery): Promise<void> {
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'enhancedFeatures.portfolio': {
          enabled: true,
          status: 'completed',
          data: gallery,
          generatedAt: FieldValue.serverTimestamp()
        }
      });
  }
  
  /**
   * Generate shareable portfolio page
   */
  async generateShareablePortfolio(
    jobId: string,
    customDomain?: string
  ): Promise<{ url: string; embedCode: string }> {
    // Generate unique portfolio URL
    const portfolioId = `portfolio-${jobId}`;
    const baseUrl = customDomain || 'https://cvplus.com/portfolio';
    const url = `${baseUrl}/${portfolioId}`;
    
    // Generate embed code for websites
    const embedCode = `<iframe 
  src="${url}/embed" 
  width="100%" 
  height="800" 
  frameborder="0" 
  title="Professional Portfolio"
></iframe>`;
    
    // Update job with portfolio URL
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'enhancedFeatures.portfolio.shareableUrl': url,
        'enhancedFeatures.portfolio.embedCode': embedCode
      });
    
    return { url, embedCode };
  }
}

export const portfolioGalleryService = new PortfolioGalleryService();