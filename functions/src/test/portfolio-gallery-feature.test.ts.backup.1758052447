/**
 * Portfolio Gallery Feature Tests
 * Tests the new React component integration for portfolio gallery
 */

import { describe, test, expect } from '@jest/globals';
import { PortfolioGalleryFeature } from '../services/cv-generator/features/PortfolioGalleryFeature';
import { ParsedCV } from '../services/cvParser';

// Test CV data
const TEST_CV: ParsedCV = {
  personalInfo: {
    name: 'Test Developer',
    email: 'test@example.com',
    phone: '+1 234 567 8900',
    location: 'San Francisco, CA'
  },
  experience: [
    {
      company: 'Tech Corp',
      position: 'Senior Software Engineer',
      duration: '2022-Present',
      startDate: '2022-01-01',
      endDate: 'Present',
      location: 'San Francisco, CA',
      description: 'Built scalable web applications using React and Node.js',
      achievements: [
        'Increased system performance by 40%',
        'Led a team of 5 developers',
        'Reduced deployment time by 60%'
      ],
      technologies: ['React', 'Node.js', 'TypeScript']
    },
    {
      company: 'StartupXYZ',
      position: 'Frontend Developer',
      duration: '2020-2021',
      startDate: '2020-06-01',
      endDate: '2021-12-01',
      location: 'Remote',
      description: 'Developed user interfaces with Vue.js and TypeScript',
      achievements: [
        'Built responsive design system',
        'Improved user engagement by 25%'
      ],
      technologies: ['Vue.js', 'TypeScript']
    }
  ],
  skills: {
    technical: ['JavaScript', 'TypeScript', 'React', 'Vue.js', 'Node.js', 'Python', 'Docker'],
    soft: ['Leadership', 'Communication', 'Problem Solving'],
    languages: ['English', 'Spanish']
  },
  education: [
    {
      institution: 'University of Technology',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      graduationDate: '2020'
    }
  ],
  certifications: [
    {
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023-03-15'
    },
    {
      name: 'React Professional Certificate',
      issuer: 'Meta',
      date: '2022-11-20'
    }
  ],
  achievements: [
    'Published research paper on machine learning optimization',
    'Won first place in company hackathon 2023'
  ],
  summary: 'Experienced software engineer with expertise in modern web technologies'
};

