/**
 * Enhanced Prompt Engine Test Configuration
 * 
 * Test configuration and utilities for the enhanced prompt engineering system
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { ParsedCV } from '../types/enhanced-models';

/**
 * Test data fixtures for different industry professionals
  */
export const testFixtures = {
  /**
   * Technology professional with comprehensive background
    */
  technologyProfessional: {
    personalInfo: {
      name: 'Alex Rodriguez',
      title: 'Senior Full Stack Developer',
      email: 'alex.rodriguez@techcorp.com',
      summary: 'Full-stack developer with 6 years of experience building scalable web applications'
    },
    experience: [
      {
        company: 'TechCorp Solutions',
        position: 'Senior Full Stack Developer',
        duration: '4 years',
        startDate: '2020-03-01',
        description: 'Led development of enterprise web applications using React and Node.js',
        achievements: [
          'Architected microservices platform serving 500K+ users',
          'Reduced API response time by 60% through optimization',
          'Mentored team of 6 junior developers'
        ],
        technologies: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker', 'Kubernetes']
      }
    ],
    skills: {
      technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'PostgreSQL'],
      soft: ['Problem Solving', 'Team Leadership', 'Mentoring', 'Agile Development'],
      tools: ['Git', 'Jenkins', 'Jira', 'VS Code', 'Postman']
    },
    achievements: [
      'AWS Certified Solutions Architect',
      'Speaker at React Conference 2023',
      'Open source contributor with 2K+ GitHub stars'
    ]
  } as ParsedCV,

  /**
   * Marketing professional with growth focus
    */
  marketingProfessional: {
    personalInfo: {
      name: 'Maria Santos',
      title: 'Digital Marketing Manager',
      summary: 'Data-driven marketing professional with expertise in growth marketing and customer acquisition'
    },
    experience: [
      {
        company: 'GrowthMarketing Inc',
        position: 'Digital Marketing Manager',
        duration: '3 years',
        startDate: '2021-01-01',
        description: 'Led digital marketing campaigns and growth initiatives',
        achievements: [
          'Increased organic traffic by 300% through SEO optimization',
          'Generated $5M in additional revenue through paid campaigns',
          'Improved conversion rate by 45% through A/B testing'
        ]
      }
    ],
    skills: {
      technical: ['Google Analytics', 'Google Ads', 'Facebook Ads', 'HubSpot', 'Salesforce', 'Tableau'],
      soft: ['Creative Thinking', 'Data Analysis', 'Project Management', 'Communication']
    },
    achievements: [
      'Google Ads Certified',
      'HubSpot Inbound Marketing Certified',
      'Marketing Campaign of the Year 2023'
    ]
  } as ParsedCV,

  /**
   * Finance professional with analytical background
    */
  financeProfessional: {
    personalInfo: {
      name: 'David Kim',
      title: 'Investment Analyst',
      summary: 'Quantitative analyst with expertise in portfolio management and risk assessment'
    },
    experience: [
      {
        company: 'Capital Investments Ltd',
        position: 'Investment Analyst',
        duration: '4 years',
        startDate: '2020-01-01',
        description: 'Analyzed investment opportunities and managed client portfolios',
        achievements: [
          'Managed $100M portfolio with 15% annual return',
          'Reduced client portfolio risk by 30%',
          'Developed automated trading algorithm'
        ]
      }
    ],
    skills: {
      technical: ['Excel', 'Python', 'R', 'Bloomberg Terminal', 'SQL', 'MATLAB'],
      soft: ['Analytical Thinking', 'Risk Management', 'Client Relations', 'Financial Modeling']
    },
    achievements: [
      'CFA Charter Holder',
      'Financial Risk Manager (FRM)',
      'Top Performer Award 2023'
    ]
  } as ParsedCV,

  /**
   * Minimal CV for edge case testing
    */
  minimalCV: {
    personalInfo: {
      name: 'John Doe'
    }
  } as ParsedCV,

  /**
   * CV with missing critical information
    */
  incompleteCV: {
    personalInfo: {
      name: 'Jane Smith',
      email: 'jane@example.com'
    },
    experience: [
      {
        company: 'Some Company',
        position: 'Employee',
        duration: '1 year',
        startDate: '2023-01-01'
      }
    ]
  } as ParsedCV
};

/**
 * Mock responses for testing different scenarios
  */
