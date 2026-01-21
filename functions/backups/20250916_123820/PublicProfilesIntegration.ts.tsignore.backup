// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Public Profiles Integration for CV Processing
 *
 * Provides integration layer for public profile features from @cvplus/public-profiles submodule.
 * Uses dependency injection pattern to avoid direct dependencies between same-layer modules.
 */

import { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';

// Integration types for public profiles
export interface PublicProfileProvider {
  createSocialLinksFeature(): CVFeature;
  createPortfolioGalleryFeature(): CVFeature;
  createPortalIntegrationService(): any;
}

export type PublicProfileFeatureType = 'social-links' | 'portfolio-gallery' | 'portal-integration';

/**
 * Integration layer for public profile features
 */
export class PublicProfilesIntegration {
  private static provider: PublicProfileProvider | null = null;

  /**
   * Set the public profiles provider (called by root application during startup)
   */
  static setProvider(provider: PublicProfileProvider): void {
    this.provider = provider;
  }

  /**
   * Get feature instance from public profiles submodule
   */
  static getFeature(featureType: PublicProfileFeatureType): CVFeature | null {
    if (!this.provider) {
      return null;
    }

    try {
      switch (featureType) {
        case 'social-links':
          return this.provider.createSocialLinksFeature();
        case 'portfolio-gallery':
          return this.provider.createPortfolioGalleryFeature();
        default:
          return null;
      }
    } catch (error) {
      console.warn(`Failed to create public profile feature ${featureType}:`, error);
      return null;
    }
  }

  /**
   * Get portal integration service
   */
  static getPortalIntegrationService(): any {
    if (!this.provider) {
      return null;
    }

    try {
      return this.provider.createPortalIntegrationService();
    } catch (error) {
      console.warn('Failed to create portal integration service:', error);
      return null;
    }
  }

  /**
   * Create wrapper feature that delegates to public profiles submodule
   */
  static createFeatureWrapper(featureType: PublicProfileFeatureType): CVFeature | null {
    const feature = this.getFeature(featureType);
    if (feature) {
      return feature;
    }

    // Return fallback feature if provider not available
    return new PublicProfileFallbackFeature(featureType);
  }

  /**
   * Check if provider is available
   */
  static isProviderAvailable(): boolean {
    return this.provider !== null;
  }
}

/**
 * Fallback feature for when public profiles submodule is not available
 */
export class PublicProfileFallbackFeature implements CVFeature {
  constructor(private featureType: PublicProfileFeatureType) {}

  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    return this.generateFallbackContent(cv, options);
  }

  private generateFallbackContent(cv: ParsedCV, options?: any): string {
    switch (this.featureType) {
      case 'social-links':
        return this.generateSocialLinksFallback(cv, options);
      case 'portfolio-gallery':
        return this.generatePortfolioFallback(cv, options);
      default:
        return this.generateGenericFallback(options);
    }
  }

  private generateSocialLinksFallback(cv: ParsedCV, options?: any): string {
    const socialData = cv.personalInfo?.contact || {};
    return `
      <div class="cv-feature-container social-links-fallback">
        <div class="fallback-content">
          <h3>${options?.title || 'Professional Profiles'}</h3>
          <p>Connect with me through professional networks</p>
          <div class="contact-info">
            ${socialData.email ? `<p>📧 Email: ${socialData.email}</p>` : ''}
            ${socialData.phone ? `<p>📱 Phone: ${socialData.phone}</p>` : ''}
            ${socialData.website ? `<p>🌐 Website: ${socialData.website}</p>` : ''}
          </div>
          <small>Interactive social links require the public profiles module</small>
        </div>
      </div>
    `;
  }

  private generatePortfolioFallback(cv: ParsedCV, options?: any): string {
    const projects = cv.projects || [];
    return `
      <div class="cv-feature-container portfolio-fallback">
        <div class="fallback-content">
          <h3>${options?.title || 'Portfolio'}</h3>
          <p>Professional projects and achievements</p>
          <div class="projects-list">
            ${projects.slice(0, 3).map(project =>
              `<div class="project-item">
                <h4>${project.title || 'Project'}</h4>
                <p>${project.description || ''}</p>
              </div>`
            ).join('')}
          </div>
          <small>Interactive portfolio gallery requires the public profiles module</small>
        </div>
      </div>
    `;
  }

  private generateGenericFallback(options?: any): string {
    return `
      <div class="cv-feature-container public-profile-fallback">
        <div class="fallback-content">
          <h3>${options?.title || 'Public Profile Feature'}</h3>
          <p>This feature is provided by the public profiles module</p>
          <small>Interactive features require the public profiles module to be available</small>
        </div>
      </div>
    `;
  }

  getStyles(): string {
    return `
      .cv-feature-container.social-links-fallback,
      .cv-feature-container.portfolio-fallback,
      .cv-feature-container.public-profile-fallback {
        margin: 1.5rem 0;
        padding: 1.5rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }

      .fallback-content h3 {
        color: #1e293b;
        margin: 0 0 0.5rem 0;
        font-size: 1.25rem;
      }

      .fallback-content p {
        color: #64748b;
        margin: 0 0 1rem 0;
      }

      .contact-info p {
        margin: 0.5rem 0;
        color: #374151;
      }

      .projects-list .project-item {
        background: white;
        padding: 1rem;
        margin: 0.75rem 0;
        border-radius: 6px;
        border-left: 4px solid #06b6d4;
      }

      .project-item h4 {
        margin: 0 0 0.5rem 0;
        color: #1e293b;
      }

      .fallback-content small {
        color: #9ca3af;
        font-style: italic;
      }
    `;
  }

  getScripts(): string {
    return `
      // Public profile fallback - no interactive functionality
      console.info('Public profile features are running in fallback mode');
    `;
  }
}