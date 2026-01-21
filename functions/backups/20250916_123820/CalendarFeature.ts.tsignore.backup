// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';

/**
 * Calendar Feature - Generates interactive calendar integration for CV
 */
export class CalendarFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    const contactName = cv.personalInfo?.name || 'the CV owner';
    
    // Always use React component instead of legacy HTML
    return this.generateReactComponentPlaceholder(jobId, contactName, cv, options);
  }
  
  /**
   * Generate React component placeholder for modern CV rendering
   */
  private generateReactComponentPlaceholder(jobId: string, contactName: string, cv: ParsedCV, options?: any): string {
    // Extract calendar events from CV data
    const events = this.extractCalendarEvents(cv);
    
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      events: events,
      data: {
        contactName: contactName,
        totalEvents: events.length
      },
      isEnabled: true,
      customization: {
        title: options?.title || 'Career Milestones Calendar',
        theme: options?.theme || 'auto',
        showWorkAnniversaries: options?.showWorkAnniversaries !== false,
        showCertificationReminders: options?.showCertificationReminders !== false,
        showEducationMilestones: options?.showEducationMilestones !== false,
        providers: options?.providers || ['google', 'outlook', 'ical']
      },
      className: 'cv-calendar-integration',
      mode: 'public',
      // Calendar-specific handlers
      onGenerateEvents: 'generateCalendarEvents',
      onSyncGoogle: 'syncGoogleCalendar',
      onSyncOutlook: 'syncOutlookCalendar',
      onDownloadICal: 'downloadICalFile'
    };
    
    return `
      <div class="cv-feature-container calendar-integration-feature">
        <div class="react-component-placeholder" 
             data-component="CalendarIntegration" 
             data-props='${JSON.stringify(componentProps).replace(/'/g, "&apos;")}'
             id="calendar-integration-${jobId}">
          <!-- React CalendarIntegration component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading calendar integration...</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Extract calendar events from CV data
   */
  private extractCalendarEvents(cv: ParsedCV): any[] {
    const events: any[] = [];

    // Work anniversaries
    if (cv.experience) {
      cv.experience.forEach((exp, index) => {
        if (exp.startDate) {
          const startDate = new Date(exp.startDate);
          const currentYear = new Date().getFullYear();
          
          events.push({
            id: `work-anniversary-${index}`,
            title: `${exp.company} Work Anniversary`,
            description: `Anniversary of starting as ${exp.position} at ${exp.company}`,
            startDate: new Date(currentYear, startDate.getMonth(), startDate.getDate()).toISOString(),
            allDay: true,
            type: 'work',
            recurring: {
              frequency: 'yearly',
              interval: 1
            }
          });
        }
      });
    }

    // Education milestones
    if (cv.education) {
      cv.education.forEach((edu, index) => {
        if (edu.graduationDate) {
          const gradDate = new Date(edu.graduationDate);
          
          events.push({
            id: `education-milestone-${index}`,
            title: `${edu.degree} Graduation Anniversary`,
            description: `Graduated ${edu.degree} from ${edu.institution}`,
            startDate: new Date(gradDate.getFullYear() + 1, gradDate.getMonth(), gradDate.getDate()).toISOString(),
            allDay: true,
            type: 'education',
            recurring: {
              frequency: 'yearly',
              interval: 1
            }
          });
        }
      });
    }

    // Certification renewals (based on issue date, assume 1 year validity)
    if (cv.certifications) {
      cv.certifications.forEach((cert, index) => {
        if (cert.date) {
          const issueDate = new Date(cert.date);
          const reminderDate = new Date(issueDate);
          reminderDate.setFullYear(reminderDate.getFullYear() + 1); // Assume 1 year validity
          reminderDate.setMonth(reminderDate.getMonth() - 2); // 2 months before renewal
          
          events.push({
            id: `certification-renewal-${index}`,
            title: `${cert.name} Renewal Due`,
            description: `Time to renew your ${cert.name} certification issued by ${cert.issuer}`,
            startDate: reminderDate.toISOString(),
            allDay: true,
            type: 'certification',
            recurring: {
              frequency: 'yearly',
              interval: 1
            }
          });
        }
      });
    }

    // Sort events by date
    return events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  getStyles(): string {
    return `
      /* CV Calendar Feature Container Styles */
      .cv-feature-container.calendar-integration-feature {
        margin: 2rem 0;
      }
      
      /* React Component Placeholder Styles */
      .react-component-placeholder[data-component="CalendarIntegration"] {
        min-height: 500px;
        position: relative;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 16px;
        padding: 2rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      /* Loading state for calendar */
      .calendar-integration-feature .component-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 400px;
        color: #64748b;
      }
      
      .calendar-integration-feature .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #06b6d4;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      /* Calendar fallback styles */
      .calendar-fallback {
        text-align: center;
        padding: 3rem;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border-radius: 16px;
        border: 2px solid #0ea5e9;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .calendar-fallback-header {
        margin-bottom: 2rem;
      }
      
      .calendar-fallback-header h3 {
        color: #0c4a6e;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 0.75rem 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      
      .calendar-fallback-header p {
        color: #075985;
        font-size: 1.1rem;
        margin: 0;
      }
      
      .calendar-fallback-content {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        margin: 2rem auto;
        max-width: 500px;
        text-align: left;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .calendar-fallback-content h4 {
        color: #1e293b;
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 1rem 0;
      }
      
      .calendar-features-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .calendar-features-list li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid #f1f5f9;
        color: #475569;
      }
      
      .calendar-features-list li:last-child {
        border-bottom: none;
      }
      
      .calendar-features-list .feature-icon {
        font-size: 1.25rem;
        width: 2rem;
        text-align: center;
      }
      
      .calendar-providers {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-top: 2rem;
      }
      
      .calendar-provider {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        text-decoration: none;
        color: #64748b;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      
      .calendar-provider:hover {
        background: #e2e8f0;
        color: #475569;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      .calendar-provider-icon {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
      }
      
      .calendar-fallback-note {
        background: #fef3c7;
        border: 1px solid #fbbf24;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 2rem;
        text-align: left;
      }
      
      .calendar-fallback-note h5 {
        color: #92400e;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        font-size: 0.875rem;
      }
      
      .calendar-fallback-note p {
        color: #b45309;
        font-size: 0.8rem;
        margin: 0;
        line-height: 1.5;
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .react-component-placeholder[data-component="CalendarIntegration"] {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }
        
        .calendar-fallback {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #0ea5e9;
        }
        
        .calendar-fallback-header h3 {
          color: #f1f5f9;
        }
        
        .calendar-fallback-header p {
          color: #cbd5e1;
        }
        
        .calendar-fallback-content {
          background: #374151;
        }
        
        .calendar-fallback-content h4 {
          color: #f1f5f9;
        }
        
        .calendar-features-list li {
          color: #cbd5e1;
          border-color: #4b5563;
        }
        
        .calendar-provider {
          background: #374151;
          border-color: #4b5563;
          color: #9ca3af;
        }
        
        .calendar-provider:hover {
          background: #4b5563;
          color: #d1d5db;
        }
        
        .calendar-fallback-note {
          background: #422006;
          border-color: #d97706;
        }
        
        .calendar-fallback-note h5 {
          color: #fbbf24;
        }
        
        .calendar-fallback-note p {
          color: #f59e0b;
        }
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .cv-feature-container.calendar-integration-feature {
          margin: 1rem 0;
        }
        
        .react-component-placeholder[data-component="CalendarIntegration"] {
          padding: 1.5rem;
        }
        
        .calendar-fallback {
          padding: 2rem;
        }
        
        .calendar-fallback-content {
          margin: 1.5rem auto;
          padding: 1.5rem;
        }
        
        .calendar-providers {
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React CalendarIntegration components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="CalendarIntegration"]');
          
          if (placeholders.length === 0) {
            return false;
          }
          
          
          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));
              
              
              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                window.renderReactComponent('CalendarIntegration', props, placeholder);
              } else {
                showCalendarFallback(placeholder, props);
              }
            } catch (error) {
              showCalendarError(placeholder, error.message);
            }
          });
          
          return true;
        }
        
        // Show fallback when React renderer is not available
        function showCalendarFallback(placeholder, props) {
          const events = props.events || [];
          const contactName = props.data?.contactName || 'the CV owner';
          
          placeholder.innerHTML = \`
            <div class="calendar-fallback">
              <div class="calendar-fallback-header">
                <h3>📅 \${props.customization?.title || 'Career Milestones Calendar'}</h3>
                <p>Sync \${contactName}'s career milestones with your calendar</p>
              </div>
              <div class="calendar-fallback-content">
                <h4>📊 Calendar Summary</h4>
                <ul class="calendar-features-list">
                  <li>
                    <span class="feature-icon">💼</span>
                    <span>Work anniversaries and milestones</span>
                  </li>
                  <li>
                    <span class="feature-icon">🎓</span>
                    <span>Education completion dates</span>
                  </li>
                  <li>
                    <span class="feature-icon">📜</span>
                    <span>Certification renewal reminders</span>
                  </li>
                  <li>
                    <span class="feature-icon">🔔</span>
                    <span>Career review reminders</span>
                  </li>
                </ul>
                \${events.length > 0 ? \`
                  <div style="margin-top: 1.5rem;">
                    <strong style="color: #0ea5e9;">\${events.length} events generated</strong> from CV data
                  </div>
                \` : ''}
              </div>
              <div class="calendar-providers">
                <a href="#" class="calendar-provider">
                  <span class="calendar-provider-icon">📅</span>
                  Google Calendar
                </a>
                <a href="#" class="calendar-provider">
                  <span class="calendar-provider-icon">📆</span>
                  Outlook
                </a>
                <a href="#" class="calendar-provider">
                  <span class="calendar-provider-icon">📋</span>
                  Download .ics
                </a>
              </div>
              <div class="calendar-fallback-note">
                <h5>⚡ Interactive Features</h5>
                <p>Full calendar integration with sync capabilities requires JavaScript and React to be enabled in your browser.</p>
              </div>
            </div>
          \`;
        }
        
        // Show error when React props parsing fails
        function showCalendarError(placeholder, errorMessage) {
          placeholder.innerHTML = \`
            <div class="calendar-fallback" style="border-color: #dc2626;">
              <div class="calendar-fallback-header">
                <h3 style="color: #dc2626;">❌ Calendar Integration Error</h3>
                <p style="color: #b91c1c;">Unable to load calendar integration: \${errorMessage}</p>
              </div>
              <div class="calendar-fallback-content">
                <p style="color: #6b7280; text-align: center;">
                  Please contact \${contactName || 'the CV owner'} directly to discuss career milestones and important dates.
                </p>
              </div>
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
        window.CalendarIntegrationFeature = {
          initReactComponents
        };
        
        // Global function to re-initialize components (useful for dynamic content)
        window.initCalendarIntegration = initReactComponents;
        
      })();
    `;
  }
}