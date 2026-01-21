// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';
import { certificationBadgesService, CertificationBadgesCollection } from '../integrations/WorkflowIntegration';
import * as admin from 'firebase-admin';

/**
 * Certification Badges Feature - Generates interactive certification badge display for CV
 */
export class CertificationBadgesFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    try {
      // Generate certification badges collection using the service
      // Note: Type assertion needed due to ParsedCV interface conflicts
      const badgesCollection = await certificationBadgesService.generateCertificationBadges(cv as any, jobId);
      
      // Always use React component instead of legacy HTML
      return this.generateReactComponentPlaceholder(jobId, badgesCollection, options);
    } catch (error) {
      // Return fallback placeholder on error
      return this.generateFallbackPlaceholder(jobId, options);
    }
  }
  
  /**
   * Extract certification data from CV for component props
   */
  private extractCertificationData(cv: ParsedCV): any {
    const certifications = cv.certifications || [];
    
    return {
      rawCertifications: certifications,
      hasData: certifications.length > 0,
      count: certifications.length,
      personalInfo: cv.personalInfo || {}
    };
  }

  /**
   * Generate React component placeholder for modern CV rendering
   */
  private generateReactComponentPlaceholder(
    jobId: string, 
    badgesCollection: CertificationBadgesCollection, 
    options?: any
  ): string {
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      collection: badgesCollection,
      data: {
        badges: badgesCollection.badges,
        categories: badgesCollection.categories,
        statistics: badgesCollection.statistics
      },
      isEnabled: true,
      customization: {
        layout: options?.layout || badgesCollection.displayOptions.layout || 'grid',
        showExpired: options?.showExpired !== undefined ? options.showExpired : badgesCollection.displayOptions.showExpired,
        groupByCategory: options?.groupByCategory !== undefined ? options.groupByCategory : badgesCollection.displayOptions.groupByCategory,
        animateOnHover: options?.animateOnHover !== undefined ? options.animateOnHover : badgesCollection.displayOptions.animateOnHover,
        showVerificationStatus: options?.showVerificationStatus !== undefined ? options.showVerificationStatus : badgesCollection.displayOptions.showVerificationStatus,
        maxDisplay: options?.maxDisplay,
        title: options?.title || 'Professional Certifications',
        theme: options?.theme || 'auto'
      },
      className: 'cv-certification-badges',
      mode: 'public',
      // Component event handlers (will be handled by React component)
      onGenerateBadges: async () => badgesCollection,
      onVerifyCertification: async (badgeId: string, verificationData: any) => {
        return await certificationBadgesService.verifyCertification(jobId, badgeId, verificationData);
      },
      onUpdateDisplayOptions: async (displayOptions: any) => {
        // This would be handled by the React component state
        return displayOptions;
      },
      onAddCertification: async (certification: any) => {
        // This would typically trigger a re-generation
      },
      onRemoveCertification: async (badgeId: string) => {
        // This would typically trigger a re-generation
      },
      onGenerateShareLink: async (badgeId: string) => {
        // Generate shareable link for specific badge
        return {
          shareUrl: `${process.env.FUNCTION_URL || 'https://cvplus.app'}/badge/${badgeId}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        };
      }
    };
    
    return `
      <div class="cv-feature-container certification-badges-feature">
        <div class="react-component-placeholder" 
             data-component="CertificationBadges" 
             data-props='${JSON.stringify(componentProps).replace(/'/g, "&apos;")}'
             id="certification-badges-${jobId}">
          <!-- React CertificationBadges component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading certification badges...</p>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Generate fallback placeholder when badges generation fails
   */
  private generateFallbackPlaceholder(jobId: string, options?: any): string {
    return `
      <div class="cv-feature-container certification-badges-feature">
        <div class="react-fallback">
          <div class="fallback-header">
            <h3>${options?.title || 'Professional Certifications'}</h3>
            <p>Certification badges could not be generated at this time</p>
          </div>
          <div class="fallback-message">
            <p>🏆 <strong>Certifications:</strong> Listed in the main CV content</p>
            <p>📜 <strong>Verification:</strong> Contact directly for credential verification</p>
            <p>🎯 <strong>Skills:</strong> Technical and professional competencies validated</p>
          </div>
          <div class="fallback-note">
            <small>Interactive certification badges require JavaScript to be enabled</small>
          </div>
        </div>
      </div>
    `;
  }

  getStyles(): string {
    return `
      /* CV Feature Container Styles */
      .cv-feature-container.certification-badges-feature {
        margin: 2rem 0;
      }
      
      /* React Component Placeholder Styles */
      .react-component-placeholder {
        min-height: 400px;
        position: relative;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 16px;
        padding: 2rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      /* React Fallback Styles */
      .react-fallback {
        text-align: center;
        padding: 2rem;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }
      
      .fallback-header h3 {
        color: #1e293b;
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }
      
      .fallback-header p {
        color: #64748b;
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
        color: #9ca3af;
        font-style: italic;
      }
      
      .component-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        color: #64748b;
      }
      
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #06b6d4;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Certification Badges Specific Styles */
      .certification-badges-feature .badge-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-top: 1rem;
      }
      
      .certification-badges-feature .badge-item {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        border: 2px solid #e2e8f0;
        transition: all 0.3s ease;
        text-align: center;
      }
      
      .certification-badges-feature .badge-item:hover {
        border-color: #06b6d4;
        transform: translateY(-2px);
        box-shadow: 0 8px 16px -4px rgba(6, 182, 212, 0.2);
      }
      
      .certification-badges-feature .badge-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto 1rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
        color: white;
      }
      
      .certification-badges-feature .badge-title {
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 0.5rem;
      }
      
      .certification-badges-feature .badge-issuer {
        color: #64748b;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
      }
      
      .certification-badges-feature .badge-date {
        color: #9ca3af;
        font-size: 0.75rem;
      }
      
      .certification-badges-feature .verification-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background: #dcfdf7;
        color: #065f46;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
        margin-top: 0.5rem;
      }
      
      /* Mobile Responsive */
      @media (max-width: 768px) {
        .certification-badges-feature {
          padding: 1.5rem;
          margin: 1rem 0;
        }
        
        .certification-badges-feature .badge-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        .fallback-message {
          padding: 1rem;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .certification-badges-feature {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }
        
        .fallback-header h3 {
          color: #f1f5f9;
        }
        
        .fallback-header p {
          color: #cbd5e1;
        }
        
        .fallback-message {
          background: #374151;
          color: #e2e8f0;
        }
        
        .certification-badges-feature .badge-item {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
        
        .certification-badges-feature .badge-item:hover {
          border-color: #06b6d4;
        }
        
        .certification-badges-feature .badge-title {
          color: #f1f5f9;
        }
        
        .certification-badges-feature .badge-issuer {
          color: #cbd5e1;
        }
        
        .certification-badges-feature .badge-date {
          color: #9ca3af;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React CertificationBadges components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="CertificationBadges"]');
          
          if (placeholders.length === 0) {
            return false;
          }
          
          
          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));
              
              
              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                window.renderReactComponent('CertificationBadges', props, placeholder);
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
          const collection = props.collection || {};
          const statistics = collection.statistics || {};
          
          placeholder.innerHTML = '<div class="react-fallback">' +
            '<div class="fallback-header">' +
              '<h3>' + (props.customization?.title || 'Professional Certifications') + '</h3>' +
              '<p>Interactive certification badges (' + (statistics.totalCertifications || 0) + ' certifications)</p>' +
            '</div>' +
            '<div class="fallback-message">' +
              '<p>🏆 <strong>Total:</strong> ' + (statistics.totalCertifications || 0) + ' certifications</p>' +
              '<p>✅ <strong>Verified:</strong> ' + (statistics.verifiedCertifications || 0) + ' badges</p>' +
              '<p>📈 <strong>Active:</strong> ' + (statistics.activeCertifications || 0) + ' current</p>' +
              '<p>🎯 <strong>Skills:</strong> ' + ((statistics.skillsCovered || []).length) + ' skills validated</p>' +
            '</div>' +
            '<div class="fallback-note">' +
              '<small>Interactive badges require JavaScript and React to be enabled</small>' +
            '</div>' +
          '</div>';
        }
        
        // Show error when React props parsing fails
        function showReactError(placeholder, errorMessage) {
          placeholder.innerHTML = '<div class="react-error">' +
            '<h3>Certification Badges Error</h3>' +
            '<p>Unable to load certification badges: ' + errorMessage + '</p>' +
            '<p>Certifications are still listed in the main CV content.</p>' +
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
        window.CertificationBadgesFeature = {
          initReactComponents
        };
        
        // Global function to re-initialize components (useful for dynamic content)
        window.initCertificationBadges = initReactComponents;
        
      })();
    `;
  }
}
