import { CVFeature, CVData } from '../types/cv-feature.types';

/**
 * Video Introduction Feature - Generates AI-powered video introduction for CV
  */
export class VideoIntroFeature implements CVFeature {

  async generate(cv: CVData, jobId: string, options?: any): Promise<string> {
    const componentData = this.extractVideoIntroData(cv);

    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      data: componentData,
      isEnabled: true,
      customization: {
        autoPlay: options?.autoPlay || false,
        showControls: options?.showControls !== false,
        showTranscript: options?.showTranscript !== false,
        enableGeneration: options?.enableGeneration !== false,
        defaultStyle: options?.defaultStyle || 'professional',
        quality: options?.quality || '1080p',
        duration: options?.duration || 'medium',
        includeSubtitles: options?.includeSubtitles !== false,
        theme: options?.theme || 'auto'
      },
      className: 'cv-video-introduction',
      mode: 'public'
    };

    return this.generateReactComponentPlaceholder(jobId, componentProps);
  }

  /**
   * Extract video introduction data from CV
    */
  private extractVideoIntroData(cv: CVData): any {
    return {
      // Personal information for video script generation
      name: cv.personalInfo?.name || 'Professional',
      title: cv.experience?.[0]?.position || 'Professional',
      summary: cv.summary || '',

      // Key experience highlights for script
      experience: {
        totalYears: this.calculateTotalExperience(cv.experience || []),
        recentRole: cv.experience?.[0]?.position || '',
        recentCompany: cv.experience?.[0]?.company || '',
        keyAchievements: this.extractKeyAchievements(cv)
      },

      // Top skills for mention in video
      topSkills: this.extractTopSkills(cv.skills),

      // Education for credibility
      education: {
        highestDegree: cv.education?.[0]?.degree || '',
        institution: cv.education?.[0]?.institution || '',
        field: cv.education?.[0]?.field || ''
      },

      // Contact preference for video CTA
      contactPreference: cv.personalInfo?.email || cv.personalInfo?.phone || '',

      // Industry context
      industry: this.inferIndustry(cv),

      // Personality traits for video style
      personality: this.extractPersonalityTraits(cv)
    };
  }

  /**
   * Calculate total years of experience
    */
  private calculateTotalExperience(experience: any[]): number {
    if (!experience || experience.length === 0) return 0;

    let totalMonths = 0;

    experience.forEach(exp => {
      if (exp.startDate && exp.endDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate === 'Present' ? new Date() : new Date(exp.endDate);
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += Math.max(0, diffMonths);
      }
    });

    return Math.round(totalMonths / 12);
  }

  /**
   * Extract key achievements from CV
    */
  private extractKeyAchievements(cv: CVData): string[] {
    const achievements: string[] = [];

    // From work experience achievements
    cv.experience?.forEach(exp => {
      if (exp.achievements && exp.achievements.length > 0) {
        achievements.push(...exp.achievements.slice(0, 2)); // Top 2 per role
      }
    });

    // From projects
    cv.projects?.forEach(project => {
      if (project.description) {
        achievements.push(project.description);
      }
    });

    // Return top 3 most impactful achievements
    return achievements.slice(0, 3);
  }

  /**
   * Extract top skills for video mention
    */
  private extractTopSkills(skills: { technical?: string[]; soft?: string[]; languages?: string[]; } | undefined): string[] {
    if (!skills) return [];

    // Combine all skill types and return top skills
    const allSkills = [
      ...(skills.technical || []),
      ...(skills.soft || []),
      ...(skills.languages || [])
    ].slice(0, 5);

    return allSkills;
  }

  /**
   * Infer industry from CV content
    */
  private inferIndustry(cv: CVData): string {
    // Check recent work experience
    const recentRole = cv.experience?.[0]?.position?.toLowerCase() || '';
    const recentCompany = cv.experience?.[0]?.company?.toLowerCase() || '';
    const skillsText = [
      ...(cv.skills?.technical || []),
      ...(cv.skills?.soft || []),
      ...(cv.skills?.languages || [])
    ].join(' ').toLowerCase();

    // Simple industry inference logic
    if (recentRole.includes('software') || recentRole.includes('developer') || recentRole.includes('engineer')) {
      return 'Technology';
    }
    if (recentRole.includes('marketing') || recentRole.includes('sales')) {
      return 'Marketing & Sales';
    }
    if (recentRole.includes('design') || recentRole.includes('creative')) {
      return 'Design & Creative';
    }
    if (recentRole.includes('finance') || recentRole.includes('accounting')) {
      return 'Finance';
    }
    if (recentRole.includes('manager') || recentRole.includes('director')) {
      return 'Management';
    }

    return 'Professional Services';
  }

  /**
   * Extract personality traits for video style customization
    */
  private extractPersonalityTraits(cv: CVData): any {
    const summary = (cv.summary || '').toLowerCase();

    return {
      isLeadershipFocused: summary.includes('lead') || summary.includes('manage') || summary.includes('director'),
      isInnovative: summary.includes('innovative') || summary.includes('creative') || summary.includes('pioneer'),
      isCollaborative: summary.includes('team') || summary.includes('collaborate') || summary.includes('partnership'),
      isResultsOriented: summary.includes('result') || summary.includes('achieve') || summary.includes('deliver'),
      isTechnical: summary.includes('technical') || summary.includes('engineer') || summary.includes('develop')
    };
  }

  /**
   * Generate React component placeholder for modern CV rendering
    */
  private generateReactComponentPlaceholder(jobId: string, componentProps: any): string {
    return `
      <div class="cv-feature-container video-introduction-feature">
        <div class="react-component-placeholder"
             data-component="VideoIntroduction"
             data-props='${JSON.stringify(componentProps).replace(/'/g, "&apos;")}'>
          <!-- React VideoIntroduction component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading video introduction...</p>
          </div>
        </div>
      </div>
    `;
  }

  getStyles(): string {
    return `
      /* CV Feature Container Styles  */
      .cv-feature-container.video-introduction-feature {
        margin: 2rem 0;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid #475569;
        box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.3);
      }

      /* React Component Placeholder Styles  */
      .react-component-placeholder {
        min-height: 500px;
        position: relative;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        color: #f1f5f9;
      }

      /* Loading State  */
      .component-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 400px;
        color: #cbd5e1;
      }

      .loading-spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #334155;
        border-top: 4px solid #06b6d4;
        border-radius: 50%;
        animation: spin 1.2s linear infinite;
        margin-bottom: 1.5rem;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Video Player Styles  */
      .video-introduction-feature .video-player {
        background: #000;
        border-radius: 12px;
        overflow: hidden;
        margin: 1rem;
      }

      .video-introduction-feature .video-controls {
        background: rgba(0, 0, 0, 0.8);
        padding: 1rem;
        color: white;
      }

      /* Generation Interface Styles  */
      .video-generation-interface {
        text-align: center;
        padding: 3rem 2rem;
      }

      .video-generation-interface h3 {
        color: #f1f5f9;
        font-size: 1.75rem;
        font-weight: 700;
        margin-bottom: 1rem;
      }

      .video-generation-interface p {
        color: #cbd5e1;
        font-size: 1rem;
        margin-bottom: 2rem;
        max-width: 500px;
        margin-left: auto;
        margin-right: auto;
      }

      /* Style Selection Grid  */
      .video-style-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
        max-width: 800px;
        margin-left: auto;
        margin-right: auto;
      }

      .video-style-option {
        background: #374151;
        border: 2px solid #4b5563;
        border-radius: 12px;
        padding: 1.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: left;
      }

      .video-style-option:hover {
        border-color: #06b6d4;
        background: #4b5563;
        transform: translateY(-2px);
      }

      .video-style-option.selected {
        border-color: #06b6d4;
        background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
        box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
      }

      .video-style-option h4 {
        color: #f1f5f9;
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        text-transform: capitalize;
      }

      .video-style-option p {
        color: #cbd5e1;
        font-size: 0.875rem;
        margin: 0;
        line-height: 1.4;
      }

      /* Generate Button  */
      .video-generate-btn {
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 1rem 3rem;
        font-size: 1.125rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1.5rem;
      }

      .video-generate-btn:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 12px 24px -8px rgba(6, 182, 212, 0.4);
      }

      .video-generate-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      /* Feature Benefits  */
      .video-benefits {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin: 3rem 0 2rem 0;
        padding: 0 2rem;
      }

      .video-benefit {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 2rem;
        text-align: center;
      }

      .video-benefit-icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 1rem auto;
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
      }

      .video-benefit h4 {
        color: #f1f5f9;
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
      }

      .video-benefit p {
        color: #cbd5e1;
        font-size: 0.875rem;
        line-height: 1.5;
        margin: 0;
      }

      /* Responsive Design  */
      @media (max-width: 768px) {
        .cv-feature-container.video-introduction-feature {
          margin: 1rem 0;
          border-radius: 12px;
        }

        .video-generation-interface {
          padding: 2rem 1rem;
        }

        .video-generation-interface h3 {
          font-size: 1.5rem;
        }

        .video-style-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .video-generate-btn {
          width: 100%;
          justify-content: center;
        }

        .video-benefits {
          grid-template-columns: 1fr;
          gap: 1rem;
          padding: 0 1rem;
        }
      }

      /* Dark mode enhancements  */
      @media (prefers-color-scheme: dark) {
        .video-introduction-feature {
          box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.5);
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React VideoIntroduction components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="VideoIntroduction"]');

          if (placeholders.length === 0) {
            return false;
          }

          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));

              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                window.renderReactComponent('VideoIntroduction', props, placeholder);
              } else {
                showReactFallback(placeholder, props);
              }
            } catch (error) {
              showReactError(placeholder, error.message);
            }
          });

          return true;
        }

        // Show fallback when React renderer is not available
        function showReactFallback(placeholder, props) {
          const name = props.data?.name || 'Professional';
          const title = props.data?.title || 'Professional';
          const experience = props.data?.experience?.totalYears || 0;

          placeholder.innerHTML = '<div class="video-generation-interface">' +
            '<div class="video-benefit-icon">[VIDEO]</div>' +
            '<h3>AI Video Introduction</h3>' +
            '<p>Create a professional video introduction featuring ' + name + '</p>' +
            '<div class="video-benefits">' +
              '<div class="video-benefit">' +
                '<div class="video-benefit-icon">[AI]</div>' +
                '<h4>AI Avatar</h4>' +
                '<p>Realistic AI-generated presenter</p>' +
              '</div>' +
              '<div class="video-benefit">' +
                '<div class="video-benefit-icon">[SCRIPT]</div>' +
                '<h4>Custom Script</h4>' +
                '<p>Personalized based on ' + experience + '+ years experience</p>' +
              '</div>' +
              '<div class="video-benefit">' +
                '<div class="video-benefit-icon">[HD]</div>' +
                '<h4>Professional Quality</h4>' +
                '<p>HD video with subtitles included</p>' +
              '</div>' +
            '</div>' +
            '<div class="fallback-note">' +
              '<small style="color: #9ca3af; font-style: italic;">' +
                'Video generation requires JavaScript and React to be enabled' +
              '</small>' +
            '</div>' +
          '</div>';
        }

        // Show error when React props parsing fails
        function showReactError(placeholder, errorMessage) {
          placeholder.innerHTML = '<div class="video-generation-interface">' +
            '<h3 style="color: #ef4444;">Video Introduction Error</h3>' +
            '<p style="color: #f87171;">Unable to load video introduction: ' + errorMessage + '</p>' +
            '<p style="color: #cbd5e1;">Please contact support or try refreshing the page.</p>' +
          '</div>';
        }

        // Initialize when DOM is ready
        function startInitialization() {
          initReactComponents();
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startInitialization);
        } else {
          startInitialization();
        }

        // Export for external access
        window.VideoIntroFeature = {
          initReactComponents
        };

        // Global function to re-initialize components (useful for dynamic content)
        window.initVideoIntroductions = initReactComponents;

      })();
    `;
  }
}