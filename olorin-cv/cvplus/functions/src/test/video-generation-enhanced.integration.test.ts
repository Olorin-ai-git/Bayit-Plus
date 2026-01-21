/**
 * Enhanced Video Generation Integration Test Suite
 * 
 * Integration tests for the enhanced video generation system
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { VideoGenerationService } from '../services/video-generation.service';
import { ParsedCV } from '../types/enhanced-models';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  storage: () => ({
    bucket: () => ({
      file: () => ({
        save: jest.fn().mockResolvedValue(undefined),
        makePublic: jest.fn().mockResolvedValue(undefined)
      }),
      name: 'test-bucket'
    })
  })
}));

// Mock Axios for D-ID API calls
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  head: jest.fn()
}));

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

// Mock the enhanced prompt engine
jest.mock('../services/enhanced-prompt-engine.service', () => ({
  advancedPromptEngine: {
    generateEnhancedScript: jest.fn()
  }
}));

describe('Enhanced Video Generation Integration Tests', () => {
  let videoService: VideoGenerationService;
  let mockCV: ParsedCV;
  const axios = require('axios');
  const OpenAI = require('openai').default;

  beforeEach(() => {
    videoService = new VideoGenerationService();
    
    // Mock comprehensive CV data
    mockCV = {
      personalInfo: {
        name: 'Sarah Chen',
        title: 'Senior Product Manager',
        email: 'sarah.chen@example.com',
        summary: 'Experienced product manager with expertise in SaaS products and data-driven decision making'
      },
      experience: [
        {
          company: 'TechStartup Inc',
          position: 'Senior Product Manager',
          duration: '3 years',
          startDate: '2021-06-01',
          endDate: '2024-06-01',
          description: 'Led product strategy and development for B2B SaaS platform',
          achievements: [
            'Increased user engagement by 85% through data-driven feature optimization',
            'Launched 3 major product features with 95% customer satisfaction',
            'Reduced customer churn by 30% through improved onboarding experience'
          ],
          technologies: ['Jira', 'Figma', 'Google Analytics', 'SQL', 'Python']
        },
        {
          company: 'Digital Solutions Corp',
          position: 'Product Manager',
          duration: '2 years',
          startDate: '2019-06-01',
          endDate: '2021-06-01',
          description: 'Managed product roadmap for mobile applications',
          achievements: [
            'Grew monthly active users from 50K to 200K',
            'Led cross-functional team of 12 people'
          ]
        }
      ],
      education: [
        {
          institution: 'Stanford University',
          degree: 'MBA',
          field: 'Business Administration',
          graduationDate: '2019'
        },
        {
          institution: 'UC Berkeley',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          graduationDate: '2017'
        }
      ],
      skills: {
        technical: ['Product Strategy', 'Data Analysis', 'SQL', 'Python', 'A/B Testing', 'Figma', 'Jira'],
        soft: ['Strategic Thinking', 'Leadership', 'Cross-functional Collaboration', 'Communication'],
        tools: ['Google Analytics', 'Mixpanel', 'Tableau', 'Slack', 'Notion']
      },
      achievements: [
        'Product Manager of the Year 2023',
        'Certified Scrum Product Owner (CSPO)',
        'Google Analytics Certified'
      ],
      certifications: [
        {
          name: 'Certified Scrum Product Owner',
          issuer: 'Scrum Alliance',
          date: '2022-03'
        }
      ]
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Enhanced Video Generation Integration', () => {
    
    test('should generate enhanced video with industry optimization', async () => {
      // Mock enhanced prompt engine response
      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      advancedPromptEngine.generateEnhancedScript.mockResolvedValue({
        script: 'Hello! I\'m Sarah Chen, a Senior Product Manager at TechStartup Inc. With expertise in product strategy and data analysis, I\'ve built a career focused on creating exceptional user experiences. I recently increased user engagement by 85% through data-driven feature optimization and reduced customer churn by 30%. My approach combines strategic thinking with hands-on execution to deliver products that users love. I\'m passionate about solving complex product challenges and driving business growth. Let\'s connect to explore how we can collaborate on exciting product initiatives together.',
        qualityMetrics: {
          overallScore: 8.7,
          engagementScore: 8.5,
          industryAlignment: 0.82,
          personalityMatch: 0.89,
          technicalAccuracy: 0.85,
          deliveryOptimization: 0.91,
          professionalImpact: 0.88,
          feedback: ['Strong product management vocabulary', 'Clear value proposition', 'Engaging call-to-action']
        },
        industryTemplate: 'Technology & Software',
        personalityProfile: {
          communicationStyle: 'collaborative',
          leadershipType: 'strategic',
          technicalDepth: 'manager',
          industryFocus: 'Technology',
          careerStage: 'mid',
          personalityTraits: ['analytical', 'results-driven', 'collaborative']
        },
        optimizationLayers: {
          contextLayer: 'Product management expertise with focus on user experience and data-driven decisions',
          optimizationLayer: 'Technology sector positioning with innovation and growth focus',
          productionLayer: 'Professional video delivery with natural pacing and emphasis'
        },
        generationTime: 3500
      });

      // Mock D-ID API responses
      axios.post.mockResolvedValueOnce({
        data: { id: 'talk-123' }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'done',
          result_url: 'https://d-id.com/video-123.mp4'
        }
      });

      axios.head.mockResolvedValueOnce({
        headers: { 'content-length': '5242880' }
      });

      axios.get.mockResolvedValueOnce({
        data: Buffer.from('mock video data')
      });

      const options = {
        duration: 'medium' as const,
        style: 'professional' as const,
        useAdvancedPrompts: true,
        targetIndustry: 'technology',
        optimizationLevel: 'enhanced' as const,
        includeSubtitles: true
      };

      const result = await videoService.generateVideoIntroduction(mockCV, 'test-job-123', options);

      expect(result).toBeDefined();
      expect(result.script).toContain('Sarah Chen');
      expect(result.script).toContain('Senior Product Manager');
      expect(result.script).toContain('user engagement by 85%');
      expect(result.generationMethod).toBe('enhanced');
      expect(result.enhancedScript).toBeDefined();
      expect(result.scriptQualityScore).toBe(8.7);
      expect(result.industryAlignment).toBe(0.82);
      expect(result.subtitles).toBeDefined();
      expect(result.videoUrl).toContain('storage.googleapis.com');
      expect(result.duration).toBeGreaterThan(0);

      // Verify enhanced prompt engine was called with correct parameters
      expect(advancedPromptEngine.generateEnhancedScript).toHaveBeenCalledWith(
        mockCV,
        expect.objectContaining({
          duration: 'medium',
          style: 'professional',
          targetIndustry: 'technology',
          optimizationLevel: 'enhanced'
        })
      );

      // Verify D-ID API calls
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.d-id.com/talks',
        expect.objectContaining({
          script: expect.objectContaining({
            type: 'text',
            input: expect.stringContaining('Sarah Chen')
          })
        }),
        expect.any(Object)
      );
    });

    test('should fallback to basic generation when enhanced fails', async () => {
      // Mock enhanced prompt engine to fail
      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      advancedPromptEngine.generateEnhancedScript.mockRejectedValue(new Error('Enhanced generation failed'));

      // Mock basic OpenAI response
      const mockOpenAI = OpenAI();
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Hello! I\'m Sarah Chen, a Senior Product Manager with expertise in product strategy. I have experience leading teams and driving product growth. Let\'s connect to explore opportunities together.'
          }
        }]
      });

      // Mock D-ID API responses
      axios.post.mockResolvedValueOnce({
        data: { id: 'talk-456' }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          status: 'done',
          result_url: 'https://d-id.com/video-456.mp4'
        }
      });

      axios.head.mockResolvedValueOnce({
        headers: { 'content-length': '3145728' }
      });

      axios.get.mockResolvedValueOnce({
        data: Buffer.from('fallback video data')
      });

      const options = {
        duration: 'short' as const,
        style: 'friendly' as const,
        useAdvancedPrompts: true,
        optimizationLevel: 'enhanced' as const
      };

      const result = await videoService.generateVideoIntroduction(mockCV, 'test-job-456', options);

      expect(result).toBeDefined();
      expect(result.script).toContain('Sarah Chen');
      expect(result.generationMethod).toBe('basic');
      expect(result.enhancedScript).toBeUndefined();
      expect(result.scriptQualityScore).toBeUndefined();
      expect(result.industryAlignment).toBeUndefined();
    });

    test('should generate enhanced script only without video creation', async () => {
      // Mock enhanced prompt engine response
      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      const mockEnhancedResult = {
        script: 'Professional script for Sarah Chen...',
        qualityMetrics: {
          overallScore: 9.1,
          engagementScore: 9.0,
          industryAlignment: 0.88,
          personalityMatch: 0.92,
          technicalAccuracy: 0.87,
          deliveryOptimization: 0.93,
          professionalImpact: 0.91,
          feedback: ['Excellent engagement potential', 'Strong industry alignment']
        },
        industryTemplate: 'Marketing & Sales',
        personalityProfile: {
          communicationStyle: 'collaborative',
          leadershipType: 'strategic',
          technicalDepth: 'manager',
          industryFocus: 'Technology',
          careerStage: 'mid',
          personalityTraits: ['strategic', 'results-driven']
        },
        optimizationLayers: {
          contextLayer: 'Context analysis',
          optimizationLayer: 'Industry optimization',
          productionLayer: 'Production optimization'
        },
        generationTime: 2800
      };

      advancedPromptEngine.generateEnhancedScript.mockResolvedValue(mockEnhancedResult);

      const options = {
        duration: 'long' as const,
        style: 'energetic' as const,
        targetIndustry: 'marketing-sales',
        optimizationLevel: 'premium' as const
      };

      const result = await videoService.generateEnhancedScriptOnly(mockCV, options);

      expect(result).toEqual(mockEnhancedResult);
      expect(result.qualityMetrics.overallScore).toBe(9.1);
      expect(result.industryTemplate).toBe('Marketing & Sales');
      expect(result.generationTime).toBe(2800);

      // Verify no video generation API calls were made
      expect(axios.post).not.toHaveBeenCalled();
    });

    test('should provide industry recommendations', () => {
      // Mock industry templates service
      jest.doMock('../services/industry-templates.service', () => ({
        industryTemplatesService: {
          analyzeAndRecommendTemplate: jest.fn().mockReturnValue([
            {
              templateId: 'technology',
              score: 0.89,
              matchReasons: ['Strong technical background', 'Product management in tech'],
              strengthAreas: ['Technical Skills', 'Leadership'],
              improvementAreas: [],
              confidence: 0.92
            },
            {
              templateId: 'marketing-sales',
              score: 0.67,
              matchReasons: ['Product growth experience'],
              strengthAreas: ['Results Focus'],
              improvementAreas: ['Marketing Keywords'],
              confidence: 0.78
            }
          ])
        }
      }));

      const recommendations = videoService.getIndustryRecommendations(mockCV);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBe(2);
      expect(recommendations[0].templateId).toBe('technology');
      expect(recommendations[0].score).toBe(0.89);
      expect(recommendations[0].confidence).toBe(0.92);
    });

    test('should handle different video durations and styles', async () => {
      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      
      const durations: Array<'short' | 'medium' | 'long'> = ['short', 'medium', 'long'];
      const styles: Array<'professional' | 'friendly' | 'energetic'> = ['professional', 'friendly', 'energetic'];

      for (const duration of durations) {
        for (const style of styles) {
          // Reset mock
          advancedPromptEngine.generateEnhancedScript.mockResolvedValue({
            script: `Script for ${duration} ${style} video`,
            qualityMetrics: {
              overallScore: 8.0,
              engagementScore: 8.0,
              industryAlignment: 0.8,
              personalityMatch: 0.8,
              technicalAccuracy: 0.8,
              deliveryOptimization: 0.8,
              professionalImpact: 0.8,
              feedback: []
            },
            industryTemplate: 'Technology',
            personalityProfile: {
              communicationStyle: 'collaborative',
              leadershipType: 'strategic',
              technicalDepth: 'manager',
              industryFocus: 'Technology',
              careerStage: 'mid',
              personalityTraits: []
            },
            optimizationLayers: {
              contextLayer: 'context',
              optimizationLayer: 'optimization',
              productionLayer: 'production'
            },
            generationTime: 1000
          });

          const options = {
            duration,
            style,
            useAdvancedPrompts: true,
            optimizationLevel: 'enhanced' as const
          };

          const result = await videoService.generateEnhancedScriptOnly(mockCV, options);

          expect(result.script).toContain(duration);
          expect(result.script).toContain(style);

          // Verify correct parameters were passed
          expect(advancedPromptEngine.generateEnhancedScript).toHaveBeenCalledWith(
            mockCV,
            expect.objectContaining({
              duration,
              style,
              optimizationLevel: 'enhanced'
            })
          );
        }
      }
    });

    test('should handle optimization levels correctly', async () => {
      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      
      const levels: Array<'basic' | 'enhanced' | 'premium'> = ['basic', 'enhanced', 'premium'];

      for (const level of levels) {
        advancedPromptEngine.generateEnhancedScript.mockResolvedValue({
          script: `Script with ${level} optimization`,
          qualityMetrics: {
            overallScore: level === 'premium' ? 9.2 : level === 'enhanced' ? 8.5 : 7.8,
            engagementScore: 8.0,
            industryAlignment: 0.8,
            personalityMatch: 0.8,
            technicalAccuracy: 0.8,
            deliveryOptimization: 0.8,
            professionalImpact: 0.8,
            feedback: [`Generated with ${level} optimization level`]
          },
          industryTemplate: 'Technology',
          personalityProfile: {
            communicationStyle: 'collaborative',
            leadershipType: 'strategic',
            technicalDepth: 'manager',
            industryFocus: 'Technology',
            careerStage: 'mid',
            personalityTraits: []
          },
          optimizationLayers: {
            contextLayer: 'context',
            optimizationLayer: 'optimization',
            productionLayer: 'production'
          },
          generationTime: 1000
        });

        const options = {
          duration: 'medium' as const,
          style: 'professional' as const,
          useAdvancedPrompts: true,
          optimizationLevel: level
        };

        const result = await videoService.generateEnhancedScriptOnly(mockCV, options);

        expect(result.script).toContain(level);
        expect(result.qualityMetrics.feedback[0]).toContain(level);
        
        if (level === 'premium') {
          expect(result.qualityMetrics.overallScore).toBeGreaterThan(9.0);
        }
      }
    });

    test('should maintain backward compatibility with basic options', async () => {
      // Mock basic OpenAI response
      const mockOpenAI = OpenAI();
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Basic video script for Sarah Chen, Senior Product Manager with product strategy expertise.'
          }
        }]
      });

      // Mock D-ID responses
      axios.post.mockResolvedValue({ data: { id: 'talk-basic' } });
      axios.get.mockResolvedValue({
        data: { status: 'done', result_url: 'https://d-id.com/basic.mp4' }
      });
      axios.head.mockResolvedValue({ headers: { 'content-length': '2097152' } });
      axios.get.mockResolvedValue({ data: Buffer.from('basic video') });

      const basicOptions = {
        duration: 'medium' as const,
        style: 'professional' as const,
        useAdvancedPrompts: false // Explicitly disable enhanced prompts
      };

      const result = await videoService.generateVideoIntroduction(mockCV, 'basic-job', basicOptions);

      expect(result).toBeDefined();
      expect(result.generationMethod).toBe('basic');
      expect(result.script).toContain('Sarah Chen');
      expect(result.enhancedScript).toBeUndefined();
      expect(result.scriptQualityScore).toBeUndefined();

      // Verify enhanced prompt engine was not called
      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      expect(advancedPromptEngine.generateEnhancedScript).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    
    test('should handle enhanced script generation errors gracefully', async () => {
      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      advancedPromptEngine.generateEnhancedScript.mockRejectedValue(new Error('Enhanced generation unavailable'));

      const result = await videoService.generateEnhancedScriptOnly(mockCV, {});

      // Should throw the error since this method doesn't have fallback
      await expect(videoService.generateEnhancedScriptOnly(mockCV, {})).rejects.toThrow('Enhanced script generation failed');
    });

    test('should handle industry recommendation errors', () => {
      // Mock industry service to throw error
      jest.doMock('../services/industry-templates.service', () => ({
        industryTemplatesService: {
          analyzeAndRecommendTemplate: jest.fn().mockImplementation(() => {
            throw new Error('Industry analysis failed');
          })
        }
      }));

      const recommendations = videoService.getIndustryRecommendations(mockCV);

      expect(recommendations).toEqual([]);
    });

    test('should handle minimal CV data', async () => {
      const minimalCV: ParsedCV = {
        personalInfo: { name: 'Minimal User' }
      };

      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      advancedPromptEngine.generateEnhancedScript.mockResolvedValue({
        script: 'Hello! I\'m Minimal User, a professional ready to make an impact.',
        qualityMetrics: {
          overallScore: 6.5,
          engagementScore: 6.0,
          industryAlignment: 0.5,
          personalityMatch: 0.6,
          technicalAccuracy: 0.7,
          deliveryOptimization: 0.8,
          professionalImpact: 0.5,
          feedback: ['Limited CV data available for optimization']
        },
        industryTemplate: 'General Business Professional',
        personalityProfile: {
          communicationStyle: 'collaborative',
          leadershipType: 'operational',
          technicalDepth: 'generalist',
          industryFocus: 'General Business',
          careerStage: 'early',
          personalityTraits: ['professional']
        },
        optimizationLayers: {
          contextLayer: 'Limited context available',
          optimizationLayer: 'Basic optimization applied',
          productionLayer: 'Standard production formatting'
        },
        generationTime: 1500
      });

      const result = await videoService.generateEnhancedScriptOnly(minimalCV, {});

      expect(result).toBeDefined();
      expect(result.script).toContain('Minimal User');
      expect(result.qualityMetrics.overallScore).toBeLessThan(7.0);
      expect(result.qualityMetrics.feedback[0]).toContain('Limited CV data');
    });
  });

  describe('Performance and Quality Metrics', () => {
    
    test('should complete enhanced generation within target time', async () => {
      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      advancedPromptEngine.generateEnhancedScript.mockResolvedValue({
        script: 'Fast generation test script',
        qualityMetrics: { overallScore: 8.0, engagementScore: 8.0, industryAlignment: 0.8, personalityMatch: 0.8, technicalAccuracy: 0.8, deliveryOptimization: 0.8, professionalImpact: 0.8, feedback: [] },
        industryTemplate: 'Technology',
        personalityProfile: { communicationStyle: 'collaborative', leadershipType: 'strategic', technicalDepth: 'manager', industryFocus: 'Technology', careerStage: 'mid', personalityTraits: [] },
        optimizationLayers: { contextLayer: 'context', optimizationLayer: 'optimization', productionLayer: 'production' },
        generationTime: 3000 // 3 seconds
      });

      const startTime = Date.now();
      const result = await videoService.generateEnhancedScriptOnly(mockCV, {});
      const totalTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(totalTime).toBeLessThan(10000); // Should complete under 10 seconds total
      expect(result.generationTime).toBeLessThan(10000); // Prompt engine should complete under 10 seconds
    });

    test('should achieve target quality scores', async () => {
      const { advancedPromptEngine } = require('../services/enhanced-prompt-engine.service');
      advancedPromptEngine.generateEnhancedScript.mockResolvedValue({
        script: 'High quality script with excellent metrics',
        qualityMetrics: {
          overallScore: 8.7, // Above target of 8.5
          engagementScore: 8.5,
          industryAlignment: 0.85, // Above target of 0.8
          personalityMatch: 0.90,
          technicalAccuracy: 0.88,
          deliveryOptimization: 0.92,
          professionalImpact: 0.87,
          feedback: ['Excellent quality across all metrics']
        },
        industryTemplate: 'Technology',
        personalityProfile: { communicationStyle: 'collaborative', leadershipType: 'strategic', technicalDepth: 'manager', industryFocus: 'Technology', careerStage: 'mid', personalityTraits: [] },
        optimizationLayers: { contextLayer: 'context', optimizationLayer: 'optimization', productionLayer: 'production' },
        generationTime: 2500
      });

      const result = await videoService.generateEnhancedScriptOnly(mockCV, {
        optimizationLevel: 'premium'
      });

      expect(result.qualityMetrics.overallScore).toBeGreaterThan(8.5); // Target: >8.5
      expect(result.qualityMetrics.industryAlignment).toBeGreaterThan(0.8); // Target: >0.8
      expect(result.generationTime).toBeLessThan(10000); // Target: <10 seconds
    });
  });
});