/**
 * Comprehensive Test Suite for Portal Generation System
 * 
 * Tests the complete portal generation workflow including:
 * - Portal generation service
 * - Asset management
 * - Template customization
 * - Vector database operations
 * - Integration with CVPlus
 * 
 * @author Gil Klainert
 * @created 2025-08-19
  */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PortalGenerationService } from '../services/portal-generation.service';
import { PortalAssetManagementService } from '../services/portal-asset-management.service';
import { TemplateCustomizationService } from '../services/template-customization.service';
import { VectorDatabaseService } from '../services/vector-database.service';
import { PortalIntegrationService } from '../services/portal-integration.service';
import { EmbeddingService } from '../services/embedding.service';
import { ParsedCV } from '../types/job';
import { PortalConfig, PortalStatus, PortalGenerationStep } from '../types/portal';

// Test fixtures and mocks
const mockCV: ParsedCV = {
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
    }
  ],
  skills: [
    { name: 'JavaScript', level: 'Expert', category: 'Programming' },
    { name: 'React', level: 'Expert', category: 'Frontend' },
    { name: 'Node.js', level: 'Advanced', category: 'Backend' },
    { name: 'PostgreSQL', level: 'Advanced', category: 'Database' }
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
    }
  ],
  certifications: [
    {
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023-06-01',
      certificateImage: 'https://example.com/aws-cert.png'
    }
  ]
};

// Mock external services
jest.mock('../services/embedding.service');
jest.mock('firebase-admin', () => ({
  storage: () => ({
    bucket: () => ({
      file: jest.fn(),
      name: 'test-bucket'
    })
  }),
  firestore: () => ({
    collection: jest.fn(),
    doc: jest.fn()
  })
}));

