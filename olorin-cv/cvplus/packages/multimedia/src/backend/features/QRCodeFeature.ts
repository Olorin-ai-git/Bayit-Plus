import { CVFeature, CVData } from '../types/cv-feature.types';

/**
 * QR Code feature generator for multimedia module
 * Creates a dynamic QR code with advanced customization and analytics
  */
export class QRCodeFeature implements CVFeature {

  async generate(cv: CVData, jobId: string, options?: any): Promise<string> {
    const componentData = this.extractQRCodeData(cv, jobId, options);
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      data: componentData,
      isEnabled: true,
      customization: options?.customization || this.getDefaultCustomization(),
      mode: 'public',
      className: 'cv-qr-code'
    };

    return this.generateReactComponentPlaceholder(jobId, componentProps);
  }

  /**
   * Extract QR code data from CV and generate URLs
    */
  private extractQRCodeData(cv: CVData, jobId: string, options?: any): any {
    const baseUrl = 'https://getmycv-ai.web.app';
    const profileName = cv.personalInfo?.name?.replace(/\s+/g, '-').toLowerCase() || jobId;

    // Primary CV URL
    const primaryUrl = `${baseUrl}/cv/${profileName}`;

    // Generate additional URLs based on CV content
    const urls: any = {
      url: primaryUrl, // Primary URL for QR code
    };

    // Add profile URL if different from primary
    if (options?.profileUrl) {
      urls.profileUrl = options.profileUrl;
    }

    // Add portfolio URL if available
    if (cv.projects || options?.portfolioUrl) {
      urls.portfolioUrl = options?.portfolioUrl || `${baseUrl}/portfolio/${profileName}`;
    }

    // Add LinkedIn URL if available
    if (cv.personalInfo?.linkedin || options?.linkedinUrl) {
      urls.linkedinUrl = cv.personalInfo?.linkedin || options.linkedinUrl;
    }

    return urls;
  }

  /**
   * Get default customization options
    */
  private getDefaultCustomization(): any {
    return {
      size: 256,
      style: 'rounded',
      backgroundColor: '#FFFFFF',
      foregroundColor: '#000000',
      logoUrl: null
    };
  }

  /**
   * Generate React component placeholder for modern CV rendering
    */
  private generateReactComponentPlaceholder(jobId: string, props: any): string {
    return `
      <div class="cv-feature-container qr-code-feature">
        <div class="react-component-placeholder"
             data-component="DynamicQRCode"
             data-props='${JSON.stringify(props).replace(/'/g, "&apos;")}'>
          <!-- React DynamicQRCode component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading QR code...</p>
          </div>
        </div>
      </div>
    `;
  }

  getStyles(): string {
    return `
      /* CV Feature Container Styles  */
      .cv-feature-container.qr-code-feature {
        margin: 2rem 0;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
      }

      /* React Component Placeholder Styles  */
      .react-component-placeholder[data-component="DynamicQRCode"] {
        min-height: 350px;
        position: relative;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 16px;
        padding: 2rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        text-align: center;
      }

      /* Component Loading Styles  */
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

      /* Fallback QR Code Styles  */
      .qr-fallback {
        text-align: center;
        padding: 2rem;
        background: white;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        margin: 1rem 0;
      }

      .qr-fallback h3 {
        color: #1e293b;
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0 0 1rem 0;
      }

      .qr-fallback-image {
        display: block;
        width: 200px;
        height: 200px;
        margin: 0 auto 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }

      .qr-fallback-caption {
        font-size: 0.875rem;
        color: #64748b;
        margin: 0;
      }

      .qr-fallback-url {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.75rem;
        margin: 1rem 0;
        font-family: monospace;
        font-size: 0.75rem;
        color: #374151;
        word-break: break-all;
      }

      /* Error Styles  */
      .qr-error {
        text-align: center;
        padding: 2rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 12px;
        color: #991b1b;
      }

      .qr-error h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
      }

      .qr-error p {
        margin: 0;
        font-size: 0.875rem;
      }

      /* Responsive Styles  */
      @media (max-width: 768px) {
        .cv-feature-container.qr-code-feature {
          margin: 1rem 0;
        }

        .react-component-placeholder[data-component="DynamicQRCode"] {
          padding: 1.5rem;
          min-height: 300px;
        }

        .qr-fallback-image {
          width: 150px;
          height: 150px;
        }
      }

      /* Print Styles  */
      @media print {
        .cv-feature-container.qr-code-feature {
          page-break-inside: avoid;
          margin: 1rem 0;
        }

        .react-component-placeholder[data-component="DynamicQRCode"] {
          background: white !important;
          box-shadow: none !important;
          border: 1px solid #000 !important;
        }

        .component-loading {
          display: none;
        }
      }

      /* Dark Mode Support  */
      @media (prefers-color-scheme: dark) {
        .react-component-placeholder[data-component="DynamicQRCode"] {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }

        .component-loading {
          color: #cbd5e1;
        }

        .loading-spinner {
          border-color: #475569;
          border-top-color: #06b6d4;
        }

        .qr-fallback {
          background: #374151;
          border-color: #4b5563;
        }

        .qr-fallback h3 {
          color: #f1f5f9;
        }

        .qr-fallback-caption {
          color: #cbd5e1;
        }

        .qr-fallback-url {
          background: #1e293b;
          border-color: #475569;
          color: #e2e8f0;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React DynamicQRCode components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="DynamicQRCode"]');

          if (placeholders.length === 0) {
            return false;
          }

          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));

              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                window.renderReactComponent('DynamicQRCode', props, placeholder);
              } else {
                showQRFallback(placeholder, props);
              }
            } catch (error) {
              showQRError(placeholder, error.message);
            }
          });

          return true;
        }

        // Show fallback QR code when React renderer is not available
        function showQRFallback(placeholder, props) {
          const data = props.data || {};
          const customization = props.customization || {};
          const size = customization.size || 200;
          const primaryUrl = data.url || 'https://getmycv-ai.web.app';

          // Generate QR code using qrserver.com API (fallback)
          const qrImageUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=\${size}x\${size}&data=\${encodeURIComponent(primaryUrl)}\`;

          placeholder.innerHTML = \`
            <div class="qr-fallback">
              <h3>QR Code</h3>
              <img
                class="qr-fallback-image"
                src="\${qrImageUrl}"
                alt="QR Code"
                title="Scan to view CV online"
                loading="lazy"
              />
              <p class="qr-fallback-caption">Scan to view CV online</p>
              <div class="qr-fallback-url">\${primaryUrl}</div>
              <small style="color: #9ca3af; font-style: italic;">
                QR code requires JavaScript for advanced features
              </small>
            </div>
          \`;

          // Add error handling for image load failure
          const img = placeholder.querySelector('.qr-fallback-image');
          if (img) {
            img.onerror = function() {
              this.style.display = 'none';
              const caption = placeholder.querySelector('.qr-fallback-caption');
              if (caption) {
                caption.textContent = 'QR code generation failed';
                caption.style.color = '#dc2626';
              }
            };
          }
        }

        // Show error when React props parsing fails
        function showQRError(placeholder, errorMessage) {
          placeholder.innerHTML = \`
            <div class="qr-error">
              <h3>QR Code Error</h3>
              <p>Unable to load QR code: \${errorMessage}</p>
              <p>Please check the CV URL configuration.</p>
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
        window.QRCodeFeature = {
          initReactComponents
        };

        // Global function to re-initialize components (useful for dynamic content)
        window.initQRCodes = initReactComponents;

      })();
    `;
  }
}