// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';

/**
 * Achievements Showcase Feature - Generates interactive achievements showcase for CV
 */
export class AchievementsShowcaseFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    const contactName = cv.personalInfo?.name || 'the CV owner';
    
    // Always use React component instead of legacy HTML
    return this.generateReactComponentPlaceholder(jobId, contactName, cv, options);
  }
  
  /**
   * Generate React component placeholder for modern CV rendering
   */
  private generateReactComponentPlaceholder(jobId: string, contactName: string, cv: ParsedCV, options?: any): string {
    // Extract achievements from CV data
    const achievements = this.extractAchievements(cv);
    
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      data: {
        achievements: achievements,
        totalAchievements: achievements.length,
        highlightedAchievements: this.getHighlightedAchievements(achievements),
        contactName: contactName
      },
      isEnabled: true,
      customization: {
        layout: options?.layout || 'grid',
        animationType: options?.animationType || 'fade',
        showMetrics: options?.showMetrics !== false,
        showIcons: options?.showIcons !== false,
        cardSize: options?.cardSize || 'medium',
        colorScheme: options?.colorScheme || 'default',
        title: options?.title || `${contactName}'s Key Achievements`
      },
      className: 'cv-achievements-showcase',
      mode: 'public',
      // Achievement-specific handlers
      onUpdate: 'handleAchievementUpdate',
      onError: 'handleAchievementError'
    };
    
    return `
      <div class="cv-feature-container achievements-showcase-feature">
        <div class="react-component-placeholder" 
             data-component="AchievementCards" 
             data-props='${JSON.stringify(componentProps).replace(/'/g, "&apos;")}'
             id="achievements-showcase-${jobId}">
          <!-- React AchievementCards component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading achievements showcase...</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Extract achievements from CV data
   */
  private extractAchievements(cv: ParsedCV): any[] {
    const achievements: any[] = [];

    // Work achievements
    if (cv.experience) {
      cv.experience.forEach((exp, expIndex) => {
        if (exp.achievements && exp.achievements.length > 0) {
          exp.achievements.forEach((achievement, achIndex) => {
            achievements.push({
              id: `work-${expIndex}-${achIndex}`,
              title: achievement,
              description: `Professional achievement at ${exp.company}`,
              impact: `Contributing to success as ${exp.position}`,
              category: 'work',
              date: exp.startDate,
              importance: 'high', // Work achievements are typically high importance
              icon: '💼',
              tags: [exp.company, exp.position],
              metrics: this.extractMetricsFromDescription(achievement)
            });
          });
        }

        // If no specific achievements listed, create one from the role
        if (!exp.achievements || exp.achievements.length === 0) {
          achievements.push({
            id: `work-${expIndex}-general`,
            title: `${exp.position} at ${exp.company}`,
            description: exp.description || `Served as ${exp.position}`,
            impact: 'Professional experience and skill development',
            category: 'work',
            date: exp.startDate,
            importance: 'medium',
            icon: '💼',
            tags: [exp.company, exp.position, ...(exp.technologies || [])],
            metrics: [{
              label: 'Duration',
              value: this.calculateDuration(exp.startDate, exp.endDate),
              type: 'time'
            }]
          });
        }
      });
    }

    // Education achievements
    if (cv.education) {
      cv.education.forEach((edu, index) => {
        achievements.push({
          id: `education-${index}`,
          title: `${edu.degree} in ${edu.field}`,
          description: `Graduated from ${edu.institution}`,
          impact: 'Academic foundation for professional career',
          category: 'education',
          date: edu.graduationDate,
          importance: edu.honors && edu.honors.length > 0 ? 'high' : 'medium',
          icon: '🎓',
          tags: [edu.institution, edu.degree, edu.field, ...(edu.honors || [])],
          metrics: [
            {
              label: 'Institution',
              value: edu.institution,
              type: 'text'
            },
            ...(edu.gpa ? [{
              label: 'GPA',
              value: edu.gpa,
              type: 'text'
            }] : [])
          ]
        });

        // Add specific honors as separate achievements
        if (edu.honors && edu.honors.length > 0) {
          edu.honors.forEach((honor, honorIndex) => {
            achievements.push({
              id: `education-honor-${index}-${honorIndex}`,
              title: honor,
              description: `Academic honor received during ${edu.degree} studies`,
              impact: 'Recognition of academic excellence',
              category: 'education',
              date: edu.graduationDate,
              importance: 'high',
              icon: '🏆',
              tags: [edu.institution, honor, 'academic excellence'],
              metrics: []
            });
          });
        }
      });
    }

    // Certification achievements
    if (cv.certifications) {
      cv.certifications.forEach((cert, index) => {
        achievements.push({
          id: `certification-${index}`,
          title: cert.name,
          description: `Professional certification from ${cert.issuer}`,
          impact: 'Enhanced professional credentials and expertise',
          category: 'certification',
          date: cert.date,
          importance: 'high',
          icon: '📜',
          tags: [cert.issuer, cert.name, 'certification'],
          metrics: [
            {
              label: 'Issuer',
              value: cert.issuer,
              type: 'text'
            },
            ...(cert.credentialId ? [{
              label: 'Credential ID',
              value: cert.credentialId,
              type: 'text'
            }] : [])
          ]
        });
      });
    }

    // Project achievements
    if (cv.projects) {
      cv.projects.forEach((project, index) => {
        achievements.push({
          id: `project-${index}`,
          title: project.name,
          description: project.description || `Completed project: ${project.name}`,
          impact: 'Demonstrated technical skills and project delivery',
          category: 'project',
          date: undefined, // Projects don't have dates in the schema
          importance: 'medium',
          icon: '🚀',
          tags: [project.name, ...(project.technologies || [])], // Projects don't have company in schema
          metrics: [
            // Projects don't have achievements array in schema, use generic metrics
            {
              label: 'Technology Stack',
              value: (project.technologies || []).join(', ') || 'N/A',
              type: 'text'
            },
            {
              label: 'Project Link',
              value: project.link || 'Not available',
              type: 'text'
            }
          ]
        });
      });
    }

    // Skills as achievements (for technical skills with high proficiency)
    if (cv.skills && cv.skills.technical) {
      const topSkills = cv.skills.technical.slice(0, 5); // Take top 5 skills
      topSkills.forEach((skill, index) => {
        achievements.push({
          id: `skill-${index}`,
          title: `${skill} Expertise`,
          description: `Proficient in ${skill} technology`,
          impact: 'Technical capability that adds value to projects',
          category: 'skill',
          date: new Date().toISOString(), // Current date for skills
          importance: 'low',
          icon: '⚡',
          tags: [skill, 'technical skill', 'expertise'],
          metrics: []
        });
      });
    }

    // Sort achievements by importance and date
    return achievements.sort((a, b) => {
      const importanceOrder = { high: 3, medium: 2, low: 1 };
      const importanceDiff = importanceOrder[b.importance] - importanceOrder[a.importance];
      
      if (importanceDiff !== 0) return importanceDiff;
      
      // If same importance, sort by date (newest first)
      const dateA = new Date(a.date || '1970-01-01').getTime();
      const dateB = new Date(b.date || '1970-01-01').getTime();
      return dateB - dateA;
    });
  }

  /**
   * Get highlighted achievements (high importance ones)
   */
  private getHighlightedAchievements(achievements: any[]): string[] {
    return achievements
      .filter(ach => ach.importance === 'high')
      .slice(0, 3) // Take top 3 high importance achievements
      .map(ach => ach.id);
  }

  /**
   * Calculate duration between two dates
   */
  private calculateDuration(startDate: string, endDate?: string): string {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                      (end.getMonth() - start.getMonth());
    
    if (monthsDiff < 12) {
      return `${monthsDiff} month${monthsDiff !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(monthsDiff / 12);
      const remainingMonths = monthsDiff % 12;
      return remainingMonths > 0 
        ? `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
        : `${years} year${years !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Extract metrics from achievement descriptions (basic text analysis)
   */
  private extractMetricsFromDescription(description: string): any[] {
    const metrics: any[] = [];
    
    // Look for percentages
    const percentageMatch = description.match(/(\d+(?:\.\d+)?)%/g);
    if (percentageMatch) {
      percentageMatch.forEach(match => {
        metrics.push({
          label: 'Improvement',
          value: parseFloat(match.replace('%', '')),
          type: 'percentage'
        });
      });
    }
    
    // Look for dollar amounts
    const currencyMatch = description.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (currencyMatch) {
      currencyMatch.forEach(match => {
        metrics.push({
          label: 'Value',
          value: match.replace(/[$,]/g, ''),
          type: 'currency'
        });
      });
    }
    
    // Look for numbers with context
    const numberMatch = description.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s+(users?|customers?|projects?|teams?|people|months?|years?|days?)/gi);
    if (numberMatch) {
      numberMatch.forEach(match => {
        const [, number, unit] = match.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s+(.+)/i) || [];
        if (number && unit) {
          metrics.push({
            label: unit.charAt(0).toUpperCase() + unit.slice(1),
            value: parseFloat(number.replace(/,/g, '')),
            type: 'number'
          });
        }
      });
    }
    
    return metrics;
  }

  getStyles(): string {
    return `
      /* CV Achievements Showcase Feature Container Styles */
      .cv-feature-container.achievements-showcase-feature {
        margin: 2rem 0;
      }
      
      /* React Component Placeholder Styles */
      .react-component-placeholder[data-component="AchievementCards"] {
        min-height: 600px;
        position: relative;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 16px;
        padding: 2rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      /* Loading state for achievements */
      .achievements-showcase-feature .component-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 500px;
        color: #64748b;
      }
      
      .achievements-showcase-feature .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #06b6d4;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      /* Achievements fallback styles */
      .achievements-fallback {
        text-align: center;
        padding: 3rem;
        background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
        border-radius: 16px;
        border: 2px solid #10b981;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      
      .achievements-fallback-header {
        margin-bottom: 2rem;
      }
      
      .achievements-fallback-header h3 {
        color: #065f46;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 0.75rem 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      
      .achievements-fallback-header p {
        color: #047857;
        font-size: 1.1rem;
        margin: 0;
      }
      
      .achievements-fallback-content {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        margin: 2rem auto;
        max-width: 700px;
        text-align: left;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .achievements-fallback-content h4 {
        color: #1e293b;
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 1.5rem 0;
      }
      
      .achievements-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      
      .achievement-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.2s ease;
      }
      
      .achievement-card:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      .achievement-card-header {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      
      .achievement-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }
      
      .achievement-card-header h5 {
        color: #1e293b;
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
        line-height: 1.4;
      }
      
      .achievement-category {
        display: inline-block;
        background: #e2e8f0;
        color: #475569;
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: capitalize;
      }
      
      .achievement-category.work {
        background: #dbeafe;
        color: #1d4ed8;
      }
      
      .achievement-category.education {
        background: #fce7f3;
        color: #be185d;
      }
      
      .achievement-category.certification {
        background: #fef3c7;
        color: #d97706;
      }
      
      .achievement-category.project {
        background: #dcfce7;
        color: #16a34a;
      }
      
      .achievement-description {
        color: #64748b;
        font-size: 0.875rem;
        line-height: 1.5;
        margin-bottom: 1rem;
      }
      
      .achievement-date {
        color: #9ca3af;
        font-size: 0.75rem;
        font-weight: 500;
      }
      
      .achievements-summary {
        background: #f8fafc;
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        border: 1px solid #e2e8f0;
        margin-top: 2rem;
      }
      
      .achievements-summary h5 {
        color: #10b981;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        font-size: 0.875rem;
      }
      
      .achievements-summary p {
        color: #64748b;
        font-size: 0.8rem;
        margin: 0;
        line-height: 1.5;
      }
      
      .achievements-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-top: 2rem;
      }
      
      .achievement-stat {
        text-align: center;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      
      .achievement-stat-number {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 0.25rem;
      }
      
      .achievement-stat-label {
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .react-component-placeholder[data-component="AchievementCards"] {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }
        
        .achievements-fallback {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #10b981;
        }
        
        .achievements-fallback-header h3 {
          color: #f1f5f9;
        }
        
        .achievements-fallback-header p {
          color: #cbd5e1;
        }
        
        .achievements-fallback-content {
          background: #374151;
        }
        
        .achievements-fallback-content h4 {
          color: #f1f5f9;
        }
        
        .achievement-card {
          background: #4b5563;
          border-color: #6b7280;
        }
        
        .achievement-card:hover {
          background: #374151;
          border-color: #9ca3af;
        }
        
        .achievement-card-header h5 {
          color: #f1f5f9;
        }
        
        .achievement-description {
          color: #d1d5db;
        }
        
        .achievement-date {
          color: #9ca3af;
        }
        
        .achievements-summary {
          background: #4b5563;
          border-color: #6b7280;
        }
        
        .achievements-summary h5 {
          color: #34d399;
        }
        
        .achievements-summary p {
          color: #d1d5db;
        }
        
        .achievement-stat {
          background: #4b5563;
          border-color: #6b7280;
        }
        
        .achievement-stat-number {
          color: #f1f5f9;
        }
        
        .achievement-stat-label {
          color: #9ca3af;
        }
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        .cv-feature-container.achievements-showcase-feature {
          margin: 1rem 0;
        }
        
        .react-component-placeholder[data-component="AchievementCards"] {
          padding: 1.5rem;
        }
        
        .achievements-fallback {
          padding: 2rem;
        }
        
        .achievements-fallback-content {
          margin: 1.5rem auto;
          padding: 1.5rem;
        }
        
        .achievements-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        .achievement-card {
          padding: 1rem;
        }
        
        .achievements-stats {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React AchievementCards components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="AchievementCards"]');
          
          if (placeholders.length === 0) {
            return false;
          }
          
          
          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));
              
              
              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                window.renderReactComponent('AchievementCards', props, placeholder);
              } else {
                showAchievementsFallback(placeholder, props);
              }
            } catch (error) {
              showAchievementsError(placeholder, error.message);
            }
          });
          
          return true;
        }
        
        // Show fallback when React renderer is not available
        function showAchievementsFallback(placeholder, props) {
          const achievements = props.data?.achievements || [];
          const contactName = props.data?.contactName || 'the CV owner';
          const totalAchievements = achievements.length;
          
          // Group achievements by category
          const achievementsByCategory = achievements.reduce((acc, achievement) => {
            if (!acc[achievement.category]) acc[achievement.category] = [];
            acc[achievement.category].push(achievement);
            return acc;
          }, {});
          
          // Get stats
          const highPriorityCount = achievements.filter(a => a.importance === 'high').length;
          const categoriesCount = Object.keys(achievementsByCategory).length;
          const withMetricsCount = achievements.filter(a => a.metrics && a.metrics.length > 0).length;
          
          placeholder.innerHTML = \`
            <div class="achievements-fallback">
              <div class="achievements-fallback-header">
                <h3>🏆 \${props.customization?.title || contactName + "'s Key Achievements"}</h3>
                <p>Showcase of \${totalAchievements} professional achievements and accomplishments</p>
              </div>
              <div class="achievements-fallback-content">
                <h4>🎯 Featured Achievements</h4>
                <div class="achievements-grid">
                  \${achievements.slice(0, 6).map(achievement => \`
                    <div class="achievement-card">
                      <div class="achievement-card-header">
                        <div class="achievement-icon">\${achievement.icon || '🎯'}</div>
                        <div>
                          <h5>\${achievement.title}</h5>
                          <span class="achievement-category \${achievement.category}">\${achievement.category}</span>
                        </div>
                      </div>
                      <div class="achievement-description">\${achievement.description}</div>
                      \${achievement.date ? \`<div class="achievement-date">\${new Date(achievement.date).getFullYear()}</div>\` : ''}
                    </div>
                  \`).join('')}
                </div>
                
                <div class="achievements-stats">
                  <div class="achievement-stat">
                    <div class="achievement-stat-number">\${totalAchievements}</div>
                    <div class="achievement-stat-label">Total</div>
                  </div>
                  <div class="achievement-stat">
                    <div class="achievement-stat-number">\${highPriorityCount}</div>
                    <div class="achievement-stat-label">High Priority</div>
                  </div>
                  <div class="achievement-stat">
                    <div class="achievement-stat-number">\${categoriesCount}</div>
                    <div class="achievement-stat-label">Categories</div>
                  </div>
                  <div class="achievement-stat">
                    <div class="achievement-stat-number">\${withMetricsCount}</div>
                    <div class="achievement-stat-label">With Metrics</div>
                  </div>
                </div>
                
                <div class="achievements-summary">
                  <h5>⚡ Interactive Features</h5>
                  <p>Full achievements showcase with filtering, sorting, detailed metrics, and interactive cards requires JavaScript and React to be enabled in your browser.</p>
                </div>
              </div>
            </div>
          \`;
        }
        
        // Show error when React props parsing fails
        function showAchievementsError(placeholder, errorMessage) {
          placeholder.innerHTML = \`
            <div class="achievements-fallback" style="border-color: #dc2626;">
              <div class="achievements-fallback-header">
                <h3 style="color: #dc2626;">❌ Achievements Showcase Error</h3>
                <p style="color: #b91c1c;">Unable to load achievements showcase: \${errorMessage}</p>
              </div>
              <div class="achievements-fallback-content">
                <p style="color: #6b7280; text-align: center;">
                  Please contact for detailed information about professional achievements and accomplishments.
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
        window.AchievementCardsFeature = {
          initReactComponents
        };
        
        // Global function to re-initialize components (useful for dynamic content)
        window.initAchievementCards = initReactComponents;
        
      })();
    `;
  }
}