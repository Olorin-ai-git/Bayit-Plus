// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { MultimediaIntegration, MultimediaProvider, MultimediaFeatureType } from './MultimediaIntegration';
import { CVFeature } from '../types';

describe('MultimediaIntegration', () => {
  beforeEach(() => {
    // Clear any existing provider
    MultimediaIntegration.setProvider(null as any);
  });

  describe('setProvider and isAvailable', () => {
    it('should set provider and return availability status', () => {
      expect(MultimediaIntegration.isAvailable()).toBe(false);

      const mockProvider: MultimediaProvider = {
        getFeature: jest.fn()
      };

      MultimediaIntegration.setProvider(mockProvider);
      expect(MultimediaIntegration.isAvailable()).toBe(true);
    });
  });

  describe('getFeature', () => {
    it('should return null when no provider is set', () => {
      const feature = MultimediaIntegration.getFeature('video-introduction');
      expect(feature).toBeNull();
    });

    it('should delegate to provider when available', () => {
      const mockFeature: CVFeature = {
        generate: jest.fn(),
        getStyles: jest.fn(),
        getScripts: jest.fn()
      };

      const mockProvider: MultimediaProvider = {
        getFeature: jest.fn().mockReturnValue(mockFeature)
      };

      MultimediaIntegration.setProvider(mockProvider);
      const result = MultimediaIntegration.getFeature('video-introduction');

      expect(mockProvider.getFeature).toHaveBeenCalledWith('video-introduction');
      expect(result).toBe(mockFeature);
    });
  });

  describe('createFeatureWrapper', () => {
    it('should return null when provider is not available', () => {
      const wrapper = MultimediaIntegration.createFeatureWrapper('embed-qr-code');
      expect(wrapper).toBeNull();
    });

    it('should return null when provider returns null feature', () => {
      const mockProvider: MultimediaProvider = {
        getFeature: jest.fn().mockReturnValue(null)
      };

      MultimediaIntegration.setProvider(mockProvider);
      const wrapper = MultimediaIntegration.createFeatureWrapper('embed-qr-code');
      expect(wrapper).toBeNull();
    });

    it('should return wrapped feature when provider returns feature', () => {
      const mockFeature: CVFeature = {
        generate: jest.fn(),
        getStyles: jest.fn(),
        getScripts: jest.fn()
      };

      const mockProvider: MultimediaProvider = {
        getFeature: jest.fn().mockReturnValue(mockFeature)
      };

      MultimediaIntegration.setProvider(mockProvider);
      const wrapper = MultimediaIntegration.createFeatureWrapper('embed-qr-code');

      expect(wrapper).toBeDefined();
      expect(wrapper).not.toBe(mockFeature); // Should be wrapped, not the original
    });
  });
});

describe('MultimediaFeatureWrapper', () => {
  const mockParsedCV = {
    personalInfo: { name: 'John Doe', email: 'john@example.com' },
    experience: [],
    education: [],
    skills: { technical: ['JavaScript'], soft: [], languages: [] },
    projects: [],
    certifications: [],
    summary: 'Test summary',
    achievements: []
  };

  it('should convert ParsedCV to multimedia format and delegate calls', async () => {
    const mockFeature: CVFeature = {
      generate: jest.fn().mockResolvedValue('<div>test content</div>'),
      getStyles: jest.fn().mockReturnValue('test styles'),
      getScripts: jest.fn().mockReturnValue('test scripts')
    };

    const mockProvider: MultimediaProvider = {
      getFeature: jest.fn().mockReturnValue(mockFeature)
    };

    MultimediaIntegration.setProvider(mockProvider);
    const wrapper = MultimediaIntegration.createFeatureWrapper('generate-podcast');

    expect(wrapper).toBeDefined();

    if (wrapper) {
      // Test generate method
      const content = await wrapper.generate(mockParsedCV as any, 'test-job-id', { test: true });
      expect(content).toBe('<div>test content</div>');
      expect(mockFeature.generate).toHaveBeenCalledWith(
        {
          personalInfo: mockParsedCV.personalInfo,
          experience: mockParsedCV.experience,
          education: mockParsedCV.education,
          skills: mockParsedCV.skills,
          projects: mockParsedCV.projects,
          certifications: mockParsedCV.certifications,
          summary: mockParsedCV.summary,
          achievements: mockParsedCV.achievements
        },
        'test-job-id',
        { test: true }
      );

      // Test getStyles method
      const styles = wrapper.getStyles();
      expect(styles).toBe('test styles');
      expect(mockFeature.getStyles).toHaveBeenCalled();

      // Test getScripts method
      const scripts = wrapper.getScripts();
      expect(scripts).toBe('test scripts');
      expect(mockFeature.getScripts).toHaveBeenCalled();
    }
  });
});

describe('MultimediaFallbackFeature', () => {
  it('should generate fallback content for different feature types', async () => {
    const featureTypes: MultimediaFeatureType[] = [
      'video-introduction',
      'generate-podcast',
      'embed-qr-code',
      'portfolio-gallery'
    ];

    for (const featureType of featureTypes) {
      const { MultimediaFallbackFeature } = await import('./MultimediaIntegration');
      const fallback = new MultimediaFallbackFeature(featureType);

      const content = await fallback.generate({} as any, 'test-job', {});
      expect(content).toContain('multimedia-fallback');
      expect(content).toContain('Unavailable');

      const styles = fallback.getStyles();
      expect(styles).toContain('.multimedia-fallback');

      const scripts = fallback.getScripts();
      expect(scripts).toContain('console.info');
    }
  });
});