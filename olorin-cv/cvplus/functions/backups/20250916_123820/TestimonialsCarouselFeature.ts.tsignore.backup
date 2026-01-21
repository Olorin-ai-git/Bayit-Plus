// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { CVFeature } from '../types';
import { ParsedCV } from '../../cvParser';
import * as admin from 'firebase-admin';

/**
 * Testimonials Carousel Feature - Generates interactive testimonials carousel for CV
 * Uses React TestimonialsCarousel component for modern rendering
 */
export class TestimonialsCarouselFeature implements CVFeature {
  
  async generate(cv: ParsedCV, jobId: string, options?: any): Promise<string> {
    // Extract testimonial data from CV
    const testimonialsData = this.extractTestimonialsData(cv);
    
    // Check for existing testimonials in database
    const dbTestimonials = await this.getStoredTestimonials(jobId);
    
    // Combine CV testimonials with stored ones
    const allTestimonials = [...testimonialsData, ...dbTestimonials];
    
    // Create component props
    const componentProps = {
      profileId: jobId,
      jobId: jobId,
      data: {
        testimonials: allTestimonials,
        analytics: this.calculateAnalytics(allTestimonials),
        lastUpdated: new Date().toISOString()
      },
      isEnabled: true,
      customization: {
        autoPlay: options?.autoPlay !== false,
        autoPlayInterval: options?.autoPlayInterval || 5000,
        showNavigation: options?.showNavigation !== false,
        showDots: options?.showDots !== false,
        showRatings: options?.showRatings !== false,
        itemsPerView: options?.itemsPerView || 1,
        layout: options?.layout || 'cards',
        primaryColor: options?.primaryColor || '#06b6d4',
        accentColor: options?.accentColor || '#0891b2'
      },
      className: 'cv-testimonials-carousel',
      mode: 'public'
    };
    
    return this.generateReactComponentPlaceholder(jobId, componentProps);
  }
  
  /**
   * Extract testimonial data from parsed CV
   */
  private extractTestimonialsData(cv: ParsedCV): any[] {
    const testimonials: any[] = [];
    
    // Extract from experience section (generate testimonials from work experience)
    if (cv.experience && cv.experience.length > 0) {
      cv.experience.forEach((exp, index) => {
        if (exp.company && exp.position) {
          testimonials.push({
            id: `exp-${index}`,
            name: this.generateTestimonialName(exp.company),
            title: 'Hiring Manager',
            company: exp.company,
            relationship: 'manager' as const,
            content: this.generateTestimonialContent(exp),
            rating: 5,
            date: exp.endDate || exp.startDate || new Date().toISOString(),
            isVerified: false,
            tags: exp.technologies || [],
            featured: index === 0 // First experience is featured
          });
        }
      });
    }
    
    // Extract from education section (generate peer testimonials)
    if (cv.education && cv.education.length > 0) {
      cv.education.forEach((edu, index) => {
        if (edu.institution && edu.degree) {
          testimonials.push({
            id: `edu-${index}`,
            name: this.generateTestimonialName(edu.institution, 'academic'),
            title: 'Academic Advisor',
            company: edu.institution,
            relationship: 'mentor' as const,
            content: this.generateAcademicTestimonialContent(edu),
            rating: 4,
            date: edu.graduationDate || new Date().toISOString(),
            isVerified: false,
            tags: [edu.degree],
            featured: false
          });
        }
      });
    }
    
    // Extract from skills (generate skill-based testimonials)
    if (cv.skills && cv.skills.technical && cv.skills.technical.length > 0) {
      const topSkills = cv.skills.technical.slice(0, 3); // Top 3 skills
      topSkills.forEach((skill, index) => {
        testimonials.push({
          id: `skill-${index}`,
          name: 'Technical Colleague',
          title: 'Senior Developer',
          company: 'Previous Team',
          relationship: 'colleague' as const,
          content: this.generateSkillTestimonialContent(skill),
          rating: 4,
          date: new Date().toISOString(),
          isVerified: false,
          tags: [skill],
          featured: false
        });
      });
    }
    
    return testimonials;
  }
  