export const mockResponses = {
  /**
   * High-quality OpenAI response for technology professional
    */
  technologyScript: {
    context: 'Experienced full-stack developer with expertise in modern web technologies and cloud architecture',
    optimization: 'Technology sector positioning with innovation focus and technical excellence',
    production: 'Professional video delivery with technical credibility and clear value proposition',
    finalScript: 'Hello! I\'m Alex Rodriguez, a Senior Full Stack Developer at TechCorp Solutions. With 6 years of experience in scalable web applications, I\'ve architected microservices platforms serving over 500,000 users and reduced API response times by 60%. My expertise spans React, Node.js, and AWS cloud architecture. I\'m passionate about mentoring teams and building innovative solutions that make a real impact. As an AWS Certified Solutions Architect and open source contributor, I bring both technical depth and collaborative leadership to every project. Let\'s connect to explore how we can build something amazing together.',
    qualityMetrics: {
      overallScore: 8.9,
      engagementScore: 8.7,
      industryAlignment: 0.91,
      personalityMatch: 0.88,
      technicalAccuracy: 0.92,
      deliveryOptimization: 0.89,
      professionalImpact: 0.90,
      feedback: ['Strong technical credibility', 'Clear value proposition', 'Engaging call-to-action']
    }
  },

  /**
   * Medium-quality response for testing fallbacks
    */
  fallbackScript: {
    context: 'Professional with relevant experience and skills',
    optimization: 'General business positioning with professional focus',
    production: 'Standard video delivery format',
    finalScript: 'Hello! I\'m a dedicated professional with experience and expertise. I bring value through my skills and commitment to excellence. Let\'s connect to explore opportunities together.',
    qualityMetrics: {
      overallScore: 7.2,
      engagementScore: 7.0,
      industryAlignment: 0.65,
      personalityMatch: 0.70,
      technicalAccuracy: 0.75,
      deliveryOptimization: 0.80,
      professionalImpact: 0.68,
      feedback: ['Adequate structure', 'Generic messaging', 'Room for improvement']
    }
  },

  /**
   * Error response for testing error handling
    */
  errorResponse: {
    error: 'API quota exceeded',
    code: 'insufficient_quota',
    type: 'openai_api_error'
  }
};

/**
 * Test configuration settings
  */
export const testConfig = {
  /**
   * Timeout settings for different test types
    */
  timeouts: {
    unit: 5000,        // 5 seconds for unit tests
    integration: 15000, // 15 seconds for integration tests
    e2e: 30000         // 30 seconds for end-to-end tests
  },

  /**
   * Quality thresholds for validation
    */
  qualityThresholds: {
    minimum: 7.0,
    target: 8.5,
    premium: 9.0
  },

  /**
   * Performance targets
    */
  performance: {
    maxGenerationTime: 10000,  // 10 seconds
    maxScriptLength: 300,      // 300 words for long scripts
    minScriptLength: 50        // 50 words for short scripts
  },

  /**
   * Industry template validation
    */
  industryValidation: {
    requiredTemplates: [
      'technology',
      'marketing-sales',
      'finance-consulting',
      'healthcare',
      'manufacturing',
      'general-business'
    ],
    minKeywordsPerTemplate: 5,
    minVocabularyWordsPerTemplate: 5
  }
};

/**
 * Utility functions for testing
  */
