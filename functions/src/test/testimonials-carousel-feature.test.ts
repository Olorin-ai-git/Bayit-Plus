import { TestimonialsCarouselFeature } from '../services/cv-generator/features/TestimonialsCarouselFeature';
import { ParsedCV } from '../services/cvParser';

describe('TestimonialsCarouselFeature', () => {
  let feature: TestimonialsCarouselFeature;
  let mockCV: ParsedCV;

  beforeEach(() => {
    feature = new TestimonialsCarouselFeature();
    
    mockCV = {
      personalInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 234 567 8900',
        location: 'San Francisco, CA',
        linkedin: 'https://linkedin.com/in/johndoe',
        github: 'https://github.com/johndoe'
      },
      summary: 'Experienced software engineer with 5+ years of experience',
      experience: [
        {
          company: 'Tech Corp',
          position: 'Senior Software Engineer',
          duration: '2020-2023',
          startDate: '2020-01-01',
          endDate: '2023-06-01',
          location: 'San Francisco, CA',
          description: 'Led development of key features',
          achievements: ['Improved performance by 40%', 'Led team of 5 engineers'],
          technologies: ['React', 'Node.js', 'TypeScript']
        },
        {
          company: 'StartupXYZ',
          position: 'Software Engineer',
          duration: '2018-2020',
          startDate: '2018-06-01',
          endDate: '2020-01-01',
          location: 'San Francisco, CA',
          description: 'Full-stack development',
          technologies: ['Python', 'Django', 'PostgreSQL']
        }
      ],
      education: [
        {
          institution: 'Stanford University',
          degree: 'Master of Science',
          field: 'Computer Science',
          graduationDate: '2018-05-01',
          gpa: '3.8',
          honors: ['Dean\'s List']
        }
      ],
      skills: {
        technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
        soft: ['Leadership', 'Communication', 'Problem Solving'],
        languages: ['English', 'Spanish']
      },
      certifications: [
        {
          name: 'AWS Certified Solutions Architect',
          issuer: 'Amazon Web Services',
          date: '2022-03-01',
          credentialId: 'AWS-123456'
        }
      ]
    };
  });

  describe('generate', () => {
    it('should generate React component placeholder with correct props', async () => {
      const jobId = 'test-job-123';
      
      const result = await feature.generate(mockCV, jobId);
      
      expect(result).toContain('data-component="TestimonialsCarousel"');
      expect(result).toContain(`id="testimonials-carousel-${jobId}"`);
      expect(result).toContain('React TestimonialsCarousel component will be rendered here');
    });

    it('should extract testimonials from experience data', async () => {
      const jobId = 'test-job-123';
      
      const result = await feature.generate(mockCV, jobId);
      
      // Parse the props from the generated HTML
      const propsMatch = result.match(/data-props='([^']*)'/);
      expect(propsMatch).toBeTruthy();
      
      if (propsMatch) {
        const props = JSON.parse(propsMatch[1].replace(/&apos;/g, "'"));
        
        expect(props.data.testimonials).toBeDefined();
        expect(props.data.testimonials.length).toBeGreaterThan(0);
        
        // Check that testimonials were generated from experience
        const expTestimonials = props.data.testimonials.filter((t: any) => t.id.startsWith('exp-'));
        expect(expTestimonials).toHaveLength(2); // Two experience entries
        
        // Verify testimonial structure
        const firstTestimonial = expTestimonials[0];
        expect(firstTestimonial).toMatchObject({
          company: 'Tech Corp',
          relationship: 'manager',
          rating: 5,
          featured: true, // First experience should be featured
          tags: ['React', 'Node.js', 'TypeScript']
        });
      }
    });

    it('should extract testimonials from education data', async () => {
      const jobId = 'test-job-123';
      
      const result = await feature.generate(mockCV, jobId);
      const propsMatch = result.match(/data-props='([^']*)'/);
      
      if (propsMatch) {
        const props = JSON.parse(propsMatch[1].replace(/&apos;/g, "'"));
        
        // Check education testimonials
        const eduTestimonials = props.data.testimonials.filter((t: any) => t.id.startsWith('edu-'));
        expect(eduTestimonials).toHaveLength(1);
        
        const eduTestimonial = eduTestimonials[0];
        expect(eduTestimonial).toMatchObject({
          company: 'Stanford University',
          relationship: 'mentor',
          rating: 4,
          featured: false,
          tags: ['Master of Science']
        });
      }
    });

    it('should extract testimonials from skills data', async () => {
      const jobId = 'test-job-123';
      
      const result = await feature.generate(mockCV, jobId);
      const propsMatch = result.match(/data-props='([^']*)'/);
      
      if (propsMatch) {
        const props = JSON.parse(propsMatch[1].replace(/&apos;/g, "'"));
        
        // Check skill testimonials (top 3 technical skills)
        const skillTestimonials = props.data.testimonials.filter((t: any) => t.id.startsWith('skill-'));
        expect(skillTestimonials).toHaveLength(3);
        
        const skillTestimonial = skillTestimonials[0];
        expect(skillTestimonial).toMatchObject({
          relationship: 'colleague',
          rating: 4,
          featured: false
        });
        
        // Should have skill as tag
        expect(['JavaScript', 'TypeScript', 'React']).toContain(skillTestimonial.tags[0]);
      }
    });

    it('should calculate analytics correctly', async () => {
      const jobId = 'test-job-123';
      
      const result = await feature.generate(mockCV, jobId);
      const propsMatch = result.match(/data-props='([^']*)'/);
      
      if (propsMatch) {
        const props = JSON.parse(propsMatch[1].replace(/&apos;/g, "'"));
        const analytics = props.data.analytics;
        
        expect(analytics).toBeDefined();
        expect(analytics.totalTestimonials).toBeGreaterThan(0);
        expect(analytics.averageRating).toBeGreaterThan(0);
        expect(analytics.relationshipBreakdown).toBeDefined();
        expect(analytics.topSkillsMentioned).toBeDefined();
        expect(analytics.verificationRate).toBeDefined();
        
        // Check relationship breakdown
        expect(analytics.relationshipBreakdown.manager).toBe(2); // 2 experience entries
        expect(analytics.relationshipBreakdown.mentor).toBe(1);  // 1 education entry
        expect(analytics.relationshipBreakdown.colleague).toBe(3); // 3 skill entries
      }
    });

    it('should include custom options in component props', async () => {
      const jobId = 'test-job-123';
      const options = {
        autoPlay: false,
        layout: 'minimal',
        primaryColor: '#ff0000',
        showRatings: false
      };
      
      const result = await feature.generate(mockCV, jobId, options);
      const propsMatch = result.match(/data-props='([^']*)'/);
      
      if (propsMatch) {
        const props = JSON.parse(propsMatch[1].replace(/&apos;/g, "'"));
        
        expect(props.customization.autoPlay).toBe(false);
        expect(props.customization.layout).toBe('minimal');
        expect(props.customization.primaryColor).toBe('#ff0000');
        expect(props.customization.showRatings).toBe(false);
      }
    });
  });

  describe('getStyles', () => {
    it('should return CSS styles for testimonials carousel', () => {
      const styles = feature.getStyles();
      
      expect(styles).toContain('.cv-feature-container.testimonials-carousel-feature');
      expect(styles).toContain('.react-component-placeholder');
      expect(styles).toContain('.component-loading');
      expect(styles).toContain('.loading-spinner');
      expect(styles).toContain('.testimonials-fallback');
      expect(styles).toContain('@keyframes spin');
    });

    it('should include responsive and dark mode styles', () => {
      const styles = feature.getStyles();
      
      expect(styles).toContain('@media (max-width: 768px)');
      expect(styles).toContain('@media (prefers-color-scheme: dark)');
    });
  });

  describe('getScripts', () => {
    it('should return JavaScript for React component initialization', () => {
      const scripts = feature.getScripts();
      
      expect(scripts).toContain('initReactComponents');
      expect(scripts).toContain('TestimonialsCarousel');
      expect(scripts).toContain('showTestimonialsFallback');
      expect(scripts).toContain('window.renderReactComponent');
    });

    it('should include fallback functionality', () => {
      const scripts = feature.getScripts();
      
      expect(scripts).toContain('showTestimonialsFallback');
      expect(scripts).toContain('showTestimonialsError');
      expect(scripts).toContain('testimonials-fallback');
    });
  });

  describe('edge cases', () => {
    it('should handle CV with no experience', async () => {
      const cvWithoutExperience = { ...mockCV, experience: [] };
      const jobId = 'test-job-123';
      
      const result = await feature.generate(cvWithoutExperience, jobId);
      
      expect(result).toContain('data-component="TestimonialsCarousel"');
      
      // Should still have education and skill testimonials
      const propsMatch = result.match(/data-props='([^']*)'/);
      if (propsMatch) {
        const props = JSON.parse(propsMatch[1].replace(/&apos;/g, "'"));
        expect(props.data.testimonials.length).toBeGreaterThan(0);
      }
    });

    it('should handle CV with no technical skills', async () => {
      const cvWithoutSkills = {
        ...mockCV,
        skills: {
          technical: [],
          soft: ['Leadership'],
          languages: ['English']
        }
      };
      const jobId = 'test-job-123';
      
      const result = await feature.generate(cvWithoutSkills, jobId);
      
      expect(result).toContain('data-component="TestimonialsCarousel"');
      
      // Should still have experience and education testimonials
      const propsMatch = result.match(/data-props='([^']*)'/);
      if (propsMatch) {
        const props = JSON.parse(propsMatch[1].replace(/&apos;/g, "'"));
        const skillTestimonials = props.data.testimonials.filter((t: any) => t.id.startsWith('skill-'));
        expect(skillTestimonials).toHaveLength(0);
      }
    });

    it('should handle empty CV gracefully', async () => {
      const emptyCV: ParsedCV = {
        personalInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '',
          location: ''
        },
        summary: '',
        experience: [],
        education: [],
        skills: {
          technical: [],
          soft: [],
          languages: []
        },
        certifications: []
      };
      
      const jobId = 'test-job-123';
      
      const result = await feature.generate(emptyCV, jobId);
      
      expect(result).toContain('data-component="TestimonialsCarousel"');
      
      const propsMatch = result.match(/data-props='([^']*)'/);
      if (propsMatch) {
        const props = JSON.parse(propsMatch[1].replace(/&apos;/g, "'"));
        expect(props.data.testimonials).toHaveLength(0);
        expect(props.data.analytics.totalTestimonials).toBe(0);
      }
    });
  });
});