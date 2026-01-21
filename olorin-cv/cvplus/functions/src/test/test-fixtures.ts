/**
 * Test Fixtures and Mock Data for Portal Generation Tests
 * 
 * Provides realistic test data, mocks, and utilities for testing
 * the portal generation system.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
  */

import { ParsedCV } from '../types/job';
import { PortalConfig, PortalStatus, PortalUrls, RAGEmbedding, AssetBundle } from '../types/portal';

// ============================================================================
// CV TEST FIXTURES
// ============================================================================

export const mockMinimalCV: ParsedCV = {
  personalInfo: {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    title: 'Software Developer'
  },
  summary: 'Entry-level software developer with passion for coding.',
  skills: [
    { name: 'JavaScript', level: 'Beginner', category: 'Programming' }
  ]
};

export const mockStandardCV: ParsedCV = {
  personalInfo: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    title: 'Senior Software Engineer',
    location: 'San Francisco, CA',
    website: 'https://johndoe.dev',
    profileImage: 'https://example.com/profile.jpg'
  },
  summary: 'Experienced software engineer with 8+ years developing scalable web applications and leading engineering teams.',
  experience: [
    {
      company: 'Tech Corp',
      position: 'Senior Software Engineer',
      startDate: '2020-01-01',
      endDate: '2024-12-31',
      description: 'Led development of microservices architecture serving 1M+ users',
      achievements: ['Improved system performance by 40%', 'Mentored 5 junior developers'],
      technologies: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
      companyLogo: 'https://example.com/techcorp-logo.png'
    },
    {
      company: 'Startup Inc',
      position: 'Full Stack Developer',
      startDate: '2018-01-01',
      endDate: '2020-01-01',
      description: 'Built entire frontend and backend infrastructure',
      achievements: ['Deployed first production system', 'Reduced load times by 60%'],
      technologies: ['Vue.js', 'Python', 'MongoDB']
    }
  ],
  skills: [
    { name: 'JavaScript', level: 'Expert', category: 'Programming' },
    { name: 'TypeScript', level: 'Expert', category: 'Programming' },
    { name: 'React', level: 'Expert', category: 'Frontend' },
    { name: 'Node.js', level: 'Advanced', category: 'Backend' },
    { name: 'PostgreSQL', level: 'Advanced', category: 'Database' },
    { name: 'AWS', level: 'Intermediate', category: 'Cloud' }
  ],
  education: [
    {
      institution: 'Stanford University',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      year: '2016',
      gpa: '3.8'
    }
  ],
  projects: [
    {
      name: 'Open Source Library',
      description: 'Created a popular React component library with 10K+ GitHub stars',
      technologies: ['React', 'TypeScript', 'Storybook'],
      url: 'https://github.com/johndoe/react-components',
      images: ['https://example.com/project1.png']
    },
    {
      name: 'Mobile App',
      description: 'Built cross-platform mobile app for task management',
      technologies: ['React Native', 'Firebase', 'Redux'],
      url: 'https://app-store.com/taskmanager'
    }
  ],
  certifications: [
    {
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023-06-01',
      certificateImage: 'https://example.com/aws-cert.png'
    },
    {
      name: 'Google Cloud Professional',
      issuer: 'Google Cloud',
      date: '2023-03-15'
    }
  ]
};