export const testUtils = {
  /**
   * Create a mock CV with specified characteristics
    */
  createMockCV: (overrides: Partial<ParsedCV> = {}): ParsedCV => {
    const baseCV: ParsedCV = {
      personalInfo: {
        name: 'Test Professional',
        title: 'Test Position',
        email: 'test@example.com',
        summary: 'Test professional summary'
      },
      experience: [
        {
          company: 'Test Company',
          position: 'Test Role',
          duration: '2 years',
          startDate: '2022-01-01',
          description: 'Test description',
          achievements: ['Test achievement']
        }
      ],
      skills: {
        technical: ['Test Skill 1', 'Test Skill 2'],
        soft: ['Communication', 'Leadership']
      },
      achievements: ['Test certification']
    };

    return { ...baseCV, ...overrides };
  },

  /**
   * Validate script quality metrics
    */
  validateQualityMetrics: (metrics: any): boolean => {
    return (
      typeof metrics.overallScore === 'number' &&
      metrics.overallScore >= 0 && metrics.overallScore <= 10 &&
      typeof metrics.engagementScore === 'number' &&
      metrics.engagementScore >= 0 && metrics.engagementScore <= 10 &&
      typeof metrics.industryAlignment === 'number' &&
      metrics.industryAlignment >= 0 && metrics.industryAlignment <= 1 &&
      Array.isArray(metrics.feedback)
    );
  },

  /**
   * Validate script content
    */
  validateScriptContent: (script: string, cv: ParsedCV): boolean => {
    const wordCount = script.split(' ').length;
    const hasName = cv.personalInfo?.name ? script.includes(cv.personalInfo.name) : true;
    const hasMinimumLength = wordCount >= testConfig.performance.minScriptLength;
    const hasMaximumLength = wordCount <= testConfig.performance.maxScriptLength;

    return hasName && hasMinimumLength && hasMaximumLength;
  },

  /**
   * Generate random test data
    */
  generateRandomCV: (): ParsedCV => {
    const names = ['Alice Johnson', 'Bob Wilson', 'Carol Davis', 'David Chen', 'Emily Rodriguez'];
    const companies = ['TechCorp', 'InnovateCo', 'GrowthLabs', 'DataSystems', 'CloudSolutions'];
    const positions = ['Senior Developer', 'Product Manager', 'Data Analyst', 'Marketing Director', 'Operations Manager'];
    
    return {
      personalInfo: {
        name: names[Math.floor(Math.random() * names.length)],
        title: positions[Math.floor(Math.random() * positions.length)],
        email: 'test@example.com'
      },
      experience: [
        {
          company: companies[Math.floor(Math.random() * companies.length)],
          position: positions[Math.floor(Math.random() * positions.length)],
          duration: `${Math.floor(Math.random() * 5) + 1} years`,
          startDate: '2020-01-01',
          achievements: ['Improved efficiency by 25%', 'Led successful project']
        }
      ],
      skills: {
        technical: ['JavaScript', 'Python', 'SQL'],
        soft: ['Leadership', 'Communication']
      }
    };
  },

  /**
   * Mock OpenAI response generator
    */
  createMockOpenAIResponse: (content: string) => ({
    choices: [
      {
        message: {
          content
        }
      }
    ]
  }),

  /**
   * Mock industry template
    */
  createMockTemplate: (templateId: string) => ({
    id: templateId,
    name: `${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Template`,
    sector: templateId,
    vocabularyFocus: ['professional', 'experienced', 'skilled'],
    commonKeywords: ['experience', 'professional', 'expertise'],
    avoidKeywords: ['basic'],
    requirements: ['Professional presentation'],
    scoringWeights: {
      technicalSkills: 0.25,
      leadership: 0.25,
      results: 0.25,
      innovation: 0.15,
      collaboration: 0.10
    },
    personalityFit: {
      communicationStyles: ['professional'],
      leadershipTypes: ['operational'],
      preferredTraits: ['experienced']
    },
    industrySpecificMetrics: ['Performance metrics']
  }),

  /**
   * Delay utility for testing async operations
    */
  delay: (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms))
};

/**
 * Jest setup helpers
  */
export const jestHelpers = {
  /**
   * Setup mocks for enhanced prompt engine tests
    */
  setupPromptEngineMocks: () => {
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

    // Mock industry templates service
    jest.mock('../services/industry-templates.service', () => ({
      industryTemplatesService: {
        getTemplate: jest.fn(),
        analyzeAndRecommendTemplate: jest.fn(),
        getAllTemplates: jest.fn()
      }
    }));

    // Mock config
    jest.mock('../config/environment', () => ({
      config: {
        openai: {
          apiKey: 'test-api-key'
        }
      }
    }));
  },

  /**
   * Setup mocks for video generation tests
    */
  setupVideoGenerationMocks: () => {
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

    // Mock Axios
    jest.mock('axios', () => ({
      post: jest.fn(),
      get: jest.fn(),
      head: jest.fn()
    }));

    // Mock enhanced prompt engine
    jest.mock('../services/enhanced-prompt-engine.service', () => ({
      advancedPromptEngine: {
        generateEnhancedScript: jest.fn()
      }
    }));
  },

  /**
   * Reset all mocks
    */
  resetMocks: () => {
    jest.clearAllMocks();
    jest.resetModules();
  }
};