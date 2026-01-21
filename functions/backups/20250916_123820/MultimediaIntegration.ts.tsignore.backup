// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';

/**
 * Multimedia Integration Service
 * Provides bridge between cv-processing and multimedia submodule
 * Uses dependency injection pattern for multimedia feature access
 */
export class MultimediaIntegration {
  private static multimediaProvider: MultimediaProvider | null = null;

  /**
   * Set the multimedia provider for dependency injection
   */
  static setProvider(provider: MultimediaProvider): void {
    this.multimediaProvider = provider;
  }

  /**
   * Get multimedia feature instance
   */
  static getFeature(featureType: MultimediaFeatureType): CVFeature | null {
    if (!this.multimediaProvider) {
      console.warn('MultimediaProvider not set. Multimedia features unavailable.');
      return null;
    }

    return this.multimediaProvider.getFeature(featureType);
  }

  /**
   * Create multimedia feature wrapper for integration
   */
  static createFeatureWrapper(featureType: MultimediaFeatureType): CVFeature | null {
    const multimediaFeature = this.getFeature(featureType);
    if (!multimediaFeature) {
      return null;
    }

    return new MultimediaFeatureWrapper(multimediaFeature);
  }

  /**
   * Check if multimedia provider is available
   */
  static isAvailable(): boolean {
    return this.multimediaProvider !== null;
  }
}

/**
 * Interface for multimedia provider dependency injection
 */
export interface MultimediaProvider {
  getFeature(featureType: MultimediaFeatureType): CVFeature | null;
}

/**
 * Multimedia feature types supported by the multimedia submodule
 */
export type MultimediaFeatureType =
  | 'video-introduction'
  | 'generate-podcast'
  | 'embed-qr-code'
  | 'portfolio-gallery';

/**
 * Wrapper class that adapts multimedia features to cv-processing interface
 */
export class MultimediaFeatureWrapper implements CVFeature {
  constructor(private multimediaFeature: CVFeature) {}

  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    // Convert ParsedCV to the format expected by multimedia module
    const cvData = this.convertToMultimediaFormat(cv);
    return this.multimediaFeature.generate(cvData, jobId, options);
  }

  getStyles(): string {
    return this.multimediaFeature.getStyles();
  }

  getScripts(): string {
    return this.multimediaFeature.getScripts();
  }

  /**
   * Convert ParsedCV to multimedia-compatible format
   */
  private convertToMultimediaFormat(cv: ParsedCV): any {
    return {
      personalInfo: cv.personalInfo,
      experience: cv.experience,
      education: cv.education,
      skills: cv.skills,
      projects: cv.projects,
      certifications: cv.certifications,
      summary: cv.summary,
      achievements: cv.achievements
    };
  }
}

/**
 * Fallback feature implementation when multimedia is unavailable
 */
export class MultimediaFallbackFeature implements CVFeature {
  constructor(private featureType: MultimediaFeatureType) {}

  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    const featureName = this.getFeatureName();
    return `
      <div class="multimedia-fallback">
        <div class="fallback-content">
          <h3>${featureName} Unavailable</h3>
          <p>This feature requires the multimedia module to be loaded.</p>
          <div class="fallback-placeholder">
            <div class="placeholder-icon">[${this.featureType.toUpperCase()}]</div>
            <p>Please ensure the multimedia module is properly configured.</p>
          </div>
        </div>
      </div>
    `;
  }

  getStyles(): string {
    return `
      .multimedia-fallback {
        padding: 2rem;
        margin: 1rem 0;
        border: 2px dashed #e2e8f0;
        border-radius: 12px;
        text-align: center;
        background: #f8fafc;
      }

      .fallback-content h3 {
        color: #64748b;
        font-size: 1.25rem;
        margin-bottom: 0.5rem;
      }

      .fallback-content p {
        color: #94a3b8;
        margin-bottom: 1rem;
      }

      .fallback-placeholder {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem auto;
        max-width: 300px;
      }

      .placeholder-icon {
        font-size: 2rem;
        color: #cbd5e1;
        margin-bottom: 1rem;
        font-weight: bold;
      }

      @media (max-width: 768px) {
        .multimedia-fallback {
          padding: 1.5rem;
          margin: 0.5rem 0;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      console.info('Multimedia feature "${this.featureType}" is not available. Please configure the multimedia module.');
    `;
  }

  private getFeatureName(): string {
    switch (this.featureType) {
      case 'video-introduction':
        return 'Video Introduction';
      case 'generate-podcast':
        return 'AI Podcast';
      case 'embed-qr-code':
        return 'QR Code';
      case 'portfolio-gallery':
        return 'Portfolio Gallery';
      default:
        return 'Multimedia Feature';
    }
  }
}