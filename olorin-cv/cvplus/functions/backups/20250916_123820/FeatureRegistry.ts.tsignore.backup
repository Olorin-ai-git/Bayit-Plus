// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature, FeatureType, InteractiveFeatureResult } from '../types';
import { ParsedCV } from '../../cvParser';
import { MultimediaIntegration, MultimediaFallbackFeature } from '../integrations/MultimediaIntegration';
import { ContactFormFeature } from './ContactFormFeature';
import { PublicProfilesIntegration, PublicProfileFallbackFeature } from '../integrations/PublicProfilesIntegration';
import { PersonalBrandingFeature } from './PersonalBrandingFeature';
import { CertificationBadgesFeature } from './CertificationBadgesFeature';
import { TestimonialsCarouselFeature } from './TestimonialsCarouselFeature';
import { CalendarFeature } from './CalendarFeature';
import { InteractiveTimelineFeature } from './InteractiveTimelineFeature';
import { AchievementsShowcaseFeature } from './AchievementsShowcaseFeature';

/**
 * Feature registry for managing CV interactive features
 * Implements factory pattern for feature creation and orchestration
 */
export class FeatureRegistry {
  private static features: Map<FeatureType, CVFeature> = new Map();

  /**
   * Generate all requested features for a CV
   */
  static async generateFeatures(
    cv: ParsedCV, 
    jobId: string, 
    requestedFeatures: FeatureType[]
  ): Promise<InteractiveFeatureResult> {
    const result: InteractiveFeatureResult = {};
    let combinedStyles = '';
    let combinedScripts = '';

    for (const featureType of requestedFeatures) {
      const feature = this.getFeature(featureType);
      if (feature) {
        try {
          const content = await feature.generate(cv, jobId);
          const styles = feature.getStyles();
          const scripts = feature.getScripts();

          // Map feature type to result property
          this.assignFeatureContent(result, featureType, content);
          
          if (styles) {
            combinedStyles += '\n' + styles;
          }
          
          if (scripts) {
            combinedScripts += '\n' + scripts;
          }
        } catch (error) {
          // Continue with other features even if one fails
        }
      }
    }

    // Set combined styles and scripts
    if (combinedStyles) {
      result.additionalStyles = combinedStyles;
    }
    
    if (combinedScripts) {
      result.additionalScripts = combinedScripts;
    }

    return result;
  }

  /**
   * Get feature instance by type
   */
  private static getFeature(type: FeatureType): CVFeature | null {
    if (!this.features.has(type)) {
      const feature = this.createFeature(type);
      if (feature) {
        this.features.set(type, feature);
      }
    }
    
    return this.features.get(type) || null;
  }

  /**
   * Create feature instance by type
   */
  private static createFeature(type: FeatureType): CVFeature | null {
    switch (type) {
      // Multimedia features - delegated to multimedia submodule
      case 'embed-qr-code':
        return MultimediaIntegration.createFeatureWrapper('embed-qr-code') ||
               new MultimediaFallbackFeature('embed-qr-code');
      case 'generate-podcast':
        return MultimediaIntegration.createFeatureWrapper('generate-podcast') ||
               new MultimediaFallbackFeature('generate-podcast');
      case 'video-introduction':
        return MultimediaIntegration.createFeatureWrapper('video-introduction') ||
               new MultimediaFallbackFeature('video-introduction');
      case 'portfolio-gallery':
        return MultimediaIntegration.createFeatureWrapper('portfolio-gallery') ||
               new MultimediaFallbackFeature('portfolio-gallery');

      // CV-processing native features
      case 'contact-form':
        return new ContactFormFeature();
      case 'social-media-links':
        return PublicProfilesIntegration.createFeatureWrapper('social-links') ||
               new PublicProfileFallbackFeature('social-links');
      case 'personality-insights':
        return new PersonalBrandingFeature();
      case 'certification-badges':
        return new CertificationBadgesFeature();
      case 'testimonials-carousel':
        return new TestimonialsCarouselFeature();
      case 'calendar-integration':
        return new CalendarFeature();
      case 'interactive-timeline':
        return new InteractiveTimelineFeature();
      case 'achievements-showcase':
        return new AchievementsShowcaseFeature();

      case 'privacy-mode':
        // Privacy mode is handled at the data level, not as injected content
        return null;

      // Placeholder for other features - to be implemented
      case 'skills-visualization':
      case 'language-proficiency':
        return null;

      default:
        return null;
    }
  }

  /**
   * Assign generated content to the appropriate result property
   */
  private static assignFeatureContent(
    result: InteractiveFeatureResult, 
    featureType: FeatureType, 
    content: string
  ): void {
    switch (featureType) {
      case 'embed-qr-code':
        result.qrCode = content;
        break;
      case 'generate-podcast':
        result.podcastPlayer = content;
        break;
      case 'interactive-timeline':
        result.timeline = content;
        break;
      case 'skills-visualization':
        result.skillsChart = content;
        break;
      case 'social-media-links':
        result.socialLinks = content;
        break;
      case 'contact-form':
        result.contactForm = content;
        break;
      case 'calendar-integration':
        result.calendar = content;
        break;
      case 'language-proficiency':
        result.languageProficiency = content;
        break;
      case 'certification-badges':
        result.certificationBadges = content;
        break;
      case 'achievements-showcase':
        result.achievementsShowcase = content;
        break;
      case 'video-introduction':
        result.videoIntroduction = content;
        break;
      case 'portfolio-gallery':
        result.portfolioGallery = content;
        break;
      case 'testimonials-carousel':
        result.testimonialsCarousel = content;
        break;
      case 'personality-insights':
        result.personalityInsights = content;
        break;
      default:
    }
  }

  /**
   * Get all supported feature types
   */
  static getSupportedTypes(): FeatureType[] {
    return [
      'embed-qr-code',
      'generate-podcast',
      'privacy-mode',
      'interactive-timeline',
      'skills-visualization',
      'social-media-links',
      'contact-form',
      'calendar-integration',
      'language-proficiency',
      'certification-badges',
      'achievements-showcase',
      'video-introduction',
      'portfolio-gallery',
      'testimonials-carousel',
      'personality-insights'
    ];
  }

  /**
   * Check if feature type is supported
   */
  static isSupported(type: string): type is FeatureType {
    return this.getSupportedTypes().includes(type as FeatureType);
  }

  /**
   * Clear feature cache (useful for testing)
   */
  static clearCache(): void {
    this.features.clear();
  }
}