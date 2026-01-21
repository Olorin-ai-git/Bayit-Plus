// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';
import { PublicProfilesIntegration } from '../integrations/PublicProfilesIntegration';
import * as admin from 'firebase-admin';

/**
 * Contact Form Feature - Generates interactive contact form for CV
 */
export class ContactFormFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    const contactName = cv.personalInfo?.name || 'the CV owner';
    
    // Check for portal integration
    const portalUrls = await this.getPortalUrls(jobId);
    
    // Always use React component instead of legacy HTML
    return this.generateReactComponentPlaceholder(jobId, contactName, options, portalUrls);
  }
  
  /**
   * Get portal URLs for integration
   */
  private async getPortalUrls(jobId: string): Promise<any> {
    try {
      const db = admin.firestore();
      const portalDoc = await db
        .collection('portal_configs')
        .where('jobId', '==', jobId)
        .limit(1)
        .get();

      if (!portalDoc.empty) {
        const portalData = portalDoc.docs[0].data();
        return portalData.urls || null;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate React component placeholder for modern CV rendering
   */
  private generateReactComponentPlaceholder(jobId: string, contactName: string, options?: any, portalUrls?: any): string {
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      data: {
        contactName: contactName
      },
      isEnabled: true,
      customization: {
        title: options?.title || 'Get in Touch',
        buttonText: options?.buttonText || 'Send Message',
        theme: options?.theme || 'auto',
        showCompanyField: options?.showCompanyField !== false,
        showPhoneField: options?.showPhoneField !== false,
        maxRetries: 3
      },
      className: 'cv-contact-form',
      mode: 'public',
      portalUrls: portalUrls,
      enablePortalIntegration: portalUrls !== null
    };
    
    // Add portal integration section if portal exists
    const portalSection = portalUrls ? this.generatePortalIntegrationSection(portalUrls) : '';
    
    return `
      <div class="cv-feature-container contact-form-feature">
        <div class="react-component-placeholder" 
             data-component="ContactForm" 
             data-props='${JSON.stringify(componentProps).replace(/'/g, "&apos;")}'
             id="contact-form-${jobId}">
          <!-- React ContactForm component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading contact form...</p>
          </div>
        </div>
        ${portalSection}
      </div>
    `;
  }
  
  /**
   * Generate legacy HTML for backward compatibility
   */
  private generateLegacyHTML(formId: string, jobId: string, contactName: string, portalUrls?: any): string {
    // Add portal integration section if portal exists
    const portalSection = portalUrls ? this.generatePortalIntegrationSection(portalUrls) : '';
    return `
      <div class="contact-form-container" id="${formId}">
        <div class="contact-form-header">
          <h3>Get in Touch</h3>
          <p>Interested in connecting with ${contactName}? Send a message!</p>
        </div>
        
        <form class="contact-form" data-job-id="${jobId}" onsubmit="return false;">
          <div class="form-row">
            <div class="form-group">
              <label for="sender-name">Your Name *</label>
              <input 
                type="text" 
                id="sender-name" 
                name="senderName" 
                required 
                placeholder="Enter your full name"
              />
            </div>
            <div class="form-group">
              <label for="sender-email">Your Email *</label>
              <input 
                type="email" 
                id="sender-email" 
                name="senderEmail" 
                required 
                placeholder="your.email@company.com"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="sender-company">Company</label>
              <input 
                type="text" 
                id="sender-company" 
                name="senderCompany" 
                placeholder="Your company name"
              />
            </div>
            <div class="form-group">
              <label for="sender-phone">Phone</label>
              <input 
                type="tel" 
                id="sender-phone" 
                name="senderPhone" 
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="message-subject">Subject *</label>
            <select id="message-subject" name="subject" required>
              <option value="">Select a subject</option>
              <option value="job-opportunity">Job Opportunity</option>
              <option value="freelance-project">Freelance Project</option>
              <option value="collaboration">Collaboration</option>
              <option value="networking">Networking</option>
              <option value="consultation">Consultation</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="message-content">Message *</label>
            <textarea 
              id="message-content" 
              name="message" 
              required 
              placeholder="Tell ${contactName} about your opportunity, project, or how you'd like to connect..."
              maxlength="1000"
            ></textarea>
            <div class="character-count">
              <span class="current">0</span>/<span class="max">1000</span> characters
            </div>
          </div>
          
          <!-- Submit button removed - React component handles submission -->
          
          <div class="form-status" style="display: none;">
            <div class="status-success" style="display: none;">
              <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>Message sent successfully! ${contactName} will get back to you soon.</span>
            </div>
            <div class="status-error" style="display: none;">
              <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span class="error-message">Failed to send message. Please try again.</span>
            </div>
          </div>
        </form>
        
        ${portalSection}
      </div>
    `;
  }

  /**
   * Generate portal integration section
   */
  private generatePortalIntegrationSection(portalUrls: any): string {
    if (!portalUrls) return '';

    return `
      <div class="portal-integration-section">
        <div class="portal-header">
          <h4>🌐 Interactive Professional Portal</h4>
          <p>Experience my professional profile in an interactive format</p>
        </div>
        
        <div class="portal-actions">
          ${portalUrls.portal ? `
            <a href="${portalUrls.portal}" target="_blank" class="portal-btn primary">
              <svg class="portal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Visit Interactive Portal
            </a>
          ` : ''}
          
          ${portalUrls.chat ? `
            <a href="${portalUrls.chat}" target="_blank" class="portal-btn secondary">
              <svg class="portal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Chat with AI Assistant
            </a>
          ` : ''}
        </div>
        
        <div class="portal-features">
          <div class="feature-item">
            <span class="feature-icon">🤖</span>
            <span>AI-powered chat about my experience</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📊</span>
            <span>Interactive skills visualization</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">💼</span>
            <span>Portfolio gallery with projects</span>
          </div>
        </div>
      </div>
    `;
  }

  getStyles(): string {
    return `
      /* CV Feature Container Styles */
      .cv-feature-container.contact-form-feature {
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
      .react-fallback, .react-error {
        text-align: center;
        padding: 2rem;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }
      
      .fallback-header h3, .react-error h3 {
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
      
      .react-error p {
        color: #dc2626;
        margin: 0.5rem 0;
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
      
      /* Legacy Contact Form Styles */
      .contact-form-container {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 16px;
        padding: 2rem;
        margin: 2rem 0;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .contact-form-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      
      .contact-form-header h3 {
        color: #1e293b;
        font-size: 1.875rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }
      
      .contact-form-header p {
        color: #64748b;
        font-size: 1rem;
        margin: 0;
      }
      
      .contact-form {
        max-width: 600px;
        margin: 0 auto;
      }
      
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
      }
      
      .form-group label {
        color: #374151;
        font-weight: 600;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }
      
      .form-group input,
      .form-group select,
      .form-group textarea {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        padding: 0.75rem;
        font-size: 1rem;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      
      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #06b6d4;
        box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
      }
      
      .form-group textarea {
        resize: vertical;
        min-height: 120px;
        font-family: inherit;
      }
      
      .character-count {
        text-align: right;
        font-size: 0.75rem;
        color: #9ca3af;
        margin-top: 0.25rem;
      }
      
      /* Form actions removed - React component handles styling */
      
      .form-status {
        margin-top: 1rem;
        text-align: center;
      }
      
      .status-success,
      .status-error {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
        border-radius: 8px;
        font-weight: 500;
      }
      
      .status-success {
        background: #dcfdf7;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
      
      .status-error {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
      
      .status-icon {
        width: 20px;
        height: 20px;
      }
      
      /* Mobile Responsive */
      @media (max-width: 768px) {
        .contact-form-container {
          padding: 1.5rem;
          margin: 1rem 0;
        }
        
        .form-row {
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        
        .contact-form-header h3 {
          font-size: 1.5rem;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .contact-form-container {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }
        
        .contact-form-header h3 {
          color: #f1f5f9;
        }
        
        .contact-form-header p {
          color: #cbd5e1;
        }
        
        .form-group label {
          color: #e2e8f0;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
        
        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: #9ca3af;
        }
        
        .character-count {
          color: #6b7280;
        }
        
        /* Portal Integration Dark Mode */
        .portal-integration-section {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }
        
        .portal-header h4 {
          color: #f1f5f9;
        }
        
        .portal-header p {
          color: #cbd5e1;
        }
        
        .portal-btn.primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }
        
        .portal-btn.secondary {
          background: #374151;
          border-color: #4b5563;
          color: #e2e8f0;
        }
        
        .feature-item span:not(.feature-icon) {
          color: #cbd5e1;
        }
      }
      
      /* Portal Integration Styles */
      .portal-integration-section {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 2px solid #0ea5e9;
        border-radius: 16px;
        padding: 1.5rem;
        margin-top: 2rem;
        text-align: center;
      }
      
      .portal-header h4 {
        color: #0c4a6e;
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      
      .portal-header p {
        color: #075985;
        font-size: 0.875rem;
        margin: 0 0 1.5rem 0;
      }
      
      .portal-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }
      
      .portal-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.875rem;
        transition: all 0.2s ease;
        border: none;
        cursor: pointer;
      }
      
      .portal-btn.primary {
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
        color: white;
      }
      
      .portal-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px -4px rgba(14, 165, 233, 0.4);
      }
      
      .portal-btn.secondary {
        background: white;
        border: 2px solid #0ea5e9;
        color: #0ea5e9;
      }
      
      .portal-btn.secondary:hover {
        background: #f0f9ff;
        transform: translateY(-1px);
      }
      
      .portal-icon {
        width: 16px;
        height: 16px;
      }
      
      .portal-features {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
        padding-top: 1rem;
        border-top: 1px solid #bae6fd;
      }
      
      .feature-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: #075985;
      }
      
      .feature-icon {
        font-size: 1rem;
      }
      
      /* Portal Integration Mobile Responsive */
      @media (max-width: 768px) {
        .portal-actions {
          flex-direction: column;
          align-items: center;
        }
        
        .portal-btn {
          width: 100%;
          max-width: 250px;
        }
        
        .portal-features {
          grid-template-columns: 1fr;
          text-align: left;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React ContactForm components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="ContactForm"]');
          
          if (placeholders.length === 0) {
            return false;
          }
          
          
          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));
              
              
              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                window.renderReactComponent('ContactForm', props, placeholder);
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
          placeholder.innerHTML = \`
            <div class="react-fallback">
              <div class="fallback-header">
                <h3>\${props.customization?.title || 'Get in Touch'}</h3>
                <p>Contact \${props.data?.contactName || 'the CV owner'}</p>
              </div>
              <div class="fallback-message">
                <p>📧 <strong>Email:</strong> Please contact directly via email</p>
                <p>💼 <strong>LinkedIn:</strong> Connect on LinkedIn for professional inquiries</p>
                <p>📱 <strong>Phone:</strong> Call for immediate opportunities</p>
              </div>
              <div class="fallback-note">
                <small>Contact form requires JavaScript and React to be enabled</small>
              </div>
            </div>
          \`;
        }
        
        // Show error when React props parsing fails
        function showReactError(placeholder, errorMessage) {
          placeholder.innerHTML = \`
            <div class="react-error">
              <h3>Contact Form Error</h3>
              <p>Unable to load contact form: \${errorMessage}</p>
              <p>Please contact directly via the information provided in the CV.</p>
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
        window.ContactFormFeature = {
          initReactComponents
        };
        
        // Global function to re-initialize components (useful for dynamic content)
        window.initContactForms = initReactComponents;
        
      })();
    `;
  }
}