describe('PortfolioGalleryFeature', () => {
  let portfolioFeature: PortfolioGalleryFeature;
  const testJobId = 'test-job-123';

  beforeEach(() => {
    portfolioFeature = new PortfolioGalleryFeature();
  });

  test('should implement CVFeature interface', () => {
    expect(portfolioFeature).toHaveProperty('generate');
    expect(portfolioFeature).toHaveProperty('getStyles');
    expect(portfolioFeature).toHaveProperty('getScripts');
    expect(typeof portfolioFeature.generate).toBe('function');
    expect(typeof portfolioFeature.getStyles).toBe('function');
    expect(typeof portfolioFeature.getScripts).toBe('function');
  });

  test('should generate portfolio gallery HTML with React component', async () => {
    const result = await portfolioFeature.generate(TEST_CV, testJobId);
    
    // Check that it returns HTML
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    
    // Check for React component structure
    expect(result).toContain('cv-feature-container');
    expect(result).toContain('portfolio-gallery-feature');
    expect(result).toContain('react-component-placeholder');
    expect(result).toContain('data-component="PortfolioGallery"');
    
    // Check for props data
    expect(result).toContain('data-props=');
    expect(result).toContain(testJobId);
  });

  test('should parse and include CV data in component props', async () => {
    const result = await portfolioFeature.generate(TEST_CV, testJobId);
    
    // Extract props from the HTML
    const propsMatch = result.match(/data-props='([^']+)'/);
    expect(propsMatch).not.toBeNull();
    
    if (propsMatch) {
      const propsString = propsMatch[1].replace(/&apos;/g, "'");
      const props = JSON.parse(propsString);
      
      // Check basic structure
      expect(props).toHaveProperty('jobId', testJobId);
      expect(props).toHaveProperty('profileId', testJobId);
      expect(props).toHaveProperty('data');
      expect(props).toHaveProperty('customization');
      expect(props).toHaveProperty('isEnabled', true);
      expect(props).toHaveProperty('mode', 'public');
      
      // Check portfolio data structure
      const data = props.data;
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('categories');
      expect(data).toHaveProperty('statistics');
      expect(data).toHaveProperty('layout');
      expect(data).toHaveProperty('branding');
      
      // Check that items were extracted from CV
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeGreaterThan(0);
      
      // Check categories
      expect(Array.isArray(data.categories)).toBe(true);
      expect(data.categories.length).toBeGreaterThan(0);
      
      // Check statistics
      expect(data.statistics).toHaveProperty('totalProjects');
      expect(data.statistics).toHaveProperty('totalTechnologies');
      expect(data.statistics).toHaveProperty('yearsSpanned');
    }
  });

  test('should extract projects from experience', async () => {
    const result = await portfolioFeature.generate(TEST_CV, testJobId);
    const propsMatch = result.match(/data-props='([^']+)'/);
    
    if (propsMatch) {
      const propsString = propsMatch[1].replace(/&apos;/g, "'");
      const props = JSON.parse(propsString);
      const items = props.data.items;
      
      // Should have extracted items from experience
      const projectItems = items.filter((item: any) => item.type === 'project');
      expect(projectItems.length).toBeGreaterThan(0);
      
      // Check project structure
      const project = projectItems[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('title');
      expect(project).toHaveProperty('description');
      expect(project).toHaveProperty('category');
      expect(project).toHaveProperty('tags');
      expect(project).toHaveProperty('technologies');
    }
  });

  test('should extract certifications as portfolio items', async () => {
    const result = await portfolioFeature.generate(TEST_CV, testJobId);
    const propsMatch = result.match(/data-props='([^']+)'/);
    
    if (propsMatch) {
      const propsString = propsMatch[1].replace(/&apos;/g, "'");
      const props = JSON.parse(propsString);
      const items = props.data.items;
      
      // Should have extracted certifications
      const certItems = items.filter((item: any) => item.type === 'certification');
      expect(certItems.length).toBe(2); // We have 2 certifications in test data
      
      // Check certification structure
      const cert = certItems[0];
      expect(cert).toHaveProperty('id');
      expect(cert).toHaveProperty('title');
      expect(cert).toHaveProperty('description');
      expect(cert.category).toBe('Certifications');
    }
  });

  test('should return CSS styles', () => {
    const styles = portfolioFeature.getStyles();
    
    expect(typeof styles).toBe('string');
    expect(styles.length).toBeGreaterThan(0);
    
    // Check for key CSS classes
    expect(styles).toContain('.cv-feature-container.portfolio-gallery-feature');
    expect(styles).toContain('.component-loading');
    expect(styles).toContain('.loading-spinner');
    expect(styles).toContain('@keyframes spin');
  });

  test('should return JavaScript scripts', () => {
    const scripts = portfolioFeature.getScripts();
    
    expect(typeof scripts).toBe('string');
    expect(scripts.length).toBeGreaterThan(0);
    
    // Check for key script functionality
    expect(scripts).toContain('initPortfolioGallery');
    expect(scripts).toContain('.portfolio-gallery-feature');
    expect(scripts).toContain('PortfolioGalleryUtils');
    expect(scripts).toContain('DOMContentLoaded');
  });

  test('should handle errors gracefully', async () => {
    // Test with invalid CV data
    const invalidCV = {} as ParsedCV;
    
    const result = await portfolioFeature.generate(invalidCV, testJobId);
    
    // Should still return HTML (with error state or minimal data)
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('cv-feature-container');
  });

  test('should extract technologies from text', () => {
    // Access private method through type assertion for testing
    const feature = portfolioFeature as any;
    
    const text = 'Built with React, TypeScript, and Node.js on AWS infrastructure';
    const technologies = feature.extractTechnologiesFromText(text);
    
    expect(Array.isArray(technologies)).toBe(true);
    expect(technologies).toContain('React');
    expect(technologies).toContain('TypeScript');
    expect(technologies).toContain('Node.js');
    expect(technologies).toContain('AWS');
  });

  test('should calculate project categories correctly', () => {
    const feature = portfolioFeature as any;
    
    const webProject = { title: 'Web Application', description: 'Frontend website development' };
    expect(feature.categorizeProject(webProject)).toBe('Web Development');
    
    const mobileProject = { title: 'Mobile App', description: 'iOS application development' };
    expect(feature.categorizeProject(mobileProject)).toBe('Mobile Development');
    
    const dataProject = { title: 'Analytics Platform', description: 'Machine learning data processing' };
    expect(feature.categorizeProject(dataProject)).toBe('Data & AI');
    
    const backendProject = { title: 'API Service', description: 'Backend microservice development' };
    expect(feature.categorizeProject(backendProject)).toBe('Backend Development');
  });

  test('should format impact values correctly', () => {
    const feature = portfolioFeature as any;
    
    expect(feature.formatImpactValue(1500000, 'revenue')).toBe('$1.5M');
    expect(feature.formatImpactValue(50, 'percent')).toBe('50%');
    expect(feature.formatImpactValue(2500, 'users')).toBe('3K'); // Rounds to nearest K
    expect(feature.formatImpactValue(1000000000, 'cost')).toBe('$1.0B');
  });

  test('should parse impact values correctly', () => {
    const feature = portfolioFeature as any;
    
    expect(feature.parseImpactValue('$1.5M')).toBe(1500000);
    expect(feature.parseImpactValue('50%')).toBe(50);
    expect(feature.parseImpactValue('5x')).toBe(5);
    expect(feature.parseImpactValue('2.5K')).toBe(2500);
  });
});