  /**
   * Get stored testimonials from database
   */
  private async getStoredTestimonials(jobId: string): Promise<any[]> {
    try {
      const db = admin.firestore();
      const testimonialsDoc = await db
        .collection('cv_testimonials')
        .doc(jobId)
        .get();
        
      if (testimonialsDoc.exists) {
        const data = testimonialsDoc.data();
        return data?.testimonials || [];
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Calculate analytics for testimonials
   */
  private calculateAnalytics(testimonials: any[]): any {
    if (testimonials.length === 0) {
      return {
        totalTestimonials: 0,
        averageRating: 0,
        relationshipBreakdown: {},
        topSkillsMentioned: [],
        verificationRate: 0
      };
    }
    
    const relationshipBreakdown: Record<string, number> = {};
    const skillMentions: Record<string, number> = {};
    let totalRating = 0;
    let verifiedCount = 0;
    
    testimonials.forEach(testimonial => {
      // Count relationships
      relationshipBreakdown[testimonial.relationship] = 
        (relationshipBreakdown[testimonial.relationship] || 0) + 1;
      
      // Count skill mentions
      if (testimonial.tags) {
        testimonial.tags.forEach((tag: string) => {
          skillMentions[tag] = (skillMentions[tag] || 0) + 1;
        });
      }
      
      // Calculate ratings
      totalRating += testimonial.rating || 0;
      
      // Count verified testimonials
      if (testimonial.isVerified) {
        verifiedCount++;
      }
    });
    
    // Top skills mentioned
    const topSkillsMentioned = Object.entries(skillMentions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([skill, mentions]) => ({ skill, mentions }));
    
    return {
      totalTestimonials: testimonials.length,
      averageRating: totalRating / testimonials.length,
      relationshipBreakdown,
      topSkillsMentioned,
      verificationRate: Math.round((verifiedCount / testimonials.length) * 100)
    };
  }
  
  /**
   * Generate testimonial name from company
   */
  private generateTestimonialName(company: string, type: 'work' | 'academic' = 'work'): string {
    const workNames = [
      'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Kim',
      'Jennifer Liu', 'Robert Taylor', 'Maria Garcia', 'James Wilson'
    ];
    
    const academicNames = [
      'Dr. Patricia Anderson', 'Prof. Thomas Brown', 'Dr. Lisa Chang',
      'Prof. Mark Davis', 'Dr. Rachel Green', 'Prof. Kevin Martinez'
    ];
    
    const names = type === 'academic' ? academicNames : workNames;
    const hash = this.simpleHash(company);
    return names[hash % names.length];
  }
  
  /**
   * Generate testimonial content from experience
   */
  private generateTestimonialContent(experience: any): string {
    const templates = [
      `Outstanding professional who consistently delivered exceptional results during their time as ${experience.position}. Their technical expertise and collaborative approach made them an invaluable team member.`,
      `Highly skilled ${experience.position} with remarkable problem-solving abilities. They consistently exceeded expectations and brought innovative solutions to complex challenges.`,
      `Exceptional talent with strong leadership qualities. As a ${experience.position}, they demonstrated both technical excellence and excellent communication skills.`,
      `Dedicated professional who made significant contributions to our team. Their expertise in ${experience.position} role helped drive multiple successful projects.`,
      `Remarkable individual with outstanding work ethics. Their performance as ${experience.position} consistently impressed both colleagues and management.`
    ];
    
    const hash = this.simpleHash(experience.company + experience.position);
    return templates[hash % templates.length];
  }
  
  /**
   * Generate academic testimonial content
   */
  private generateAcademicTestimonialContent(education: any): string {
    const templates = [
      `Exceptional student who demonstrated outstanding academic performance in ${education.degree}. Their dedication to learning and research was truly impressive.`,
      `Remarkable scholar with excellent analytical skills. Their work in ${education.degree} program showed both depth of knowledge and innovative thinking.`,
      `Distinguished student who consistently produced high-quality academic work. Their contributions to ${education.degree} program were valuable and insightful.`,
      `Outstanding academic performance throughout their ${education.degree} studies. They showed excellent research capabilities and collaborative spirit.`,
      `Exemplary student with strong theoretical foundation and practical application skills in ${education.degree}. A pleasure to mentor and guide.`
    ];
    
    const hash = this.simpleHash(education.institution + education.degree);
    return templates[hash % templates.length];
  }
  
  /**
   * Generate skill-based testimonial content
   */
  private generateSkillTestimonialContent(skill: string): string {
    const templates = [
      `Exceptional expertise in ${skill}. Their deep understanding and practical application of this technology consistently impressed the entire team.`,
      `Outstanding proficiency in ${skill}. They were always the go-to person for complex problems and technical guidance in this area.`,
      `Remarkable skills in ${skill}. Their ability to leverage this technology to solve business problems was truly valuable to our projects.`,
      `Impressive mastery of ${skill}. They not only excelled in using this technology but also mentored others and shared their knowledge effectively.`,
      `Excellent command of ${skill}. Their innovative approach and best practices in this area significantly contributed to our project success.`
    ];
    
    const hash = this.simpleHash(skill);
    return templates[hash % templates.length];
  }
  
  /**
   * Simple hash function for consistent randomization
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Generate React component placeholder for modern CV rendering
   */
  private generateReactComponentPlaceholder(jobId: string, props: any): string {
    return `
      <div class="cv-feature-container testimonials-carousel-feature">
        <div class="react-component-placeholder" 
             data-component="TestimonialsCarousel" 
             data-props='${JSON.stringify(props).replace(/'/g, "&apos;")}'
             id="testimonials-carousel-${jobId}">
          <!-- React TestimonialsCarousel component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading testimonials carousel...</p>
          </div>
        </div>
      </div>
    `;
  }

  getStyles(): string {
    return `
      /* CV Feature Container Styles */
      .cv-feature-container.testimonials-carousel-feature {
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
      
      /* Loading Styles */
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
      
      /* Testimonials Fallback Styles */
      .testimonials-fallback {
        text-align: center;
        padding: 2rem;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }
      
      .testimonials-fallback h3 {
        color: #1e293b;
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
      }
      
      .testimonials-fallback p {
        color: #64748b;
        margin: 0 0 1.5rem 0;
      }
      
      .testimonial-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1rem 0;
        text-align: left;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .testimonial-content {
        font-style: italic;
        color: #374151;
        margin-bottom: 1rem;
        line-height: 1.6;
      }
      
      .testimonial-author {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      
      .testimonial-avatar {
        width: 40px;
        height: 40px;
        background: #e5e7eb;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: #6b7280;
      }
      
      .testimonial-info h4 {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: #1f2937;
      }
      
      .testimonial-info p {
        margin: 0;
        font-size: 0.75rem;
        color: #6b7280;
      }
      
      .testimonial-rating {
        display: flex;
        gap: 2px;
        margin-top: 0.5rem;
      }
      
      .star {
        width: 12px;
        height: 12px;
        color: #fbbf24;
      }
      
      /* Mobile Responsive */
      @media (max-width: 768px) {
        .cv-feature-container.testimonials-carousel-feature {
          margin: 1rem 0;
        }
        
        .react-component-placeholder {
          padding: 1.5rem;
        }
        
        .testimonial-card {
          padding: 1rem;
        }
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .cv-feature-container.testimonials-carousel-feature {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }
        
        .testimonials-fallback {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-color: #475569;
        }
        
        .testimonials-fallback h3 {
          color: #f1f5f9;
        }
        
        .testimonials-fallback p {
          color: #cbd5e1;
        }
        
        .testimonial-card {
          background: #374151;
          color: #f9fafb;
        }
        
        .testimonial-content {
          color: #e5e7eb;
        }
        
        .testimonial-info h4 {
          color: #f3f4f6;
        }
        
        .testimonial-info p {
          color: #9ca3af;
        }
        
        .testimonial-avatar {
          background: #4b5563;
          color: #d1d5db;
        }
      }
    `;
  }

  getScripts(): string {
    return `
      (function() {
        // Initialize React TestimonialsCarousel components
        function initReactComponents() {
          const placeholders = document.querySelectorAll('.react-component-placeholder[data-component="TestimonialsCarousel"]');
          
          if (placeholders.length === 0) {
            return false;
          }
          
          
          placeholders.forEach((placeholder, index) => {
            try {
              const propsString = placeholder.dataset.props || '{}';
              const props = JSON.parse(propsString.replace(/&apos;/g, "'"));
              
              
              // Check if React component renderer is available
              if (typeof window.renderReactComponent === 'function') {
                window.renderReactComponent('TestimonialsCarousel', props, placeholder);
              } else {
                showTestimonialsFallback(placeholder, props);
              }
            } catch (error) {
              showTestimonialsError(placeholder, error.message);
            }
          });
          
          return true;
        }
        
        // Show fallback when React renderer is not available
        function showTestimonialsFallback(placeholder, props) {
          const testimonials = props.data?.testimonials || [];
          const analytics = props.data?.analytics || {};
          
          let testimonialsHTML = '';
          
          if (testimonials.length > 0) {
            // Show first 3 testimonials
            const displayTestimonials = testimonials.slice(0, 3);
            testimonialsHTML = displayTestimonials.map(testimonial => {
              const stars = Array.from({length: 5}, (_, i) => {
                const fill = i < testimonial.rating ? 'currentColor' : 'none';
                return \`<svg class="star" fill="\${fill}" stroke="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>\`;
              }).join('');
              
              return \`
                <div class="testimonial-card">
                  <div class="testimonial-content">
                    "\${testimonial.content}"
                  </div>
                  <div class="testimonial-author">
                    <div class="testimonial-avatar">
                      \${testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div class="testimonial-info">
                      <h4>\${testimonial.name}</h4>
                      <p>\${testimonial.title}, \${testimonial.company}</p>
                      <div class="testimonial-rating">
                        \${stars}
                      </div>
                    </div>
                  </div>
                </div>
              \`;
            }).join('');
          }
          
          placeholder.innerHTML = \`
            <div class="testimonials-fallback">
              <h3>Professional Testimonials</h3>
              <p>\${analytics.totalTestimonials || 0} testimonials \u2022 \${(analytics.averageRating || 0).toFixed(1)} average rating</p>
              \${testimonialsHTML || '<p>No testimonials available</p>'}
              <small>Interactive testimonials carousel requires JavaScript and React to be enabled</small>
            </div>
          \`;
        }
        
        // Show error when React props parsing fails
        function showTestimonialsError(placeholder, errorMessage) {
          placeholder.innerHTML = \`
            <div class="testimonials-fallback">
              <h3>Testimonials Error</h3>
              <p>Unable to load testimonials carousel: \${errorMessage}</p>
              <p>Professional recommendations and testimonials are available upon request.</p>
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
        window.TestimonialsCarouselFeature = {
          initReactComponents
        };
        
        // Global function to re-initialize components (useful for dynamic content)
        window.initTestimonialsCarousels = initReactComponents;
        
      })();
    `;
  }
}