export const mockExecutiveCV: ParsedCV = {
  personalInfo: {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@executive.com',
    phone: '+1 (555) 987-6543',
    title: 'Chief Technology Officer',
    location: 'New York, NY',
    website: 'https://sarahjohnson.tech',
    profileImage: 'https://example.com/executive-profile.jpg'
  },
  summary: 'Visionary technology executive with 15+ years of experience leading digital transformation initiatives at Fortune 500 companies. Proven track record of scaling engineering teams from 10 to 200+ members.',
  experience: [
    {
      company: 'Fortune 500 Corp',
      position: 'Chief Technology Officer',
      startDate: '2019-01-01',
      endDate: '2024-12-31',
      description: 'Led digital transformation strategy for $2B revenue company',
      achievements: [
        'Increased engineering productivity by 300%',
        'Reduced infrastructure costs by $50M annually',
        'Launched 15 new digital products',
        'Built and scaled engineering team to 200+ members'
      ],
      technologies: ['Strategic Planning', 'Team Leadership', 'Digital Transformation', 'Cloud Architecture']
    },
    {
      company: 'Growth Stage Startup',
      position: 'VP of Engineering',
      startDate: '2015-01-01',
      endDate: '2019-01-01',
      description: 'Scaled engineering organization through Series A to IPO',
      achievements: [
        'Grew team from 10 to 80 engineers',
        'Led company through successful IPO',
        'Established engineering culture and practices'
      ],
      technologies: ['Leadership', 'Scaling', 'IPO Preparation', 'Engineering Culture']
    }
  ],
  skills: [
    { name: 'Strategic Planning', level: 'Expert', category: 'Leadership' },
    { name: 'Team Building', level: 'Expert', category: 'Leadership' },
    { name: 'Digital Transformation', level: 'Expert', category: 'Strategy' },
    { name: 'Cloud Architecture', level: 'Advanced', category: 'Technology' },
    { name: 'Product Strategy', level: 'Advanced', category: 'Strategy' }
  ],
  education: [
    {
      institution: 'Harvard Business School',
      degree: 'Master of Business Administration',
      field: 'Technology Management',
      year: '2010'
    },
    {
      institution: 'MIT',
      degree: 'Master of Science',
      field: 'Computer Science',
      year: '2008'
    }
  ],
  projects: [
    {
      name: 'Digital Transformation Initiative',
      description: 'Led company-wide digital transformation affecting 50,000+ employees',
      technologies: ['Change Management', 'Cloud Migration', 'Process Optimization']
    }
  ],
  certifications: [
    {
      name: 'Executive Leadership Certificate',
      issuer: 'Stanford Graduate School of Business',
      date: '2022-01-01'
    }
  ]
};

export const mockCreativeCV: ParsedCV = {
  personalInfo: {
    name: 'Alex Chen',
    email: 'alex.chen@creative.studio',
    title: 'UX/UI Designer & Creative Director',
    location: 'Los Angeles, CA',
    website: 'https://alexchen.design',
    profileImage: 'https://example.com/creative-profile.jpg'
  },
  summary: 'Award-winning creative director with expertise in user experience design, brand identity, and digital storytelling. Passionate about creating meaningful connections between brands and users.',
  experience: [
    {
      company: 'Design Studio Plus',
      position: 'Creative Director',
      startDate: '2021-01-01',
      endDate: '2024-12-31',
      description: 'Led creative strategy for major brand campaigns and digital experiences',
      achievements: [
        'Won 3 Webby Awards for innovative digital experiences',
        'Increased client engagement by 250%',
        'Led rebranding for 10+ major clients'
      ],
      technologies: ['Figma', 'Adobe Creative Suite', 'Prototyping', 'User Research']
    }
  ],
  skills: [
    { name: 'UI/UX Design', level: 'Expert', category: 'Design' },
    { name: 'Brand Strategy', level: 'Expert', category: 'Strategy' },
    { name: 'Prototyping', level: 'Advanced', category: 'Design' },
    { name: 'User Research', level: 'Advanced', category: 'Research' }
  ],
  education: [
    {
      institution: 'Art Center College of Design',
      degree: 'Bachelor of Fine Arts',
      field: 'Graphic Design',
      year: '2018'
    }
  ],
  projects: [
    {
      name: 'Brand Identity System',
      description: 'Comprehensive brand identity for Fortune 500 technology company',
      technologies: ['Brand Strategy', 'Visual Identity', 'Design Systems'],
      images: ['https://example.com/brand-project.jpg']
    },
    {
      name: 'Award-Winning App Interface',
      description: 'Mobile app interface that won multiple design awards',
      technologies: ['Mobile Design', 'User Experience', 'Interactive Design'],
      images: ['https://example.com/app-interface.jpg']
    }
  ]
};

