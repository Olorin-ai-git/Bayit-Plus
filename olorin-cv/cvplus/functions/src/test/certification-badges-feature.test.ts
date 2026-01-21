import { CertificationBadgesFeature } from '../services/cv-generator/features/CertificationBadgesFeature';
import { ParsedCV } from '../types/job';
import { certificationBadgesService } from '../services/certification-badges.service';

// Mock the certification badges service
jest.mock('../services/certification-badges.service', () => ({
  certificationBadgesService: {
    generateCertificationBadges: jest.fn()
  }
}));

const mockCertificationBadgesService = certificationBadgesService as jest.Mocked<typeof certificationBadgesService>;

describe('CertificationBadgesFeature', () => {
  let feature: CertificationBadgesFeature;
  let mockCV: ParsedCV;
  let mockBadgesCollection: any;

  beforeEach(() => {
    feature = new CertificationBadgesFeature();
    
    mockCV = {
      personalInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123',
        address: '123 Main St, City, State'
      },
      certifications: [
        {
          name: 'AWS Certified Solutions Architect',
          issuer: 'Amazon Web Services',
          date: '2023-01-15',
          credentialId: 'ABC123'
        },
        {
          name: 'Google Cloud Professional',
          issuer: 'Google',
          date: '2022-11-20'
        }
      ]
    };

    mockBadgesCollection = {
      badges: [
        {
          id: 'badge1',
          name: 'AWS Certified Solutions Architect',
          issuer: 'AWS',
          issueDate: new Date('2023-01-15'),
          category: 'technical',
          level: 'professional',
          skills: ['Cloud Computing', 'AWS', 'Infrastructure'],
          verified: true,
          badgeImage: {
            type: 'generated',
            url: 'data:image/svg+xml;base64,...',
            colors: { primary: '#FF9900', secondary: '#232F3E', accent: '#FFFFFF' }
          },
          metadata: {}
        }
      ],
      categories: {
        technical: [{ id: 'badge1' }],
        professional: [],
        academic: [],
        language: [],
        other: []
      },
      statistics: {
        totalCertifications: 2,
        verifiedCertifications: 1,
        activeCertifications: 2,
        expiredCertifications: 0,
        topIssuers: [{ issuer: 'AWS', count: 1 }],
        skillsCovered: ['Cloud Computing', 'AWS', 'Infrastructure']
      },
      displayOptions: {
        layout: 'grid',
        showExpired: false,
        groupByCategory: true,
        animateOnHover: true,
        showVerificationStatus: true
      }
    };

    mockCertificationBadgesService.generateCertificationBadges.mockResolvedValue(mockBadgesCollection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate React component placeholder with certification badges', async () => {
      const jobId = 'test-job-123';
      const result = await feature.generate(mockCV, jobId);

      expect(mockCertificationBadgesService.generateCertificationBadges).toHaveBeenCalledWith(mockCV, jobId);
      expect(result).toContain('cv-feature-container certification-badges-feature');
      expect(result).toContain('data-component="CertificationBadges"');
      expect(result).toContain('certification-badges-test-job-123');
      expect(result).toContain('Loading certification badges...');
    });

    it('should include badges collection data in component props', async () => {
      const jobId = 'test-job-123';
      const result = await feature.generate(mockCV, jobId);

      // Extract and parse the props from the result
      const propsMatch = result.match(/data-props='([^']*)'/);
      expect(propsMatch).toBeTruthy();
      
      const propsString = propsMatch![1].replace(/&apos;/g, "'");
      const props = JSON.parse(propsString);

      // Check the data structure (dates will be serialized to strings)
      expect(props.collection.badges).toHaveLength(1);
      expect(props.collection.badges[0].name).toBe('AWS Certified Solutions Architect');
      expect(props.collection.badges[0].issuer).toBe('AWS');
      expect(props.collection.badges[0].category).toBe('technical');
      expect(props.data.statistics.totalCertifications).toBe(2);
      expect(props.jobId).toBe(jobId);
      expect(props.profileId).toBe(jobId);
      expect(props.mode).toBe('public');
      expect(props.className).toBe('cv-certification-badges');
    });

    it('should use custom options when provided', async () => {
      const jobId = 'test-job-123';
      const options = {
        layout: 'list',
        showExpired: true,
        title: 'My Certifications',
        theme: 'dark',
        maxDisplay: 5
      };
      
      const result = await feature.generate(mockCV, jobId, options);
      
      const propsMatch = result.match(/data-props='([^']*)'/);
      const propsString = propsMatch![1].replace(/&apos;/g, "'");
      const props = JSON.parse(propsString);

      expect(props.customization.layout).toBe('list');
      expect(props.customization.showExpired).toBe(true);
      expect(props.customization.title).toBe('My Certifications');
      expect(props.customization.theme).toBe('dark');
      expect(props.customization.maxDisplay).toBe(5);
    });

    it('should handle service errors gracefully', async () => {
      const jobId = 'test-job-123';
      const error = new Error('Service error');
      mockCertificationBadgesService.generateCertificationBadges.mockRejectedValue(error);
      
      const result = await feature.generate(mockCV, jobId);
      
      expect(result).toContain('react-fallback');
      expect(result).toContain('Certification badges could not be generated');
      expect(result).toContain('Listed in the main CV content');
    });

    it('should work with CV without certifications', async () => {
      const cvWithoutCerts: ParsedCV = {
        personalInfo: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1-555-0456',
          address: '456 Oak St, City, State'
        }
      };
      
      const emptyCollection = {
        ...mockBadgesCollection,
        badges: [],
        statistics: {
          ...mockBadgesCollection.statistics,
          totalCertifications: 0,
          verifiedCertifications: 0,
          activeCertifications: 0
        }
      };
      
      mockCertificationBadgesService.generateCertificationBadges.mockResolvedValue(emptyCollection);
      
      const jobId = 'test-job-123';
      const result = await feature.generate(cvWithoutCerts, jobId);

      expect(result).toContain('data-component="CertificationBadges"');
      
      const propsMatch = result.match(/data-props='([^']*)'/);
      const propsString = propsMatch![1].replace(/&apos;/g, "'");
      const props = JSON.parse(propsString);
      
      expect(props.data.badges).toEqual([]);
      expect(props.data.statistics.totalCertifications).toBe(0);
    });
  });

  describe('getStyles', () => {
    it('should return CSS styles for certification badges', () => {
      const styles = feature.getStyles();
      
      expect(styles).toContain('.cv-feature-container.certification-badges-feature');
      expect(styles).toContain('.react-component-placeholder');
      expect(styles).toContain('.react-fallback');
      expect(styles).toContain('.component-loading');
      expect(styles).toContain('.loading-spinner');
      expect(styles).toContain('@keyframes spin');
      expect(styles).toContain('@media (max-width: 768px)');
      expect(styles).toContain('@media (prefers-color-scheme: dark)');
    });
  });

  describe('getScripts', () => {
    it('should return JavaScript for component initialization', () => {
      const scripts = feature.getScripts();
      
      expect(scripts).toContain('initReactComponents');
      expect(scripts).toContain('CertificationBadges');
      expect(scripts).toContain('window.renderReactComponent');
      expect(scripts).toContain('showReactFallback');
      expect(scripts).toContain('showReactError');
      expect(scripts).toContain('window.CertificationBadgesFeature');
      expect(scripts).toContain('window.initCertificationBadges');
    });
  });
});
