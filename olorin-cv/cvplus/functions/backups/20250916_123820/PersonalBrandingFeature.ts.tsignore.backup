// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';
import * as admin from 'firebase-admin';

/**
 * Personal Branding Feature - Generates AI-powered personality insights and personal branding
 */
export class PersonalBrandingFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    const componentData = this.extractComponentData(cv);
    
    // Check for additional branding data from AI analysis
    const brandingData = await this.getBrandingData(jobId);
    
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      data: {
        ...componentData,
        ...brandingData
      },
      isEnabled: true,
      customization: {
        includeCareerSuggestions: options?.includeCareerSuggestions !== false,
        includeWorkStyle: options?.includeWorkStyle !== false,
        displayMode: options?.displayMode || 'overview',
        theme: options?.theme || 'auto'
      },
      className: 'cv-personal-branding',
      mode: 'public'
    };
    
    return this.generateReactComponentPlaceholder(jobId, componentProps);
  }
  
  /**
   * Extract relevant personal branding data from CV
   */
  private extractComponentData(cv: ParsedCV): any {
    const skills = cv.skills || { technical: [], soft: [], languages: [] };
    const experience = cv.experience || [];
    const personalInfo = cv.personalInfo || {};
    
    // Extract traits from skills and experience for basic personality mapping
    const extractedTraits = {
      leadership: this.calculateLeadershipScore(experience),
      communication: this.calculateCommunicationScore(experience, skills),
      innovation: this.calculateInnovationScore(experience, skills),
      teamwork: this.calculateTeamworkScore(experience),
      problemSolving: this.calculateProblemSolvingScore(skills, experience),
      attention_to_detail: this.calculateDetailScore(experience),
      adaptability: this.calculateAdaptabilityScore(experience),
      strategic_thinking: this.calculateStrategicScore(experience)
    };
    
    // Analyze work style from experience descriptions
    const workStyle = this.analyzeWorkStyle(experience);
    
    // Determine team compatibility from experience
    const teamCompatibility = this.analyzeTeamCompatibility(experience);
    
    // Calculate leadership potential
    const leadershipPotential = extractedTraits.leadership;
    
    // Analyze culture fit preferences
    const cultureFit = this.analyzeCultureFit(experience, skills);
    
    // Generate personality summary
    const summary = this.generatePersonalitySummary(extractedTraits, workStyle, personalInfo);
    
    return {
      traits: extractedTraits,
      workStyle,
      teamCompatibility,
      leadershipPotential,
      cultureFit,
      summary,
      personalInfo
    };
  }
  
  /**
   * Get additional branding data from AI analysis if available
   */
  private async getBrandingData(jobId: string): Promise<any> {
    try {
      const db = admin.firestore();
      const brandingDoc = await db
        .collection('personality_analysis')
        .doc(jobId)
        .get();

      if (brandingDoc.exists) {
        return brandingDoc.data() || {};
      }

      return {};
    } catch (error) {
      return {};
    }
  }
  
  /**
   * Calculate leadership score based on experience
   */
  private calculateLeadershipScore(experience: any[]): number {
    let score = 5; // Base score
    
    for (const exp of experience) {
      const description = (exp.description || '').toLowerCase();
      const position = (exp.position || '').toLowerCase();
      
      // Check for leadership keywords in position titles
      if (position.includes('lead') || position.includes('manager') || 
          position.includes('director') || position.includes('head') ||
          position.includes('chief') || position.includes('senior')) {
        score += 1.5;
      }
      
      // Check for leadership activities in descriptions
      if (description.includes('led') || description.includes('managed') ||
          description.includes('supervised') || description.includes('mentored') ||
          description.includes('guided') || description.includes('coordinated')) {
        score += 1;
      }
    }
    
    return Math.min(score, 10);
  }
  
  /**
   * Calculate communication score
   */
  private calculateCommunicationScore(experience: any[], skills: any): number {
    let score = 5;
    
    // Check skills for communication-related abilities
    const allSkills = [...(skills.technical || []), ...(skills.soft || []), ...(skills.languages || [])];
    const communicationSkills = allSkills.filter((skill: any) => 
      skill && (
        skill.toLowerCase().includes('communication') ||
        skill.toLowerCase().includes('presentation') ||
        skill.toLowerCase().includes('writing') ||
        skill.toLowerCase().includes('speaking')
      )
    );
    score += communicationSkills.length * 0.5;
    
    // Check experience for communication activities
    for (const exp of experience) {
      const description = (exp.description || '').toLowerCase();
      if (description.includes('presented') || description.includes('communicated') ||
          description.includes('collaborated') || description.includes('documented')) {
        score += 0.8;
      }
    }
    
    return Math.min(score, 10);
  }
  
  /**
   * Calculate innovation score
   */
  private calculateInnovationScore(experience: any[], skills: any): number {
    let score = 4;
    
    // Check for innovation-related keywords
    for (const exp of experience) {
      const description = (exp.description || '').toLowerCase();
      if (description.includes('innovative') || description.includes('created') ||
          description.includes('developed') || description.includes('designed') ||
          description.includes('implemented') || description.includes('optimized')) {
        score += 1;
      }
    }
    
    // Check for technical skills that indicate innovation capacity
    const techSkills = (skills.technical || []).filter((skill: any) => 
      skill && (
        skill.toLowerCase().includes('javascript') ||
        skill.toLowerCase().includes('python') ||
        skill.toLowerCase().includes('react') ||
        skill.toLowerCase().includes('ai') ||
        skill.toLowerCase().includes('machine learning')
      )
    );
    score += techSkills.length * 0.3;
    
    return Math.min(score, 10);
  }
  
  /**
   * Calculate teamwork score
   */
  private calculateTeamworkScore(experience: any[]): number {
    let score = 5;
    
    for (const exp of experience) {
      const description = (exp.description || '').toLowerCase();
      if (description.includes('team') || description.includes('collaborated') ||
          description.includes('partnership') || description.includes('cross-functional')) {
        score += 1;
      }
    }
    
    return Math.min(score, 10);
  }
  
  /**
   * Calculate problem solving score
   */
  private calculateProblemSolvingScore(skills: any, experience: any[]): number {
    let score = 5;
    
    // Check for analytical skills
    const allSkills = [...(skills.technical || []), ...(skills.soft || [])];
    const analyticalSkills = allSkills.filter((skill: any) => 
      skill && (
        skill.toLowerCase().includes('analysis') ||
        skill.toLowerCase().includes('problem') ||
        skill.toLowerCase().includes('debugging') ||
        skill.toLowerCase().includes('troubleshooting')
      )
    );
    score += analyticalSkills.length * 0.5;
    
    // Check experience for problem-solving activities
    for (const exp of experience) {
      const description = (exp.description || '').toLowerCase();
      if (description.includes('solved') || description.includes('resolved') ||
          description.includes('troubleshot') || description.includes('analyzed')) {
        score += 0.8;
      }
    }
    
    return Math.min(score, 10);
  }
  
  /**
   * Calculate attention to detail score
   */
  private calculateDetailScore(experience: any[]): number {
    let score = 5;
    
    for (const exp of experience) {
      const description = (exp.description || '').toLowerCase();
      if (description.includes('quality') || description.includes('testing') ||
          description.includes('review') || description.includes('accuracy') ||
          description.includes('audit') || description.includes('compliance')) {
        score += 1;
      }
    }
    
    return Math.min(score, 10);
  }
  
  /**
   * Calculate adaptability score
   */
  private calculateAdaptabilityScore(experience: any[]): number {
    let score = 5;
    
    // Score based on number of different roles/companies (indicates adaptability)
    score += Math.min(experience.length * 0.5, 3);
    
    for (const exp of experience) {
      const description = (exp.description || '').toLowerCase();
      if (description.includes('adapt') || description.includes('flexible') ||
          description.includes('various') || description.includes('diverse') ||
          description.includes('multiple') || description.includes('different')) {
        score += 0.8;
      }
    }
    
    return Math.min(score, 10);
  }
  
  /**
   * Calculate strategic thinking score
   */
  private calculateStrategicScore(experience: any[]): number {
    let score = 4;
    
    for (const exp of experience) {
      const description = (exp.description || '').toLowerCase();
      const position = (exp.position || '').toLowerCase();
      
      if (position.includes('strategic') || position.includes('senior') ||
          position.includes('architect') || position.includes('consultant')) {
        score += 1.5;
      }
      
      if (description.includes('strategy') || description.includes('planning') ||
          description.includes('roadmap') || description.includes('vision') ||
          description.includes('long-term') || description.includes('objectives')) {
        score += 1;
      }
    }
    
    return Math.min(score, 10);
  }
  
  /**
   * Analyze work style from experience
   */
  private analyzeWorkStyle(experience: any[]): string[] {
    const styles: string[] = [];
    
    const allDescriptions = experience.map(exp => exp.description || '').join(' ').toLowerCase();
    
    if (allDescriptions.includes('independent') || allDescriptions.includes('autonomous')) {
      styles.push('Self-directed and independent');
    }
    
    if (allDescriptions.includes('team') || allDescriptions.includes('collaborative')) {
      styles.push('Collaborative team player');
    }
    
    if (allDescriptions.includes('fast') || allDescriptions.includes('agile') || allDescriptions.includes('rapid')) {
      styles.push('Fast-paced and agile');
    }
    
    if (allDescriptions.includes('detail') || allDescriptions.includes('thorough') || allDescriptions.includes('precise')) {
      styles.push('Detail-oriented and thorough');
    }
    
    if (allDescriptions.includes('innovative') || allDescriptions.includes('creative') || allDescriptions.includes('design')) {
      styles.push('Creative and innovative');
    }
    
    // Default styles if none found
    if (styles.length === 0) {
      styles.push('Professional and dedicated', 'Results-oriented', 'Continuous learner');
    }
    
    return styles;
  }
  
  /**
   * Analyze team compatibility
   */
  private analyzeTeamCompatibility(experience: any[]): string {
    const teamExperience = experience.filter(exp => 
      (exp.description || '').toLowerCase().includes('team') ||
      (exp.description || '').toLowerCase().includes('collaborative')
    ).length;
    
    if (teamExperience >= 3) {
      return 'Highly collaborative with extensive team experience. Works well in cross-functional environments and contributes effectively to team goals.';
    } else if (teamExperience >= 1) {
      return 'Good team player with solid collaborative skills. Adapts well to team dynamics and contributes meaningfully to group projects.';
    } else {
      return 'Strong individual contributor with potential for team collaboration. Brings focused expertise and dedication to team efforts.';
    }
  }
  
  /**
   * Analyze culture fit preferences
   */
  private analyzeCultureFit(experience: any[], skills: any): any {
    const allText = experience.map(exp => (exp.description || '') + ' ' + (exp.position || '')).join(' ').toLowerCase();
    const skillText = [...(skills.technical || []), ...(skills.soft || []), ...(skills.languages || [])].join(' ').toLowerCase();
    const combinedText = allText + ' ' + skillText;
    
    return {
      startup: this.calculateStartupFit(combinedText),
      corporate: this.calculateCorporateFit(combinedText),
      remote: this.calculateRemoteFit(combinedText),
      hybrid: this.calculateHybridFit(combinedText)
    };
  }
  
  private calculateStartupFit(text: string): number {
    let score = 5;
    const startupKeywords = ['agile', 'fast', 'innovative', 'entrepreneurial', 'startup', 'mvp', 'prototype', 'lean'];
    for (const keyword of startupKeywords) {
      if (text.includes(keyword)) score += 0.5;
    }
    return Math.min(score, 10) / 10;
  }
  
  private calculateCorporateFit(text: string): number {
    let score = 5;
    const corporateKeywords = ['enterprise', 'corporate', 'compliance', 'governance', 'process', 'strategy', 'policy'];
    for (const keyword of corporateKeywords) {
      if (text.includes(keyword)) score += 0.5;
    }
    return Math.min(score, 10) / 10;
  }
  
  private calculateRemoteFit(text: string): number {
    let score = 6;
    const remoteKeywords = ['remote', 'virtual', 'distributed', 'online', 'digital', 'cloud', 'autonomous'];
    for (const keyword of remoteKeywords) {
      if (text.includes(keyword)) score += 0.5;
    }
    return Math.min(score, 10) / 10;
  }
  
  private calculateHybridFit(text: string): number {
    let score = 7;
    const hybridKeywords = ['flexible', 'collaborative', 'office', 'team', 'meetings', 'coordination'];
    for (const keyword of hybridKeywords) {
      if (text.includes(keyword)) score += 0.3;
    }
    return Math.min(score, 10) / 10;
  }
  
  /**
   * Generate personality summary
   */
  private generatePersonalitySummary(traits: any, workStyle: string[], personalInfo: any): string {
    const name = personalInfo.name || 'This professional';
    const topTrait = Object.entries(traits).sort((a: any, b: any) => b[1] - a[1])[0];
    const primaryStyle = workStyle[0] || 'dedicated professional';
    
    return `${name} demonstrates strong ${topTrait[0].replace(/_/g, ' ')} abilities with a ${primaryStyle.toLowerCase()} approach. ` +
           `Their professional profile suggests someone who combines technical expertise with strong interpersonal skills, ` +
           `making them well-suited for roles that require both individual contribution and team collaboration.`;
  }
  
  /**
   * Generate React component placeholder
   */
  private generateReactComponentPlaceholder(jobId: string, props: any): string {
    return `
      <div class="cv-feature-container personal-branding-feature">
        <div class="react-component-placeholder" 
             data-component="PersonalityInsights" 
             data-props='${JSON.stringify(props).replace(/'/g, "&apos;")}'>
          <!-- React PersonalityInsights component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Analyzing personality insights...</p>
          </div>
        </div>
      </div>
    `;
  }

  getStyles(): string {
    return `
      /* Personal Branding Feature Styles */
      .cv-feature-container.personal-branding-feature {
        margin: 2rem 0;
      }
      
      /* React Component Placeholder Styles */
      .personal-branding-feature .react-component-placeholder {
        min-height: 500px;
        position: relative;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border-radius: 16px;
        padding: 2rem;
        border: 1px solid #334155;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        color: #f1f5f9;
      }
      
      .personal-branding-feature .component-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 400px;
        color: #94a3b8;
      }
      
      .personal-branding-feature .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #334155;
        border-top: 3px solid #06b6d4;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Mobile Responsive */
      @media (max-width: 768px) {
        .personal-branding-feature .react-component-placeholder {
          padding: 1.5rem;
          margin: 1rem 0;
        }
      }
      
      /* Dark theme is default for personal branding */
      .personal-branding-feature {
        background: transparent;
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React PersonalityInsights components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="PersonalityInsights"]');
          
          if (placeholders.length === 0) {
            return false;
          }
          
          
          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));
              
              
              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                window.renderReactComponent('PersonalityInsights', props, placeholder);
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
          const data = props.data || {};
          const traits = data.traits || {};
          const summary = data.summary || 'Professional with diverse skills and experience.';
          
          placeholder.innerHTML = \`
            <div class="react-fallback" style="padding: 2rem; color: #f1f5f9;">
              <div class="fallback-header" style="text-align: center; margin-bottom: 2rem;">
                <h3 style="color: #f1f5f9; font-size: 1.5rem; margin-bottom: 1rem;">🧠 Personality Insights</h3>
                <p style="color: #cbd5e1; margin: 0;">\${summary}</p>
              </div>
              <div class="fallback-content" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                \${Object.entries(traits).slice(0, 6).map(([trait, score]) => \`
                  <div style="background: rgba(51, 65, 85, 0.5); padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-weight: 600; color: #e2e8f0; text-transform: capitalize; margin-bottom: 0.5rem;">
                      \${trait.replace(/_/g, ' ')}
                    </div>
                    <div style="font-size: 1.25rem; font-weight: bold; color: #06b6d4;">\${Math.round(score)}/10</div>
                  </div>
                \`).join('')}
              </div>
              <div class="fallback-note" style="text-align: center; margin-top: 2rem;">
                <small style="color: #94a3b8; font-style: italic;">Interactive insights require JavaScript and React</small>
              </div>
            </div>
          \`;
        }
        
        // Show error when React props parsing fails
        function showReactError(placeholder, errorMessage) {
          placeholder.innerHTML = \`
            <div class="react-error" style="padding: 2rem; text-align: center; color: #f87171;">
              <h3 style="color: #f87171; margin-bottom: 1rem;">Personality Insights Error</h3>
              <p>Unable to load personality analysis: \${errorMessage}</p>
              <p style="color: #cbd5e1; margin-top: 1rem;">This section provides AI-powered insights into professional personality traits and work preferences.</p>
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
        window.PersonalBrandingFeature = {
          initReactComponents
        };
        
        // Global function to re-initialize components (useful for dynamic content)
        window.initPersonalityInsights = initReactComponents;
        
      })();
    `;
  }
}