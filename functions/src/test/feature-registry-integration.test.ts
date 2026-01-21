import { FeatureRegistry } from '../services/cv-generator/features/FeatureRegistry';
import { ParsedCV } from '../services/cvParser';

describe('FeatureRegistry Integration', () => {
  let mockCV: ParsedCV;

  beforeEach(() => {
    mockCV = {
      personalInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        location: 'San Francisco, CA'
      },
      summary: 'Experienced professional with strong technical skills.',
      skills: {
        technical: ['JavaScript', 'React', 'Python'],
        soft: ['Communication', 'Leadership'],
        languages: ['English']
      },
      experience: [
        {
          company: 'Tech Company',
          position: 'Software Engineer',
          duration: '2 years',
          startDate: '2022-01-01',
          endDate: 'Present',
          location: 'San Francisco, CA',
          description: 'Developed web applications and led team initiatives.'
        }
      ],
      education: [],
      certifications: []
    };
  });

  describe('PersonalBrandingFeature Integration', () => {
    it('should generate personality-insights feature through FeatureRegistry', async () => {
      const result = await FeatureRegistry.generateFeatures(
        mockCV,
        'test-job-123',
        ['personality-insights']
      );

      expect(result.personalityInsights).toBeDefined();
      expect(result.personalityInsights).toContain('react-component-placeholder');
      expect(result.personalityInsights).toContain('data-component="PersonalityInsights"');
      expect(result.personalityInsights).toContain('personal-branding-feature');
    });

    it('should include styles and scripts for personality-insights feature', async () => {
      const result = await FeatureRegistry.generateFeatures(
        mockCV,
        'test-job-456',
        ['personality-insights']
      );

      expect(result.additionalStyles).toBeDefined();
      expect(result.additionalStyles).toContain('.personal-branding-feature');
      expect(result.additionalStyles).toContain('.loading-spinner');

      expect(result.additionalScripts).toBeDefined();
      expect(result.additionalScripts).toContain('initReactComponents');
      expect(result.additionalScripts).toContain('PersonalityInsights');
    });

    it('should work with multiple features including personality-insights', async () => {
      const result = await FeatureRegistry.generateFeatures(
        mockCV,
        'test-job-789',
        ['personality-insights', 'contact-form', 'embed-qr-code']
      );

      expect(result.personalityInsights).toBeDefined();
      expect(result.contactForm).toBeDefined();
      expect(result.qrCode).toBeDefined();
      
      // Should have combined styles and scripts
      expect(result.additionalStyles).toContain('.personal-branding-feature');
      expect(result.additionalStyles).toContain('.contact-form-feature');
      
      expect(result.additionalScripts).toContain('PersonalityInsights');
      expect(result.additionalScripts).toContain('ContactForm');
    });

    it('should verify personality-insights is in supported types', () => {
      const supportedTypes = FeatureRegistry.getSupportedTypes();
      expect(supportedTypes).toContain('personality-insights');
    });

    it('should verify personality-insights type is supported', () => {
      expect(FeatureRegistry.isSupported('personality-insights')).toBe(true);
      expect(FeatureRegistry.isSupported('invalid-feature')).toBe(false);
    });
  });
});