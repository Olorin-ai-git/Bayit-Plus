import { PersonalBrandingFeature } from '../services/cv-generator/features/PersonalBrandingFeature';
import { ParsedCV } from '../services/cvParser';

describe('PersonalBrandingFeature', () => {
  let feature: PersonalBrandingFeature;
  let mockCV: ParsedCV;

  beforeEach(() => {
    feature = new PersonalBrandingFeature();
    mockCV = {
      personalInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        location: 'New York, NY'
      },
      summary: 'Experienced software engineer with expertise in full-stack development.',
      skills: {
        technical: ['JavaScript', 'React', 'Python', 'AI'],
        soft: ['Communication', 'Leadership', 'Problem Solving'],
        languages: ['English', 'Spanish']
      },
      experience: [
        {
          company: 'Tech Corp',
          position: 'Senior Software Engineer',
          duration: '4 years',
          startDate: '2020-01-01',
          endDate: 'Present',
          location: 'New York, NY',
          description: 'Led a team of 5 developers, implemented innovative solutions, created microservices architecture, and managed cross-functional collaboration.'
        },
        {
          company: 'StartupXYZ',
          position: 'Software Developer',
          duration: '1.5 years',
          startDate: '2018-06-01',
          endDate: '2019-12-31',
          location: 'San Francisco, CA',
          description: 'Developed React applications, collaborated with design team, troubleshot production issues, and adapted to fast-paced startup environment.'
        }
      ],
      education: [],
      certifications: []
    };
  });

  describe('generate', () => {
    it('should generate React component placeholder with personality insights', async () => {
      const result = await feature.generate(mockCV, 'test-job-123');
      
      expect(result).toContain('react-component-placeholder');
      expect(result).toContain('data-component="PersonalityInsights"');
      expect(result).toContain('personal-branding-feature');
      expect(result).toContain('Analyzing personality insights...');
    });

    it('should include proper component props with extracted data', async () => {
      const result = await feature.generate(mockCV, 'test-job-123');
      
      // Extract the data-props attribute
      const propsMatch = result.match(/data-props='([^']+)'/);
      expect(propsMatch).toBeTruthy();
      
      const props = JSON.parse(propsMatch![1].replace(/&apos;/g, "'"));
      
      expect(props.jobId).toBe('test-job-123');
      expect(props.profileId).toBe('test-job-123');
      expect(props.data).toBeDefined();
      expect(props.data.traits).toBeDefined();
      expect(props.data.workStyle).toBeDefined();
      expect(props.data.summary).toBeDefined();
      expect(props.customization).toBeDefined();
    });

    it('should calculate personality traits correctly', async () => {
      const result = await feature.generate(mockCV, 'test-job-123');
      const propsMatch = result.match(/data-props='([^']+)'/);
      const props = JSON.parse(propsMatch![1].replace(/&apos;/g, "'"));
      
      const traits = props.data.traits;
      
      // Check that all traits are present and have reasonable values
      expect(traits.leadership).toBeGreaterThan(5); // Should be high due to "Led a team"
      expect(traits.communication).toBeGreaterThan(5); // Has communication skills
      expect(traits.innovation).toBeGreaterThan(4); // Has AI/React skills and "innovative solutions"
      expect(traits.teamwork).toBeGreaterThan(5); // Has team collaboration experience
      expect(traits.problemSolving).toBeGreaterThan(5); // Has problem solving skills
      
      // All traits should be between 0 and 10
      Object.values(traits).forEach((score: any) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      });
    });

    it('should generate appropriate work style analysis', async () => {
      const result = await feature.generate(mockCV, 'test-job-123');
      const propsMatch = result.match(/data-props='([^']+)'/);
      const props = JSON.parse(propsMatch![1].replace(/&apos;/g, "'"));
      
      const workStyle = props.data.workStyle;
      
      expect(Array.isArray(workStyle)).toBe(true);
      expect(workStyle.length).toBeGreaterThan(0);
      expect(workStyle).toEqual(expect.arrayContaining([
        expect.stringMatching(/team|collaborative|fast|detail|creative|independent/i)
      ]));
    });

    it('should calculate culture fit scores', async () => {
      const result = await feature.generate(mockCV, 'test-job-123');
      const propsMatch = result.match(/data-props='([^']+)'/);
      const props = JSON.parse(propsMatch![1].replace(/&apos;/g, "'"));
      
      const cultureFit = props.data.cultureFit;
      
      expect(cultureFit.startup).toBeDefined();
      expect(cultureFit.corporate).toBeDefined();
      expect(cultureFit.remote).toBeDefined();
      expect(cultureFit.hybrid).toBeDefined();
      
      // All scores should be between 0 and 1
      Object.values(cultureFit).forEach((score: any) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should generate a meaningful personality summary', async () => {
      const result = await feature.generate(mockCV, 'test-job-123');
      const propsMatch = result.match(/data-props='([^']+)'/);
      const props = JSON.parse(propsMatch![1].replace(/&apos;/g, "'"));
      
      const summary = props.data.summary;
      
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(50);
      expect(summary).toContain('John Doe');
    });
  });

  describe('getStyles', () => {
    it('should return CSS styles for the personal branding feature', () => {
      const styles = feature.getStyles();
      
      expect(styles).toContain('.personal-branding-feature');
      expect(styles).toContain('.react-component-placeholder');
      expect(styles).toContain('.loading-spinner');
      expect(styles).toContain('@keyframes spin');
    });
  });

  describe('getScripts', () => {
    it('should return JavaScript for React component initialization', () => {
      const scripts = feature.getScripts();
      
      expect(scripts).toContain('initReactComponents');
      expect(scripts).toContain('PersonalityInsights');
      expect(scripts).toContain('renderReactComponent');
      expect(scripts).toContain('showReactFallback');
    });
  });

  describe('edge cases', () => {
    it('should handle CV with minimal data', async () => {
      const minimalCV: ParsedCV = {
        personalInfo: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1234567890',
          location: 'Boston, MA'
        },
        summary: 'Professional with diverse background.',
        skills: { technical: [], soft: [], languages: [] },
        experience: [],
        education: [],
        certifications: []
      };

      const result = await feature.generate(minimalCV, 'test-job-456');
      
      expect(result).toContain('react-component-placeholder');
      
      const propsMatch = result.match(/data-props='([^']+)'/);
      const props = JSON.parse(propsMatch![1].replace(/&apos;/g, "'"));
      
      // Should still have all required properties
      expect(props.data.traits).toBeDefined();
      expect(props.data.workStyle).toBeDefined();
      expect(props.data.summary).toBeDefined();
    });

    it('should handle undefined skills gracefully', async () => {
      const cvWithoutSkills = { ...mockCV };
      delete (cvWithoutSkills as any).skills;

      const result = await feature.generate(cvWithoutSkills, 'test-job-789');
      
      expect(result).toContain('react-component-placeholder');
      
      const propsMatch = result.match(/data-props='([^']+)'/);
      const props = JSON.parse(propsMatch![1].replace(/&apos;/g, "'"));
      
      // Should use default empty skills structure
      expect(props.data.traits).toBeDefined();
    });
  });
});