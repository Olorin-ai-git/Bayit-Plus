/**
 * Enhanced Prompt Engine Test Suite
 * 
 * Comprehensive tests for the advanced prompt engineering framework
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { 
  AdvancedPromptEngine, 
  EnhancedPromptEngineWithFallbacks,
  PromptEngineOptions,
  PersonalityProfile,
  ScriptQualityMetrics,
  EnhancedScriptResult,
  PromptEngineError,
  PromptEngineErrorType
} from '../services/enhanced-prompt-engine.service';
import { ParsedCV } from '../types/enhanced-models';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

// Mock industry templates service
jest.mock('../services/industry-templates.service', () => ({
  industryTemplatesService: {
    getTemplate: jest.fn(),
    analyzeAndRecommendTemplate: jest.fn(),
    getAllTemplates: jest.fn()
  }
}));

describe('Enhanced Prompt Engine Test Suite', () => {
  let promptEngine: EnhancedPromptEngineWithFallbacks;
  let mockCV: ParsedCV;
  let mockOptions: PromptEngineOptions;

  beforeEach(() => {
    promptEngine = new EnhancedPromptEngineWithFallbacks();
    
    // Mock CV data
    mockCV = {
      personalInfo: {
        name: 'John Smith',
        title: 'Senior Software Engineer',
        email: 'john.smith@example.com',
        phone: '+1-555-0123',
        summary: 'Experienced software engineer with expertise in full-stack development'
      },
      experience: [
        {
          company: 'Tech Corp',
          position: 'Senior Software Engineer',
          duration: '3 years',
          startDate: '2021-01-01',
          endDate: '2024-01-01',
          description: 'Led development of scalable web applications',
          achievements: [
            'Improved system performance by 40%',
            'Led team of 5 developers',
            'Implemented microservices architecture'
          ],
          technologies: ['React', 'Node.js', 'AWS', 'Docker']
        },
        {
          company: 'StartupXYZ',
          position: 'Full Stack Developer',
          duration: '2 years',
          startDate: '2019-01-01',
          endDate: '2021-01-01',
          description: 'Built web applications from scratch',
          achievements: ['Reduced load times by 60%'],
          technologies: ['JavaScript', 'Python', 'PostgreSQL']
        }
      ],
      education: [
        {
          institution: 'University of Technology',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          graduationDate: '2019'
        }
      ],
      skills: {
        technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker'],
        soft: ['Leadership', 'Problem Solving', 'Communication', 'Team Collaboration'],
        tools: ['Git', 'Jenkins', 'Kubernetes', 'MongoDB']
      },
      achievements: [
        'Published 3 technical articles',
        'Speaker at DevConf 2023',
        'AWS Certified Solutions Architect'
      ],
      certifications: [
        {
          name: 'AWS Certified Solutions Architect',
          issuer: 'Amazon Web Services',
          date: '2023-06'
        }
      ]
    };

    mockOptions = {
      duration: 'medium',
      style: 'professional',
      targetIndustry: 'technology',
      optimizationLevel: 'enhanced'
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('AdvancedPromptEngine Core Functionality', () => {
    
    test('should generate enhanced script with quality metrics', async () => {
      // Mock successful OpenAI responses
      const mockOpenAI = require('openai').default;
      const mockCreate = mockOpenAI().chat.completions.create;
      
      mockCreate
        .mockResolvedValueOnce({ // Context layer
          choices: [{ 
            message: { 
              content: 'Professional with 5 years experience in software engineering with expertise in full-stack development and team leadership.' 
            } 
          }]
        })
        .mockResolvedValueOnce({ // Optimization layer
          choices: [{ 
            message: { 
              content: 'Technology sector positioning with innovation focus and technical excellence messaging.' 
            } 
          }]
        })
        .mockResolvedValueOnce({ // Production layer
          choices: [{ 
            message: { 
              content: 'Video script optimized for avatar delivery with natural pacing and emphasis markers.' 
            } 
          }]
        })
        .mockResolvedValueOnce({ // Script synthesis
          choices: [{ 
            message: { 
              content: 'Hello! I\'m John Smith, a Senior Software Engineer at Tech Corp. With expertise in JavaScript, TypeScript, and React, I\'ve built a career focused on innovation and scalable solutions. I recently improved system performance by 40% and led a team of 5 developers in implementing microservices architecture. My approach combines technical excellence with leadership to deliver meaningful results. I\'m passionate about solving complex challenges and driving technological advancement. Let\'s connect to explore how we can collaborate on exciting projects together.' 
            } 
          }]
        })
        .mockResolvedValueOnce({ // Engagement assessment
          choices: [{ 
            message: { 
              content: '{"hookScore": 8, "flowScore": 8.5, "emotionalScore": 7, "ctaScore": 9, "credibilityScore": 9, "overallEngagement": 8.3, "reasoning": "Strong technical credibility with clear call-to-action"}' 
            } 
          }]
        });

      // Mock industry template service
      const { industryTemplatesService } = require('../services/industry-templates.service');
      industryTemplatesService.getTemplate.mockReturnValue({
        id: 'technology',
        name: 'Technology & Software',
        vocabularyFocus: ['innovate', 'develop', 'architect', 'optimize'],
        commonKeywords: ['software development', 'scalability', 'performance'],
        avoidKeywords: ['basic computer skills'],
        requirements: ['Technical depth', 'Innovation focus']
      });

      const result = await promptEngine.generateEnhancedScript(mockCV, mockOptions);

      expect(result).toBeDefined();
      expect(result.script).toContain('John Smith');
      expect(result.script).toContain('Senior Software Engineer');
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(7);
      expect(result.industryTemplate).toBe('Technology & Software');
      expect(result.personalityProfile).toBeDefined();
      expect(result.optimizationLayers).toBeDefined();
      expect(result.generationTime).toBeGreaterThan(0);
    });

    test('should analyze personality profile correctly', async () => {
      // Create a basic prompt engine to test personality analysis
      const basicEngine = new AdvancedPromptEngine();
      
      // Access private method through type assertion
      const personalityProfile = await (basicEngine as any).analyzePersonality(mockCV);

      expect(personalityProfile).toBeDefined();
      expect(personalityProfile.industryFocus).toBe('Technology');
      expect(personalityProfile.careerStage).toBe('mid'); // 5 years total experience
      expect(personalityProfile.technicalDepth).toBe('specialist'); // >10 skills
      expect(personalityProfile.communicationStyle).toBeDefined();
      expect(personalityProfile.leadershipType).toBeDefined();
    });

    test('should calculate experience years correctly', async () => {
      const basicEngine = new AdvancedPromptEngine();
      
      const experienceYears = (basicEngine as any).calculateExperienceYears(mockCV);
      
      expect(experienceYears).toBe(5); // 3 + 2 years
    });

    test('should detect industry correctly', async () => {
      const basicEngine = new AdvancedPromptEngine();
      
      const industry = (basicEngine as any).detectIndustry(mockCV);
      
      expect(industry).toBe('Technology');
    });

    test('should assess technical depth correctly', async () => {
      const basicEngine = new AdvancedPromptEngine();
      
      const technicalDepth = (basicEngine as any).assessTechnicalDepth(mockCV);
      
      expect(['specialist', 'architect', 'generalist', 'manager']).toContain(technicalDepth);
    });
  });

  describe('Quality Assessment Framework', () => {
    
    test('should assess script quality comprehensively', async () => {
      const basicEngine = new AdvancedPromptEngine();
      const mockScript = 'Hello! I\'m John Smith, a Senior Software Engineer with expertise in React and Node.js. I\'ve improved system performance by 40% and led successful projects. Let\'s connect to explore collaboration opportunities.';
      
      const mockPersonality: PersonalityProfile = {
        communicationStyle: 'collaborative',
        leadershipType: 'strategic',
        technicalDepth: 'specialist',
        industryFocus: 'Technology',
        careerStage: 'mid',
        personalityTraits: ['analytical', 'results-driven']
      };

      const mockTemplate = {
        name: 'Technology',
        vocabularyFocus: ['develop', 'improve', 'lead'],
        commonKeywords: ['performance', 'system', 'projects'],
        avoidKeywords: ['basic'],
        requirements: []
      };

      // Mock engagement assessment
      const mockOpenAI = require('openai').default;
      mockOpenAI().chat.completions.create.mockResolvedValue({
        choices: [{ 
          message: { 
            content: '{"overallEngagement": 8.2}' 
          } 
        }]
      });

      const qualityMetrics = await (basicEngine as any).assessScriptQuality(
        mockScript, 
        mockCV, 
        mockPersonality, 
        mockTemplate
      );

      expect(qualityMetrics).toBeDefined();
      expect(qualityMetrics.overallScore).toBeGreaterThan(6);
      expect(qualityMetrics.engagementScore).toBeGreaterThan(0);
      expect(qualityMetrics.industryAlignment).toBeGreaterThan(0);
      expect(qualityMetrics.personalityMatch).toBeGreaterThan(0);
      expect(qualityMetrics.technicalAccuracy).toBeGreaterThan(0);
      expect(qualityMetrics.deliveryOptimization).toBeGreaterThan(0);
      expect(qualityMetrics.professionalImpact).toBeGreaterThan(0);
      expect(Array.isArray(qualityMetrics.feedback)).toBe(true);
    });

    test('should provide meaningful feedback', async () => {
      const basicEngine = new AdvancedPromptEngine();
      
      const feedback = (basicEngine as any).generateQualityFeedback(
        'Hello! I am John with great skills. Connect with me.',
        6.5, // engagement
        0.7, // industry alignment
        0.8  // personality match
      );

      expect(Array.isArray(feedback)).toBe(true);
      expect(feedback.length).toBeGreaterThan(0);
      expect(feedback.some(f => f.includes('engagement'))).toBe(true);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    
    test('should handle OpenAI API failures gracefully', async () => {
      // Mock OpenAI to throw an error
      const mockOpenAI = require('openai').default;
      mockOpenAI().chat.completions.create.mockRejectedValue(new Error('API Error'));

      // Mock industry template service
      const { industryTemplatesService } = require('../services/industry-templates.service');
      industryTemplatesService.getTemplate.mockReturnValue({
        name: 'General Professional',
        vocabularyFocus: ['professional'],
        commonKeywords: ['experience'],
        avoidKeywords: []
      });

      const result = await promptEngine.generateEnhancedScript(mockCV, mockOptions);

      expect(result).toBeDefined();
      expect(result.script).toContain('John Smith');
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(0);
      expect(result.generationTime).toBeGreaterThanOrEqual(0);
    });

    test('should implement progressive fallback strategy', async () => {
      // Mock all OpenAI calls to fail initially
      const mockOpenAI = require('openai').default;
      const mockCreate = mockOpenAI().chat.completions.create;
      
      let callCount = 0;
      mockCreate.mockImplementation(() => {
        callCount++;
        if (callCount <= 10) { // Fail first several attempts
          throw new Error('API temporarily unavailable');
        }
        return Promise.resolve({
          choices: [{ message: { content: 'Fallback response' } }]
        });
      });

      // Mock industry template service
      const { industryTemplatesService } = require('../services/industry-templates.service');
      industryTemplatesService.getTemplate.mockReturnValue({
        name: 'General Professional',
        vocabularyFocus: ['professional'],
        commonKeywords: ['experience'],
        avoidKeywords: []
      });

      const result = await promptEngine.generateEnhancedScript(mockCV, mockOptions);

      expect(result).toBeDefined();
      expect(result.script).toBeDefined();
      expect(result.qualityMetrics).toBeDefined();
    });

    test('should provide ultimate fallback when all methods fail', async () => {
      // Mock everything to fail
      const mockOpenAI = require('openai').default;
      mockOpenAI().chat.completions.create.mockRejectedValue(new Error('Complete API failure'));

      const { industryTemplatesService } = require('../services/industry-templates.service');
      industryTemplatesService.getTemplate.mockImplementation(() => {
        throw new Error('Template service unavailable');
      });
      industryTemplatesService.analyzeAndRecommendTemplate.mockImplementation(() => {
        throw new Error('Analysis service unavailable');
      });
      industryTemplatesService.getAllTemplates.mockReturnValue([]);

      const result = await promptEngine.generateEnhancedScript(mockCV, mockOptions);

      expect(result).toBeDefined();
      expect(result.script).toContain('John Smith');
      expect(result.script).toContain('professional');
      expect(result.qualityMetrics.overallScore).toBe(6.0);
      expect(result.qualityMetrics.feedback).toContain('Generated using fallback template due to system limitations');
      expect(result.industryTemplate).toBe('fallback');
    });

    test('should categorize errors correctly', async () => {
      const basicEngine = new AdvancedPromptEngine();
      
      // Test different error types
      const quotaError = { code: 'insufficient_quota' };
      const contextError = { message: 'context analysis failed' };
      const optimizationError = { message: 'optimization layer failed' };
      
      expect((basicEngine as any).categorizeError(quotaError)).toBe(PromptEngineErrorType.OPENAI_API_ERROR);
      expect((basicEngine as any).categorizeError(contextError)).toBe(PromptEngineErrorType.CONTEXT_ANALYSIS_FAILED);
      expect((basicEngine as any).categorizeError(optimizationError)).toBe(PromptEngineErrorType.OPTIMIZATION_FAILED);
    });
  });

  describe('Template-Based Generation', () => {
    
    test('should generate script from templates when AI unavailable', async () => {
      const result = await (promptEngine as any).generateTemplateBasedScript(
        mockCV, 
        mockOptions, 
        { name: 'Technology' }
      );

      expect(result).toBeDefined();
      expect(result).toContain('John Smith');
      expect(result).toContain('Senior Software Engineer');
      expect(result).toContain('Tech Corp');
      expect(result.split(' ').length).toBeGreaterThan(100); // Medium length
    });

    test('should respect duration settings in template generation', async () => {
      const shortResult = await (promptEngine as any).generateTemplateBasedScript(
        mockCV, 
        { ...mockOptions, duration: 'short' }, 
        { name: 'Technology' }
      );

      const longResult = await (promptEngine as any).generateTemplateBasedScript(
        mockCV, 
        { ...mockOptions, duration: 'long' }, 
        { name: 'Technology' }
      );

      expect(shortResult.split(' ').length).toBeLessThan(longResult.split(' ').length);
    });

    test('should generate local context without AI', async () => {
      const context = (promptEngine as any).generateLocalContext(mockCV);

      expect(context).toContain('John Smith');
      expect(context).toContain('Senior Software Engineer');
      expect(context).toContain('Tech Corp');
      expect(context).toContain('JavaScript');
    });
  });

  describe('Integration Points', () => {
    
    test('should maintain backward compatibility with basic options', async () => {
      const basicOptions: PromptEngineOptions = {
        duration: 'medium',
        style: 'professional'
      };

      // Mock successful generation
      const mockOpenAI = require('openai').default;
      mockOpenAI().chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Test script content' } }]
      });

      const { industryTemplatesService } = require('../services/industry-templates.service');
      industryTemplatesService.analyzeAndRecommendTemplate.mockReturnValue([]);
      industryTemplatesService.getAllTemplates.mockReturnValue([{
        name: 'General Professional',
        vocabularyFocus: [],
        commonKeywords: [],
        avoidKeywords: []
      }]);

      const result = await promptEngine.generateEnhancedScript(mockCV, basicOptions);

      expect(result).toBeDefined();
      expect(result.script).toBeDefined();
    });

    test('should handle missing CV data gracefully', async () => {
      const minimalCV: ParsedCV = {
        personalInfo: { name: 'Test User' }
      };

      const result = await promptEngine.generateEnhancedScript(minimalCV, mockOptions);

      expect(result).toBeDefined();
      expect(result.script).toContain('Test User');
    });

    test('should work with different optimization levels', async () => {
      const levels: Array<'basic' | 'enhanced' | 'premium'> = ['basic', 'enhanced', 'premium'];
      
      for (const level of levels) {
        const options = { ...mockOptions, optimizationLevel: level };
        const result = await promptEngine.generateEnhancedScript(mockCV, options);
        
        expect(result).toBeDefined();
        expect(result.script).toBeDefined();
      }
    });
  });

  describe('Performance and Reliability', () => {
    
    test('should complete generation within reasonable time', async () => {
      const startTime = Date.now();
      
      // Mock fast responses
      const mockOpenAI = require('openai').default;
      mockOpenAI().chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Fast response' } }]
      });

      const { industryTemplatesService } = require('../services/industry-templates.service');
      industryTemplatesService.getTemplate.mockReturnValue({
        name: 'Technology',
        vocabularyFocus: [],
        commonKeywords: [],
        avoidKeywords: []
      });

      const result = await promptEngine.generateEnhancedScript(mockCV, mockOptions);
      const generationTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(generationTime).toBeLessThan(15000); // Should complete under 15 seconds
      expect(result.generationTime).toBeLessThan(15000);
    });

    test('should handle concurrent requests', async () => {
      // Mock responses
      const mockOpenAI = require('openai').default;
      mockOpenAI().chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Concurrent response' } }]
      });

      const { industryTemplatesService } = require('../services/industry-templates.service');
      industryTemplatesService.getTemplate.mockReturnValue({
        name: 'Technology',
        vocabularyFocus: [],
        commonKeywords: [],
        avoidKeywords: []
      });

      // Execute multiple requests concurrently
      const promises = Array(3).fill(null).map(() => 
        promptEngine.generateEnhancedScript(mockCV, mockOptions)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.script).toBeDefined();
      });
    });

    test('should maintain quality thresholds', async () => {
      // Mock high-quality response
      const mockOpenAI = require('openai').default;
      mockOpenAI().chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{"overallEngagement": 9.2}' } }]
      });

      const { industryTemplatesService } = require('../services/industry-templates.service');
      industryTemplatesService.getTemplate.mockReturnValue({
        name: 'Technology',
        vocabularyFocus: ['innovate', 'develop'],
        commonKeywords: ['software', 'technology'],
        avoidKeywords: []
      });

      const result = await promptEngine.generateEnhancedScript(mockCV, {
        ...mockOptions,
        optimizationLevel: 'premium'
      });

      expect(result.qualityMetrics.overallScore).toBeGreaterThan(7.0);
    });
  });
});

describe('PromptEngineError', () => {
  test('should create proper error instances', () => {
    const error = new PromptEngineError(
      PromptEngineErrorType.OPENAI_API_ERROR,
      'Test error message',
      new Error('Original error')
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PromptEngineError);
    expect(error.type).toBe(PromptEngineErrorType.OPENAI_API_ERROR);
    expect(error.message).toBe('Test error message');
    expect(error.originalError).toBeDefined();
    expect(error.name).toBe('PromptEngineError');
  });
});