// ============================================================================
// PORTAL CONFIGURATION FIXTURES
// ============================================================================

export const mockPortalConfig: PortalConfig = {
  id: 'portal-test-123',
  jobId: 'job-test-456',
  userId: 'user-test-789',
  template: {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Clean and modern template for software professionals',
    category: 'corporate_professional',
    theme: {
      id: 'blue-modern',
      name: 'Blue Modern',
      colors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        background: '#FFFFFF',
        text: {
          primary: '#1F2937',
          secondary: '#6B7280',
          muted: '#9CA3AF'
        },
        border: {
          primary: '#E5E7EB',
          secondary: '#F3F4F6'
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6'
        }
      },
      typography: {
        fontFamilies: {
          heading: 'Inter, sans-serif',
          body: 'Inter, sans-serif',
          code: 'Fira Code, monospace'
        },
        fontSizes: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem'
        },
        lineHeights: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75
        },
        fontWeights: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        }
      }
    },
    version: '1.0.0',
    isPremium: false,
    config: {
      supportedLanguages: ['en', 'es', 'fr'],
      defaultLanguage: 'en',
      mobileOptimization: 'enhanced',
      seo: {
        sitemap: true
      }
    },
    requiredSections: ['hero', 'experience', 'skills', 'contact'],
    optionalSections: ['education', 'projects', 'certifications']
  },
  customization: {
    personalInfo: {},
    theme: {},
    sections: {},
    content: {},
    layout: {},
    features: {
      enableChat: true,
      enableContactForm: true,
      enablePortfolio: true,
      enableTestimonials: false,
      enableBlog: false,
      enableAnalytics: true,
      enableSocialSharing: true,
      enableCVDownload: true,
      enableCalendar: false,
      enableDarkMode: true,
      enableMultiLanguage: false,
      enableAccessibility: true
    }
  },
  ragConfig: {
    enabled: true,
    vectorDatabase: {
      provider: 'local_file'
    },
    embeddings: {
      provider: 'openai',
      model: 'text-embedding-ada-002',
      dimensions: 1536
    },
    chatService: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9
      }
    }
  },
  huggingFaceConfig: {
    spaceName: 'johndoe-portfolio',
    visibility: 'public',
    sdk: 'gradio',
    hardware: 'cpu-basic',
    template: 'gradio-portfolio',
    repository: {
      name: 'johndoe-portfolio',
      description: 'Professional portfolio website for John Doe',
      git: {
        branch: 'main',
        commitMessage: 'Initial portal deployment'
      },
      files: []
    },
    environmentVariables: {
      ANTHROPIC_API_KEY: 'test-key',
      OPENAI_API_KEY: 'test-key'
    }
  },
  status: PortalStatus.PENDING,
  urls: {
    portal: '',
    chat: '',
    contact: '',
    download: '',
    qrMenu: '',
    api: {
      chat: '',
      contact: '',
      analytics: ''
    }
  },
  analytics: {
    metrics: {
      totalViews: 0,
      uniqueVisitors: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      chatSessions: 0,
      contactSubmissions: 0,
      cvDownloads: 0,
      lastUpdated: new Date()
    },
    qrCodes: {
      totalScans: 0,
      uniqueScans: 0,
      sources: {
        primary: 0,
        chat: 0,
        contact: 0,
        menu: 0
      },
      conversions: {
        scanToView: 0,
        scanToChat: 0,
        scanToContact: 0
      },
      devices: {
        mobile: 0,
        tablet: 0,
        desktop: 0
      },
      locations: []
    }
  },
  privacy: {
    level: 'public',
    masking: {
      maskContactInfo: false,
      maskCompanies: [],
      maskDates: false,
      customRules: []
    },
    analyticsConsent: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

// ============================================================================
// PORTAL URLS FIXTURES
// ============================================================================

export const mockPortalUrls: PortalUrls = {
  portal: 'https://johndoe-portfolio.hf.space',
  chat: 'https://johndoe-portfolio.hf.space/chat',
  contact: 'https://johndoe-portfolio.hf.space/contact',
  download: 'https://johndoe-portfolio.hf.space/cv.pdf',
  qrMenu: 'https://johndoe-portfolio.hf.space/qr-menu',
  api: {
    chat: 'https://johndoe-portfolio.hf.space/api/chat',
    contact: 'https://johndoe-portfolio.hf.space/api/contact',
    analytics: 'https://johndoe-portfolio.hf.space/api/analytics'
  }
};

// ============================================================================
// RAG EMBEDDINGS FIXTURES
// ============================================================================

export const mockRAGEmbeddings: RAGEmbedding[] = [
  {
    id: 'embed-1',
    content: 'Senior Software Engineer with 8+ years of experience in web development',
    metadata: {
      section: 'experience',
      importance: 9,
      keywords: ['senior', 'software', 'engineer', 'web', 'development'],
      contentType: 'description',
      company: 'Tech Corp',
      role: 'Senior Software Engineer'
    },
    vector: Array(1536).fill(0).map(() => Math.random()),
    tokens: 15,
    createdAt: new Date()
  },
  {
    id: 'embed-2',
    content: 'Led development of microservices architecture serving 1M+ users',
    metadata: {
      section: 'experience',
      importance: 8,
      keywords: ['microservices', 'architecture', 'scalability', 'users'],
      contentType: 'achievement',
      company: 'Tech Corp'
    },
    vector: Array(1536).fill(0).map(() => Math.random()),
    tokens: 12,
    createdAt: new Date()
  },
  {
    id: 'embed-3',
    content: 'Expert level JavaScript and TypeScript programming skills',
    metadata: {
      section: 'skills',
      importance: 7,
      keywords: ['javascript', 'typescript', 'programming', 'expert'],
      contentType: 'skill',
      technologies: ['JavaScript', 'TypeScript']
    },
    vector: Array(1536).fill(0).map(() => Math.random()),
    tokens: 8,
    createdAt: new Date()
  }
];

// ============================================================================
// ASSET BUNDLE FIXTURES
// ============================================================================

export const mockAssetBundle: AssetBundle = {
  assets: [
    {
      id: 'asset-profile-1',
      originalPath: 'https://example.com/profile.jpg',
      processedPath: 'portals/job-test/assets/profile.jpg',
      type: 'profile_image',
      fileType: 'image',
      size: 1024000, // 1MB
      optimizedSize: 512000, // 512KB
      compressionRatio: 0.5,
      url: 'https://storage.googleapis.com/bucket/portals/job-test/assets/profile.jpg',
      metadata: {
        originalName: 'profile.jpg',
        mimeType: 'image/jpeg',
        dimensions: { width: 800, height: 800 },
        quality: 85,
        isOptimized: true,
        source: 'cv_extraction',
        description: 'Professional profile image',
        altText: 'John Doe profile picture',
        tags: ['profile', 'professional']
      },
      createdAt: new Date()
    }
  ],
  manifest: {
    version: '1.0.0',
    created: new Date(),
    assets: {
      'asset-profile-1': {
        id: 'asset-profile-1',
        path: 'portals/job-test/assets/profile.jpg',
        url: 'https://storage.googleapis.com/bucket/portals/job-test/assets/profile.jpg',
        type: 'profile_image',
        size: 512000,
        checksum: 'abc123def456',
        lastModified: new Date()
      }
    },
    cdn: {
      provider: 'firebase',
      baseUrl: 'https://storage.googleapis.com/bucket',
      cachingPolicy: {
        maxAge: 31536000,
        staleWhileRevalidate: 86400,
        cacheControl: 'public, max-age=31536000'
      },
      optimizationSettings: {
        autoFormat: true,
        autoQuality: true,
        progressive: true,
        stripMetadata: true
      }
    },
    optimization: {
      imagesOptimized: 1,
      documentsCompressed: 0,
      totalProcessingTime: 2500,
      qualitySettings: {
        images: { jpeg: 85, png: 90, webp: 80 },
        documents: { pdf: 75 },
        videos: { mp4: 70, webm: 75 }
      },
      techniques: ['lossy_compression', 'progressive_encoding', 'metadata_stripping']
    }
  },
  totalSize: 512000,
  compressionSummary: {
    originalTotalSize: 1024000,
    compressedTotalSize: 512000,
    totalSavings: 512000,
    averageCompressionRatio: 0.5,
    compressionDetails: [
      {
        type: 'profile_image',
        count: 1,
        originalSize: 1024000,
        compressedSize: 512000,
        savings: 512000
      }
    ]
  }
};

// ============================================================================
// UTILITY FUNCTIONS FOR TESTS
// ============================================================================

export class TestUtils {
  /**
   * Generate a random CV with specified characteristics
    */
  static generateRandomCV(options: {
    complexity?: 'minimal' | 'standard' | 'complex';
    industry?: string;
    experienceYears?: number;
  } = {}): ParsedCV {
    const { complexity = 'standard', industry = 'technology', experienceYears = 5 } = options;
    
    const baseCV = { ...mockStandardCV };
    
    if (complexity === 'minimal') {
      return {
        personalInfo: baseCV.personalInfo,
        summary: baseCV.summary,
        skills: baseCV.skills?.slice(0, 3)
      };
    }
    
    if (complexity === 'complex') {
      return {
        ...baseCV,
        experience: Array(experienceYears).fill(null).map((_, i) => ({
          ...baseCV.experience![0],
          company: `Company ${i + 1}`,
          startDate: `${2020 - i}-01-01`,
          endDate: `${2021 - i}-01-01`
        })),
        skills: Array(20).fill(null).map((_, i) => ({
          name: `Skill ${i + 1}`,
          level: 'Advanced',
          category: 'Technology'
        })),
        projects: Array(10).fill(null).map((_, i) => ({
          name: `Project ${i + 1}`,
          description: `Project description ${i + 1}`,
          technologies: ['React', 'Node.js']
        }))
      };
    }
    
    return baseCV;
  }

  /**
   * Create mock embeddings for testing
    */
  static generateMockEmbeddings(count: number): RAGEmbedding[] {
    return Array(count).fill(null).map((_, i) => ({
      id: `test-embed-${i}`,
      content: `Test content ${i} for embedding`,
      metadata: {
        section: 'test',
        importance: Math.floor(Math.random() * 10) + 1,
        keywords: [`keyword${i}`, `test${i}`],
        contentType: 'text'
      },
      vector: Array(1536).fill(0).map(() => Math.random()),
      tokens: 10,
      createdAt: new Date()
    }));
  }

  /**
   * Wait for a specified duration (for async testing)
    */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique test IDs
    */
  static generateTestId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Deep clone an object for test isolation
    */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

// ============================================================================
// MOCK IMPLEMENTATIONS FOR EXTERNAL SERVICES
// ============================================================================

export const mockFirebaseAdmin = {
  storage: () => ({
    bucket: () => ({
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(undefined),
        makePublic: jest.fn().mockResolvedValue(undefined),
        getSignedUrl: jest.fn().mockResolvedValue(['https://mock-url.com'])
      }),
      name: 'test-bucket'
    })
  }),
  firestore: () => ({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => mockStandardCV
        }),
        update: jest.fn().mockResolvedValue(undefined)
      })
    })
  })
};

export const mockEmbeddingService = {
  generateEmbeddings: jest.fn().mockImplementation((texts: string[]) => {
    return Promise.resolve(
      texts.map(() => Array(1536).fill(0).map(() => Math.random()))
    );
  })
};

export const mockHuggingFaceAPI = {
  createSpace: jest.fn().mockResolvedValue({
    id: 'test-space',
    url: 'https://test-space.hf.space'
  }),
  uploadFiles: jest.fn().mockResolvedValue({ success: true }),
  getSpaceStatus: jest.fn().mockResolvedValue({ status: 'running' })
};

export const mockAnthropicAPI = {
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Mock response from Claude' }],
      model: 'claude-sonnet-4-20250514',
      role: 'assistant',
      usage: { input_tokens: 10, output_tokens: 20 }
    })
  }
};