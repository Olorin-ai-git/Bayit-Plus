// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';

interface SocialMediaProfile {
  platform: string;
  url: string;
  username?: string;
  verified?: boolean;
}

/**
 * Social Links Feature - Generates interactive social media links section for CV
 * Converted to use React SocialMediaLinks component for enhanced functionality
 */
export class SocialLinksFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    // Extract social media data from CV
    const componentData = this.extractComponentData(cv);
    
    // Create component props following the proven ContactFormFeature pattern
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      data: componentData,
      isEnabled: true,
      customization: {
        style: options?.style || 'cards',
        size: options?.size || 'medium',
        showLabels: options?.showLabels !== false,
        openInNewTab: options?.openInNewTab !== false,
        theme: options?.theme || 'auto',
        animateHover: options?.animateHover !== false
      },
      className: 'cv-social-links',
      mode: 'public'
    };
    
    // Always use React component instead of legacy HTML
    return this.generateReactComponentPlaceholder(jobId, componentProps);
  }

  /**
   * Extract social media data from CV in format expected by React component
   */
  private extractComponentData(cv: ParsedCV): any {
    const data: any = {};
    
    // Extract from CV personal information
    if (cv.personalInfo) {
      // Direct field mappings
      if (cv.personalInfo.linkedin && this.isValidUrl(cv.personalInfo.linkedin)) {
        data.linkedin = cv.personalInfo.linkedin;
      }
      
      if (cv.personalInfo.github && this.isValidUrl(cv.personalInfo.github)) {
        data.github = cv.personalInfo.github;
      }
      
      if (cv.personalInfo.website && this.isValidUrl(cv.personalInfo.website)) {
        // Check if website is a known platform or use as portfolio
        const websiteUrl = cv.personalInfo.website.toLowerCase();
        if (websiteUrl.includes('github.com') && !data.github) {
          data.github = cv.personalInfo.website;
        } else if (websiteUrl.includes('linkedin.com') && !data.linkedin) {
          data.linkedin = cv.personalInfo.website;
        } else if (websiteUrl.includes('twitter.com') || websiteUrl.includes('x.com')) {
          data.twitter = cv.personalInfo.website;
        } else if (websiteUrl.includes('medium.com')) {
          data.medium = cv.personalInfo.website;
        } else if (websiteUrl.includes('youtube.com')) {
          data.youtube = cv.personalInfo.website;
        } else if (websiteUrl.includes('instagram.com')) {
          data.instagram = cv.personalInfo.website;
        } else if (websiteUrl.includes('facebook.com')) {
          data.facebook = cv.personalInfo.website;
        } else {
          // Treat as portfolio/personal website
          data.portfolio = cv.personalInfo.website;
        }
      }
      
      // Search for social media links in all CV text
      const allCVText = JSON.stringify(cv).toLowerCase();
      
      // Platform detection patterns
      const platforms = [
        { key: 'linkedin', pattern: /linkedin\.com\/in\/[^\s]+/gi },
        { key: 'github', pattern: /github\.com\/[^\s]+/gi },
        { key: 'twitter', pattern: /(?:twitter\.com|x\.com)\/[^\s]+/gi },
        { key: 'medium', pattern: /medium\.com\/@[^\s]+/gi },
        { key: 'youtube', pattern: /youtube\.com\/(?:c\/|channel\/|user\/)?[^\s]+/gi },
        { key: 'instagram', pattern: /instagram\.com\/[^\s]+/gi },
        { key: 'facebook', pattern: /facebook\.com\/[^\s]+/gi }
      ];
      
      for (const { key, pattern } of platforms) {
        if (!data[key]) {
          const matches = allCVText.match(pattern);
          if (matches && matches[0]) {
            const url = matches[0].startsWith('http') ? matches[0] : 'https://' + matches[0];
            if (this.isValidUrl(url)) {
              data[key] = url;
            }
          }
        }
      }
    }
    
    return data;
  }

  /**
   * Generate React component placeholder for modern CV rendering
   */
  private generateReactComponentPlaceholder(jobId: string, props: any): string {
    return `
      <div class="cv-feature-container social-links-feature">
        <div class="react-component-placeholder" 
             data-component="SocialMediaLinks" 
             data-props='${JSON.stringify(props).replace(/'/g, "&apos;")}'>
          <!-- React SocialMediaLinks component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading social media links...</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * SECURITY: Validate URL format and ensure it's safe
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // Only allow HTTP and HTTPS protocols
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * SECURITY: Sanitize URL to prevent injection attacks
   */
  private sanitizeUrl(url: string): string {
    if (!this.isValidUrl(url)) {
      return '#';
    }
    
    try {
      const urlObj = new URL(url);
      // Ensure protocol is safe
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return '#';
      }
      
      // Return the sanitized URL
      return urlObj.href;
    } catch {
      return '#';
    }
  }

  /**
   * SECURITY: Escape HTML to prevent XSS
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  getStyles(): string {
    return `
      /* CV Feature Container Styles */
      .cv-feature-container.social-links-feature {
        margin: 2rem 0;
      }
      
      /* React Component Placeholder Styles */
      .react-component-placeholder {
        min-height: 300px;
        position: relative;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border-radius: 16px;
        padding: 2rem;
        border: 1px solid #0ea5e9;
        box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.1);
      }
      
      /* Component Loading Styles */
      .component-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 250px;
        color: #075985;
      }
      
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #bae6fd;
        border-top: 3px solid #0ea5e9;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* React Fallback Styles */
      .react-fallback, .react-error {
        text-align: center;
        padding: 2rem;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border-radius: 12px;
        border: 1px solid #0ea5e9;
      }
      
      .fallback-header h3, .react-error h3 {
        color: #0c4a6e;
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }
      
      .fallback-header p {
        color: #075985;
        margin: 0 0 1.5rem 0;
      }
      
      .fallback-message {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        text-align: left;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
      }
      
      .fallback-message p {
        margin: 0.75rem 0;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .fallback-note small {
        color: #64748b;
        font-style: italic;
      }
      
      .react-error p {
        color: #dc2626;
        margin: 0.5rem 0;
      }
      
      /* Mobile Responsive */
      @media (max-width: 768px) {
        .cv-feature-container.social-links-feature {
          margin: 1rem 0;
        }
        
        .react-component-placeholder {
          padding: 1.5rem;
          min-height: 250px;
        }
        
        .component-loading {
          height: 200px;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .react-component-placeholder {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-color: #334155;
        }
        
        .component-loading {
          color: #cbd5e1;
        }
        
        .loading-spinner {
          border-color: #475569;
          border-top-color: #06b6d4;
        }
        
        .react-fallback, .react-error {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-color: #334155;
        }
        
        .fallback-header h3, .react-error h3 {
          color: #f1f5f9;
        }
        
        .fallback-header p {
          color: #cbd5e1;
        }
        
        .fallback-message {
          background: #374151;
        }
        
        .fallback-message p {
          color: #e5e7eb;
        }
        
        .fallback-note small {
          color: #9ca3af;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React SocialMediaLinks components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="SocialMediaLinks"]');
          
          if (placeholders.length === 0) {
            return false;
          }
          
          
          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));
              
              
              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                window.renderReactComponent('SocialMediaLinks', props, placeholder);
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
          const hasData = props.data && Object.keys(props.data).some(key => props.data[key]);
          
          if (!hasData) {
            placeholder.innerHTML = \`
              <div class="react-fallback">
                <div class="fallback-header">
                  <h3>Connect with Me</h3>
                  <p>Find me on social media platforms</p>
                </div>
                <div class="fallback-message">
                  <p>🔗 <strong>Social Links:</strong> Not configured yet</p>
                  <p>📱 <strong>Contact:</strong> Reach out via email or phone</p>
                </div>
                <div class="fallback-note">
                  <small>Social media links require React to be enabled for full functionality</small>
                </div>
              </div>
            \`;
            return;
          }
          
          const linksList = Object.entries(props.data)
            .filter(([key, url]) => url)
            .map(([platform, url]) => \`
              <p>
                <a href="\${url}" target="_blank" rel="noopener noreferrer" style="color: #0ea5e9; text-decoration: none;">
                  🔗 <strong>\${platform.charAt(0).toUpperCase() + platform.slice(1)}:</strong> Visit my profile
                </a>
              </p>
            \`)
            .join('');
            
          placeholder.innerHTML = \`
            <div class="react-fallback">
              <div class="fallback-header">
                <h3>Connect with Me</h3>
                <p>Find me on these platforms</p>
              </div>
              <div class="fallback-message">
                \${linksList}
              </div>
              <div class="fallback-note">
                <small>Enhanced social media features require React to be enabled</small>
              </div>
            </div>
          \`;
        }
        
        // Show error when React props parsing fails
        function showReactError(placeholder, errorMessage) {
          placeholder.innerHTML = \`
            <div class="react-error">
              <h3>Social Media Links Error</h3>
              <p>Unable to load social media links: \${errorMessage}</p>
              <p>Please check the CV for social media contact information.</p>
            </div>
          \`;
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
        window.SocialLinksFeature = {
          initReactComponents
        };
        
        // Global function to re-initialize components (useful for dynamic content)
        window.initSocialLinks = initReactComponents;
        
      })();
    `;
  }
}