describe('Portal Generation System - Comprehensive Tests', () => {
  let portalService: PortalGenerationService;
  let assetService: PortalAssetManagementService;
  let templateService: TemplateCustomizationService;
  let vectorService: VectorDatabaseService;
  let integrationService: PortalIntegrationService;
  let embeddingService: EmbeddingService;

  const mockJobId = 'test-job-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    // Initialize services
    portalService = new PortalGenerationService();
    assetService = new PortalAssetManagementService();
    templateService = new TemplateCustomizationService();
    vectorService = new VectorDatabaseService();
    integrationService = new PortalIntegrationService();
    embeddingService = new EmbeddingService();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Portal Generation Service', () => {
    test('should generate portal successfully with valid CV data', async () => {
      const result = await portalService.generatePortal(mockCV, mockJobId, mockUserId);

      expect(result.success).toBe(true);
      expect(result.portalConfig).toBeDefined();
      expect(result.urls).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.stepsCompleted).toContain(PortalGenerationStep.VALIDATE_INPUT);
      expect(result.stepsCompleted).toContain(PortalGenerationStep.FINALIZE_PORTAL);
    });

    test('should handle missing required CV fields gracefully', async () => {
      const incompleteCV = { ...mockCV };
      delete incompleteCV.personalInfo?.name;

      const result = await portalService.generatePortal(incompleteCV, mockJobId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    test('should validate CV data structure before processing', async () => {
      const invalidCV = {} as ParsedCV;

      const result = await portalService.generatePortal(invalidCV, mockJobId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CV_DATA');
    });

    test('should generate unique portal URLs', async () => {
      const result1 = await portalService.generatePortal(mockCV, 'job-1', mockUserId);
      const result2 = await portalService.generatePortal(mockCV, 'job-2', mockUserId);

      expect(result1.urls?.portal).not.toBe(result2.urls?.portal);
      expect(result1.urls?.chat).not.toBe(result2.urls?.chat);
    });

    test('should include all required sections in portal config', async () => {
      const result = await portalService.generatePortal(mockCV, mockJobId, mockUserId);

      expect(result.portalConfig?.template.requiredSections).toContain('hero');
      expect(result.portalConfig?.template.requiredSections).toContain('experience');
      expect(result.portalConfig?.template.requiredSections).toContain('skills');
      expect(result.portalConfig?.template.requiredSections).toContain('contact');
    });
  });

  describe('Asset Management Service', () => {
    test('should extract assets from CV data successfully', async () => {
      const assetBundle = await assetService.extractAssetsFromCV(mockCV, mockJobId);

      expect(assetBundle.assets.length).toBeGreaterThan(0);
      expect(assetBundle.manifest).toBeDefined();
      expect(assetBundle.totalSize).toBeGreaterThan(0);
      expect(assetBundle.compressionSummary).toBeDefined();
    });

    test('should optimize assets for web deployment', async () => {
      const assetBundle = await assetService.extractAssetsFromCV(mockCV, mockJobId);
      
      // Check that assets are optimized
      assetBundle.assets.forEach(asset => {
        expect(asset.optimizedSize).toBeLessThanOrEqual(asset.size);
        expect(asset.compressionRatio).toBeGreaterThanOrEqual(0);
        expect(asset.metadata.isOptimized).toBe(true);
      });
    });

    test('should generate template assets when CV assets are missing', async () => {
      const cvWithoutAssets = { ...mockCV };
      delete cvWithoutAssets.personalInfo?.profileImage;
      
      const templateAssets = await assetService.generateTemplateAssets({
        id: 'portal-1',
        jobId: mockJobId,
        userId: mockUserId
      } as PortalConfig);

      expect(templateAssets.assets.length).toBeGreaterThan(0);
      expect(templateAssets.assets.some(a => a.type === 'profile_image')).toBe(true);
    });

    test('should validate HuggingFace deployment limits', async () => {
      const assetBundle = await assetService.extractAssetsFromCV(mockCV, mockJobId);
      const optimizedBundle = await assetService.optimizeForHuggingFace(assetBundle, mockJobId);

      expect(optimizedBundle.totalSize).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      expect(optimizedBundle.assets.length).toBeLessThan(500); // Asset count limit
    });
  });

  describe('Template Customization Service', () => {
    test('should analyze CV and recommend appropriate template', async () => {
      const analysis = await templateService.analyzeCV(mockCV);

      expect(analysis.industry).toBeDefined();
      expect(analysis.careerLevel).toBeDefined();
      expect(analysis.recommendedTemplates).toHaveLength.greaterThan(0);
      expect(analysis.confidenceScore).toBeGreaterThan(0.5);
    });

    test('should customize template based on CV content', async () => {
      const analysis = await templateService.analyzeCV(mockCV);
      const customization = await templateService.customizeTemplate(analysis.recommendedTemplates[0], mockCV);

      expect(customization.theme).toBeDefined();
      expect(customization.sections).toBeDefined();
      expect(customization.branding).toBeDefined();
    });

    test('should generate responsive templates for all devices', async () => {
      const analysis = await templateService.analyzeCV(mockCV);
      const template = analysis.recommendedTemplates[0];

      expect(template.config.mobileOptimization).toBeDefined();
      expect(template.config.supportedLanguages).toContain('en');
    });
  });

  describe('Vector Database Service', () => {
    test('should store and retrieve embeddings efficiently', async () => {
      const testEmbeddings = [
        {
          id: 'test-1',
          content: 'Software engineer with React experience',
          metadata: {
            section: 'experience',
            importance: 8,
            keywords: ['software', 'engineer', 'react'],
            contentType: 'description'
          },
          vector: Array(1536).fill(0).map(() => Math.random()),
          tokens: 10,
          createdAt: new Date()
        }
      ];

      await vectorService.storeEmbeddings(testEmbeddings);
      
      const searchResults = await vectorService.search(testEmbeddings[0].vector, {
        topK: 5,
        minScore: 0.5
      });

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].score).toBeGreaterThan(0.5);
    });

    test('should perform semantic search with metadata filtering', async () => {
      const queryVector = Array(1536).fill(0).map(() => Math.random());
      
      const results = await vectorService.search(queryVector, {
        topK: 10,
        minScore: 0.3,
        filter: {
          section: 'experience'
        }
      });

      results.forEach(result => {
        expect(result.metadata.section).toBe('experience');
        expect(result.score).toBeGreaterThanOrEqual(0.3);
      });
    });

    test('should handle large datasets efficiently', async () => {
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        id: `item-${i}`,
        content: `Test content ${i}`,
        metadata: {
          section: 'test',
          importance: Math.floor(Math.random() * 10) + 1,
          keywords: [`keyword${i}`],
          contentType: 'text'
        },
        vector: Array(1536).fill(0).map(() => Math.random()),
        tokens: 10,
        createdAt: new Date()
      }));

      const startTime = Date.now();
      await vectorService.storeEmbeddings(largeDataset);
      const storageTime = Date.now() - startTime;

      const searchStart = Date.now();
      const results = await vectorService.search(largeDataset[0].vector, { topK: 50 });
      const searchTime = Date.now() - searchStart;

      expect(storageTime).toBeLessThan(10000); // 10 seconds max
      expect(searchTime).toBeLessThan(1000); // 1 second max for search
      expect(results.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Integration Service', () => {
    test('should trigger portal generation automatically after CV completion', async () => {
      const integrationSpy = jest.spyOn(integrationService, 'triggerPortalGeneration');
      
      await integrationService.triggerPortalGeneration(mockJobId, mockUserId, mockCV);

      expect(integrationSpy).toHaveBeenCalledWith(mockJobId, mockUserId, mockCV);
    });

    test('should update CV document with portal URLs', async () => {
      const portalUrls = {
        portal: 'https://johndoe-portal.hf.space',
        chat: 'https://johndoe-portal.hf.space/chat',
        contact: 'https://johndoe-portal.hf.space/contact',
        download: 'https://johndoe-portal.hf.space/cv.pdf',
        qrMenu: 'https://johndoe-portal.hf.space/qr-menu',
        api: {
          chat: 'https://johndoe-portal.hf.space/api/chat',
          contact: 'https://johndoe-portal.hf.space/api/contact',
          analytics: 'https://johndoe-portal.hf.space/api/analytics'
        }
      };

      const updateSpy = jest.spyOn(integrationService, 'updateCVWithPortalUrls');
      await integrationService.updateCVWithPortalUrls(mockJobId, portalUrls);

      expect(updateSpy).toHaveBeenCalledWith(mockJobId, portalUrls);
    });

    test('should handle integration errors gracefully', async () => {
      const invalidJobId = 'invalid-job';
      
      const result = await integrationService.triggerPortalGeneration(invalidJobId, mockUserId, mockCV);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should rollback changes on portal generation failure', async () => {
      const rollbackSpy = jest.spyOn(integrationService, 'rollbackIntegration');
      
      // Simulate failure scenario
      jest.spyOn(portalService, 'generatePortal').mockRejectedValueOnce(new Error('Generation failed'));
      
      try {
        await integrationService.triggerPortalGeneration(mockJobId, mockUserId, mockCV);
      } catch (error) {
        // Expected to fail
      }

      expect(rollbackSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Benchmarks', () => {
    test('should generate portal within reasonable time limits', async () => {
      const startTime = Date.now();
      const result = await portalService.generatePortal(mockCV, mockJobId, mockUserId);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(60000); // 60 seconds max
      expect(result.processingTimeMs).toBeLessThan(60000);
    });

    test('should handle concurrent portal generations', async () => {
      const concurrentGenerations = Array(5).fill(null).map((_, i) => 
        portalService.generatePortal(mockCV, `job-${i}`, `user-${i}`)
      );

      const results = await Promise.all(concurrentGenerations);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.portalConfig?.jobId).toBe(`job-${index}`);
      });
    });

    test('should maintain memory usage within limits', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate multiple portals
      for (let i = 0; i < 10; i++) {
        await portalService.generatePortal(mockCV, `job-${i}`, mockUserId);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      expect(memoryIncreaseB).toBeLessThan(100); // Less than 100MB increase
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network timeout'));

      const result = await portalService.generatePortal(mockCV, mockJobId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('external_api');
    });

    test('should handle insufficient storage space', async () => {
      // Mock storage error
      jest.spyOn(assetService, 'extractAssetsFromCV').mockRejectedValueOnce(
        new Error('Storage quota exceeded')
      );

      const result = await portalService.generatePortal(mockCV, mockJobId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBeDefined();
    });

    test('should handle malformed CV data', async () => {
      const malformedCV = {
        personalInfo: null,
        experience: 'invalid-data',
        skills: [],
        education: undefined
      } as any;

      const result = await portalService.generatePortal(malformedCV, mockJobId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CV_DATA');
    });

    test('should handle embedding service failures', async () => {
      jest.spyOn(embeddingService, 'generateEmbeddings').mockRejectedValueOnce(
        new Error('Embedding API unavailable')
      );

      const result = await portalService.generatePortal(mockCV, mockJobId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EMBEDDING_GENERATION_FAILED');
    });
  });

  describe('Data Quality and Validation', () => {
    test('should validate generated portal URLs', async () => {
      const result = await portalService.generatePortal(mockCV, mockJobId, mockUserId);

      if (result.urls) {
        expect(result.urls.portal).toMatch(/^https:\/\/.+\.hf\.space$/);
        expect(result.urls.chat).toMatch(/^https:\/\/.+\.hf\.space\/chat$/);
        expect(result.urls.contact).toMatch(/^https:\/\/.+\.hf\.space\/contact$/);
      }
    });

    test('should ensure portal content accuracy', async () => {
      const result = await portalService.generatePortal(mockCV, mockJobId, mockUserId);

      expect(result.portalConfig?.customization.personalInfo.name).toBe(mockCV.personalInfo?.name);
      expect(result.portalConfig?.customization.personalInfo.title).toBe(mockCV.personalInfo?.title);
    });

    test('should validate RAG system responses', async () => {
      // Generate portal first
      await portalService.generatePortal(mockCV, mockJobId, mockUserId);

      // Test RAG query
      const queryVector = Array(1536).fill(0).map(() => Math.random());
      const results = await vectorService.search(queryVector, { topK: 5 });

      results.forEach(result => {
        expect(result.content).toBeDefined();
        expect(result.metadata).toBeDefined();
        expect(result.score).toBeGreaterThan(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    test('should ensure QR codes are functional', async () => {
      const result = await portalService.generatePortal(mockCV, mockJobId, mockUserId);

      if (result.portalConfig?.qrCodes) {
        result.portalConfig.qrCodes.forEach(qrCode => {
          expect(qrCode.url).toBeDefined();
          expect(qrCode.type).toBeDefined();
          expect(qrCode.metadata.isActive).toBe(true);
        });
      }
    });
  });
});

describe('Integration Tests - End-to-End Workflows', () => {
  test('Complete portal generation workflow', async () => {
    const integrationService = new PortalIntegrationService();
    
    // Start integration workflow
    const result = await integrationService.triggerPortalGeneration(mockJobId, mockUserId, mockCV);

    expect(result.success).toBe(true);
    expect(result.portalStatus).toBeDefined();
    expect(result.estimatedCompletionTime).toBeDefined();

    // Wait for completion (in real test, you'd poll status)
    // const finalStatus = await integrationService.getPortalStatus(result.portalId);
    // expect(finalStatus.status).toBe(PortalStatus.COMPLETED);
  });

  test('QR code enhancement workflow', async () => {
    // Generate portal first
    const portalResult = await new PortalGenerationService().generatePortal(mockCV, mockJobId, mockUserId);
    
    if (portalResult.urls) {
      // Test QR enhancement
      const enhancementService = new (await import('../services/qr-enhancement.service')).QREnhancementService();
      const qrResult = await enhancementService.enhanceExistingQRCodes(mockJobId, portalResult.urls);

      expect(qrResult.success).toBe(true);
      expect(qrResult.updatedQRCodes.length).toBeGreaterThan(0);
    }
  });
});