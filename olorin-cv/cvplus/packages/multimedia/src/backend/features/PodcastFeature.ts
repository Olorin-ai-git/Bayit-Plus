import { CVFeature, CVData } from '../types/cv-feature.types';

/**
 * Podcast feature generator for multimedia module
 * Creates an AI-generated career podcast player using React AIPodcastPlayer component
  */
export class PodcastFeature implements CVFeature {

  async generate(cv: CVData, jobId: string, options?: any): Promise<string> {
    // Extract podcast data from CV
    const componentData = this.extractPodcastData(cv, jobId, options);
    const contactName = cv.personalInfo?.name || 'Professional';

    // Create component props for AIPodcastPlayer
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      data: componentData,
      isEnabled: true,
      customization: {
        autoplay: options?.autoplay || false,
        showTranscript: options?.showTranscript !== false,
        showDownload: options?.showDownload !== false,
        theme: options?.theme || 'full'
      },
      className: 'cv-podcast-player',
      mode: 'public'
    };

    return this.generateReactComponentPlaceholder(jobId, contactName, componentProps, options);
  }

  /**
   * Extract podcast data from CV for the React component
    */
  private extractPodcastData(cv: CVData, jobId: string, options?: any): any {
    const contactName = cv.personalInfo?.name || 'Professional';
    const yearsOfExperience = this.calculateYearsOfExperience(cv);

    return {
      title: `${contactName}'s Career Journey`,
      description: `Listen to an AI-generated summary of ${contactName}'s professional career`,
      duration: options?.duration || 'medium', // short, medium, long
      style: options?.style || 'professional', // professional, casual, storytelling
      focus: options?.focus || 'balanced', // technical, leadership, balanced
      jobId: jobId,
      contactName: contactName,
      yearsOfExperience: yearsOfExperience,
      keyHighlights: this.extractKeyHighlights(cv),
      status: 'pending' // Will be updated by the component
    };
  }

  /**
   * Calculate years of experience from CV
    */
  private calculateYearsOfExperience(cv: CVData): number {
    if (!cv.experience || cv.experience.length === 0) return 0;

    let totalYears = 0;
    cv.experience.forEach(exp => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        totalYears += Math.max(0, years);
      }
    });

    return Math.round(totalYears);
  }

  /**
   * Extract key highlights for podcast content
    */
  private extractKeyHighlights(cv: CVData): string[] {
    const highlights: string[] = [];

    // Add experience highlights
    if (cv.experience && cv.experience.length > 0) {
      const latestRole = cv.experience[0];
      if (latestRole.position && latestRole.company) {
        highlights.push(`Current role: ${latestRole.position} at ${latestRole.company}`);
      }
    }

    // Add skills highlights
    if (cv.skills?.technical && cv.skills.technical.length > 0) {
      highlights.push(`Technical expertise: ${cv.skills.technical.slice(0, 3).join(', ')}`);
    }

    // Add education highlights
    if (cv.education && cv.education.length > 0) {
      const latestEdu = cv.education[0];
      if (latestEdu.degree && latestEdu.field) {
        highlights.push(`Education: ${latestEdu.degree} in ${latestEdu.field}`);
      }
    }

    // Add certifications highlights
    if (cv.certifications && cv.certifications.length > 0) {
      highlights.push(`Certified in ${cv.certifications.length} professional areas`);
    }

    return highlights;
  }

  /**
   * Generate React component placeholder
    */
  private generateReactComponentPlaceholder(jobId: string, contactName: string, props: any, options?: any): string {
    const serializedProps = JSON.stringify(props).replace(/"/g, '&quot;');

    return `
      <div class="react-component-placeholder"
           data-component="AIPodcastPlayer"
           data-props="${serializedProps}"
           data-job-id="${jobId}"
           data-contact-name="${contactName}">
        <!-- Fallback HTML for environments without React -->
        <div class="podcast-fallback">
          <div class="podcast-banner">
            <h3>🎙️ AI Career Podcast</h3>
            <p>Listen to an AI-generated summary of ${contactName}'s career journey</p>
            <div class="podcast-status">
              <div class="loading-spinner"></div>
              <p>Generating your personalized career podcast...</p>
              <small>This usually takes 2-3 minutes</small>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getStyles(): string {
    return `
      /* Fallback styles for environments without React  */
      .podcast-fallback {
        margin: 30px 0;
        padding: 25px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        color: white;
        page-break-inside: avoid;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
      }

      .podcast-fallback .podcast-banner h3 {
        font-size: 22px;
        margin-bottom: 8px;
        line-height: 1.4;
        font-weight: 600;
      }

      .podcast-fallback .podcast-banner p {
        margin-bottom: 15px;
        line-height: 1.5;
        opacity: 0.9;
      }

      .podcast-fallback .podcast-status {
        text-align: center;
        padding: 25px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        backdrop-filter: blur(10px);
      }

      .podcast-fallback .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .podcast-fallback .podcast-status p {
        margin: 10px 0 5px;
        font-weight: 500;
      }

      .podcast-fallback .podcast-status small {
        opacity: 0.8;
        font-size: 13px;
      }

      @media (max-width: 768px) {
        .podcast-fallback {
          margin: 20px 0;
          padding: 20px;
        }

        .podcast-fallback .podcast-banner h3 {
          font-size: 20px;
        }

        .podcast-fallback .podcast-status {
          padding: 20px;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      // React component will handle all podcast functionality
      // This script is only for fallback HTML environments

      // Auto-initialize React components on page load
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.initializeReactComponents === 'function') {
          window.initializeReactComponents();
        }
      });
    `;
  }
}