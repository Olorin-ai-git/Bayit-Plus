/**
 * Validation Tests for Portal Generation System
 * 
 * Tests data validation, business rules, and quality assurance
 * for the portal generation workflow.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { PortalGenerationService } from '../services/portal-generation.service';
import { VectorDatabaseService } from '../services/vector-database.service';
import { PortalAssetManagementService } from '../services/portal-asset-management.service';
import { QREnhancementService } from '../services/qr-enhancement.service';
import { ParsedCV } from '../types/job';
import { PortalConfig, PortalStatus, PortalErrorCode } from '../types/portal';
import { mockStandardCV, mockMinimalCV, mockExecutiveCV, TestUtils } from './test-fixtures';

describe('Portal Generation Validation Tests', () => {
  let portalService: PortalGenerationService;
  let vectorService: VectorDatabaseService;
  let assetService: PortalAssetManagementService;
  let qrService: QREnhancementService;

  beforeEach(() => {
    portalService = new PortalGenerationService();
    vectorService = new VectorDatabaseService();
    assetService = new PortalAssetManagementService();
    qrService = new QREnhancementService();
  });

  describe('CV Data Validation', () => {
    test('should validate required personal information fields', async () => {
      const invalidCV = { ...mockStandardCV };
      delete invalidCV.personalInfo?.name;
      delete invalidCV.personalInfo?.email;

      const result = await portalService.generatePortal(invalidCV, 'test-job', 'test-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(PortalErrorCode.MISSING_REQUIRED_FIELDS);
      expect(result.error?.message).toContain('name');
      expect(result.error?.message).toContain('email');
    });

    test('should validate email format', async () => {
      const invalidCV = { ...mockStandardCV };
      invalidCV.personalInfo!.email = 'invalid-email-format';

      const result = await portalService.generatePortal(invalidCV, 'test-job', 'test-user');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(PortalErrorCode.INVALID_CV_DATA);
      expect(result.error?.message).toContain('email');
    });

    test('should validate phone number format', async () => {
      const validPhoneFormats = [
        '+1 (555) 123-4567',
        '+44 20 7946 0958',
        '+81 3-1234-5678',
        '555-123-4567',
        '(555) 123-4567'
      ];

      for (const phone of validPhoneFormats) {
        const cv = { ...mockStandardCV };
        cv.personalInfo!.phone = phone;

        const result = await portalService.generatePortal(cv, `test-${Date.now()}`, 'test-user');
        expect(result.success).toBe(true);
      }

      const invalidPhoneFormats = [
        'abc-def-ghij',
        '123',
        '+1 555 INVALID',
        ''
      ];

      for (const phone of invalidPhoneFormats) {
        const cv = { ...mockStandardCV };
        cv.personalInfo!.phone = phone;

        const result = await portalService.generatePortal(cv, `test-${Date.now()}`, 'test-user');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(PortalErrorCode.INVALID_CV_DATA);
      }
    });

    test('should validate URL formats', async () => {
      const validUrls = [
        'https://example.com',
        'http://github.com/user',
        'https://linkedin.com/in/user',
        'https://subdomain.domain.co.uk/path'
      ];

      for (const url of validUrls) {
        const cv = { ...mockStandardCV };
        cv.personalInfo!.website = url;

        const result = await portalService.generatePortal(cv, `test-${Date.now()}`, 'test-user');
        expect(result.success).toBe(true);
      }

      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
      ];

      for (const url of invalidUrls) {
        const cv = { ...mockStandardCV };
        cv.personalInfo!.website = url;

        const result = await portalService.generatePortal(cv, `test-${Date.now()}`, 'test-user');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(PortalErrorCode.INVALID_CV_DATA);
      }
    });

    test('should validate date formats and ranges', async () => {
      const cv = { ...mockStandardCV };
      
      // Test valid date formats
      const validDates = [
        '2023-01-01',
        '2023-12-31',
        '2020-06-15'
      ];

      cv.experience![0].startDate = validDates[0];
      cv.experience![0].endDate = validDates[1];

      const validResult = await portalService.generatePortal(cv, 'test-valid-dates', 'test-user');
      expect(validResult.success).toBe(true);

      // Test invalid date formats
      const invalidDates = [
        'invalid-date',
        '2023-13-01', // Invalid month
        '2023-01-32', // Invalid day
        '99-01-01'    // Invalid year
      ];

      for (const invalidDate of invalidDates) {
        const cvWithInvalidDate = { ...cv };
        cvWithInvalidDate.experience![0].startDate = invalidDate;

        const result = await portalService.generatePortal(cvWithInvalidDate, `test-${Date.now()}`, 'test-user');
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(PortalErrorCode.INVALID_CV_DATA);
      }

      // Test logical date validation (start date should be before end date)
      const cvWithLogicalError = { ...cv };
      cvWithLogicalError.experience![0].startDate = '2023-12-31';
      cvWithLogicalError.experience![0].endDate = '2023-01-01';

      const logicalResult = await portalService.generatePortal(cvWithLogicalError, 'test-logical-dates', 'test-user');
      expect(logicalResult.success).toBe(false);
      expect(logicalResult.error?.code).toBe(PortalErrorCode.INVALID_CV_DATA);
    });

    test('should validate content length limits', async () => {
      const cv = { ...mockStandardCV };
      
      // Test extremely long summary (should be rejected)
      cv.summary = 'A'.repeat(10000); // 10,000 characters

      const longSummaryResult = await portalService.generatePortal(cv, 'test-long-summary', 'test-user');
      expect(longSummaryResult.success).toBe(false);
      expect(longSummaryResult.error?.code).toBe(PortalErrorCode.INVALID_CV_DATA);

      // Test extremely long job description
      cv.summary = mockStandardCV.summary; // Reset
      cv.experience![0].description = 'B'.repeat(5000); // 5,000 characters

      const longDescResult = await portalService.generatePortal(cv, 'test-long-desc', 'test-user');
      expect(longDescResult.success).toBe(false);
      expect(longDescResult.error?.code).toBe(PortalErrorCode.INVALID_CV_DATA);
    });

    test('should validate skill levels', async () => {
      const cv = { ...mockStandardCV };
      
      const validSkillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
      const invalidSkillLevels = ['Master', 'Guru', 'Legend', 'Invalid'];

      // Test valid skill levels
      cv.skills = validSkillLevels.map((level, i) => ({
        name: `Skill ${i}`,
        level,
        category: 'Technology'
      }));

      const validResult = await portalService.generatePortal(cv, 'test-valid-skills', 'test-user');
      expect(validResult.success).toBe(true);

      // Test invalid skill levels
      cv.skills = invalidSkillLevels.map((level, i) => ({
        name: `Skill ${i}`,
        level,
        category: 'Technology'
      }));

      const invalidResult = await portalService.generatePortal(cv, 'test-invalid-skills', 'test-user');
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error?.code).toBe(PortalErrorCode.INVALID_CV_DATA);
    });
  });

  describe('Portal Configuration Validation', () => {
    test('should validate portal template selection', async () => {
      const result = await portalService.generatePortal(mockStandardCV, 'test-template', 'test-user');

      expect(result.success).toBe(true);
      expect(result.portalConfig?.template).toBeDefined();
      expect(result.portalConfig?.template.id).toBeDefined();
      expect(result.portalConfig?.template.name).toBeDefined();
      expect(result.portalConfig?.template.category).toBeDefined();
    });

    test('should validate portal URL generation', async () => {
      const result = await portalService.generatePortal(mockStandardCV, 'test-urls', 'test-user');

      expect(result.success).toBe(true);
      expect(result.urls).toBeDefined();
      
      if (result.urls) {
        // Validate portal URL format
        expect(result.urls.portal).toMatch(/^https:\/\/.+\.hf\.space$/);
        
        // Validate chat URL
        expect(result.urls.chat).toMatch(/^https:\/\/.+\.hf\.space\/chat$/);
        
        // Validate contact URL
        expect(result.urls.contact).toMatch(/^https:\/\/.+\.hf\.space\/contact$/);
        
        // Validate download URL
        expect(result.urls.download).toMatch(/^https:\/\/.+\.hf\.space\/.+\.pdf$/);
        
        // Validate API URLs
        expect(result.urls.api.chat).toMatch(/^https:\/\/.+\.hf\.space\/api\/chat$/);
        expect(result.urls.api.contact).toMatch(/^https:\/\/.+\.hf\.space\/api\/contact$/);
        expect(result.urls.api.analytics).toMatch(/^https:\/\/.+\.hf\.space\/api\/analytics$/);
      }
    });

    test('should validate portal feature configuration', async () => {
      const result = await portalService.generatePortal(mockStandardCV, 'test-features', 'test-user');

      expect(result.success).toBe(true);
      expect(result.portalConfig?.customization.features).toBeDefined();
      
      const features = result.portalConfig?.customization.features;
      if (features) {
        // Validate boolean feature flags
        expect(typeof features.enableChat).toBe('boolean');
        expect(typeof features.enableContactForm).toBe('boolean');
        expect(typeof features.enablePortfolio).toBe('boolean');
        expect(typeof features.enableAnalytics).toBe('boolean');
        expect(typeof features.enableDarkMode).toBe('boolean');
      }
    });

    test('should validate RAG configuration', async () => {
      const result = await portalService.generatePortal(mockStandardCV, 'test-rag', 'test-user');

      expect(result.success).toBe(true);
      expect(result.portalConfig?.ragConfig).toBeDefined();
      
      const ragConfig = result.portalConfig?.ragConfig;
      if (ragConfig) {
        expect(ragConfig.enabled).toBe(true);
        expect(ragConfig.vectorDatabase.provider).toBeDefined();
        expect(ragConfig.embeddings.provider).toBeDefined();
        expect(ragConfig.embeddings.model).toBeDefined();
        expect(ragConfig.embeddings.dimensions).toBe(1536);
        expect(ragConfig.chatService.provider).toBeDefined();
        expect(ragConfig.chatService.model).toBeDefined();
      }
    });
  });

  describe('Vector Database Validation', () => {
    test('should validate embedding dimensions', async () => {
      const validEmbedding = {
        id: 'test-embed',
        content: 'Test content',
        metadata: {
          section: 'test',
          importance: 5,
          keywords: ['test'],
          contentType: 'text'
        },
        vector: Array(1536).fill(0).map(() => Math.random()),
        tokens: 5,
        createdAt: new Date()
      };

      await expect(vectorService.storeEmbeddings([validEmbedding])).resolves.not.toThrow();

      // Test invalid dimensions
      const invalidEmbedding = {
        ...validEmbedding,
        vector: Array(512).fill(0).map(() => Math.random()) // Wrong dimension
      };

      await expect(vectorService.storeEmbeddings([invalidEmbedding])).rejects.toThrow();
    });

    test('should validate embedding metadata', async () => {
      const validMetadata = {
        section: 'experience',
        importance: 8,
        keywords: ['software', 'engineer'],
        contentType: 'description'
      };

      const embedding = {
        id: 'test-metadata',
        content: 'Test content',
        metadata: validMetadata,
        vector: Array(1536).fill(0).map(() => Math.random()),
        tokens: 5,
        createdAt: new Date()
      };

      await expect(vectorService.storeEmbeddings([embedding])).resolves.not.toThrow();

      // Test invalid importance score
      const invalidImportance = {
        ...embedding,
        metadata: { ...validMetadata, importance: 15 } // Should be 1-10
      };

      await expect(vectorService.storeEmbeddings([invalidImportance])).rejects.toThrow();

      // Test invalid section
      const invalidSection = {
        ...embedding,
        metadata: { ...validMetadata, section: 'invalid_section' }
      };

      await expect(vectorService.storeEmbeddings([invalidSection])).rejects.toThrow();
    });

    test('should validate search parameters', async () => {
      const queryVector = Array(1536).fill(0).map(() => Math.random());

      // Valid search parameters
      const validSearchOptions = {
        topK: 10,
        minScore: 0.5,
        filter: {
          section: 'experience'
        }
      };

      await expect(vectorService.search(queryVector, validSearchOptions)).resolves.toBeDefined();

      // Invalid topK (too high)
      const invalidTopK = { ...validSearchOptions, topK: 10000 };
      await expect(vectorService.search(queryVector, invalidTopK)).rejects.toThrow();

      // Invalid minScore (out of range)
      const invalidMinScore = { ...validSearchOptions, minScore: 1.5 };
      await expect(vectorService.search(queryVector, invalidMinScore)).rejects.toThrow();

      // Invalid vector dimensions
      const invalidVector = Array(512).fill(0).map(() => Math.random());
      await expect(vectorService.search(invalidVector, validSearchOptions)).rejects.toThrow();
    });
  });

  describe('Asset Validation', () => {
    test('should validate asset URLs', async () => {
      const cv = { ...mockStandardCV };
      
      // Valid image URLs
      const validImageUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.png',
        'https://example.com/image.gif',
        'https://example.com/image.webp'
      ];

      cv.personalInfo!.profileImage = validImageUrls[0];
      
      const validResult = await assetService.extractAssetsFromCV(cv, 'test-valid-assets');
      expect(validResult.assets.length).toBeGreaterThan(0);

      // Invalid URLs
      const invalidUrls = [
        'not-a-url',
        'javascript:alert("xss")',
        'data:text/html,<script>',
        'file:///local/file.jpg'
      ];

      for (const invalidUrl of invalidUrls) {
        const cvWithInvalidUrl = { ...cv };
        cvWithInvalidUrl.personalInfo!.profileImage = invalidUrl;

        await expect(assetService.extractAssetsFromCV(cvWithInvalidUrl, 'test-invalid-url')).rejects.toThrow();
      }
    });

    test('should validate asset size limits', async () => {
      // Mock large asset (this would be handled by the asset service)
      const cv = { ...mockStandardCV };
      cv.personalInfo!.profileImage = 'https://example.com/very-large-image.jpg';

      const assetBundle = await assetService.extractAssetsFromCV(cv, 'test-size-limits');
      
      // Validate that assets are within reasonable size limits
      assetBundle.assets.forEach(asset => {
        expect(asset.optimizedSize).toBeLessThan(10 * 1024 * 1024); // 10MB max per asset
      });

      // Validate total bundle size
      expect(assetBundle.totalSize).toBeLessThan(50 * 1024 * 1024); // 50MB total max
    });

    test('should validate asset optimization quality', async () => {
      const cv = { ...mockStandardCV };
      cv.personalInfo!.profileImage = 'https://example.com/profile.jpg';

      const assetBundle = await assetService.extractAssetsFromCV(cv, 'test-optimization');
      
      assetBundle.assets.forEach(asset => {
        // Validate compression ratio is reasonable
        expect(asset.compressionRatio).toBeGreaterThanOrEqual(0);
        expect(asset.compressionRatio).toBeLessThan(0.9); // Not more than 90% compression
        
        // Validate quality settings
        expect(asset.metadata.quality).toBeGreaterThanOrEqual(60);
        expect(asset.metadata.quality).toBeLessThanOrEqual(100);
        
        // Validate optimization flag
        expect(asset.metadata.isOptimized).toBe(true);
      });
    });
  });

  describe('QR Code Validation', () => {
    test('should validate QR code URLs', async () => {
      const mockUrls = {
        portal: 'https://test-portal.hf.space',
        chat: 'https://test-portal.hf.space/chat',
        contact: 'https://test-portal.hf.space/contact',
        download: 'https://test-portal.hf.space/cv.pdf',
        qrMenu: 'https://test-portal.hf.space/qr-menu',
        api: {
          chat: 'https://test-portal.hf.space/api/chat',
          contact: 'https://test-portal.hf.space/api/contact',
          analytics: 'https://test-portal.hf.space/api/analytics'
        }
      };

      const result = await qrService.enhanceExistingQRCodes('test-job', mockUrls);
      
      expect(result.success).toBe(true);
      expect(result.updatedQRCodes.length).toBeGreaterThan(0);
      
      result.updatedQRCodes.forEach(qrCode => {
        // Validate QR code URL format
        expect(qrCode.url).toMatch(/^https:\/\/.+/);
        
        // Validate QR code metadata
        expect(qrCode.metadata.isActive).toBe(true);
        expect(qrCode.metadata.trackingEnabled).toBe(true);
        expect(qrCode.type).toBeDefined();
      });
    });

    test('should validate QR code generation parameters', async () => {
      const mockUrls = {
        portal: 'https://test-portal.hf.space',
        chat: 'https://test-portal.hf.space/chat',
        contact: 'https://test-portal.hf.space/contact',
        download: 'https://test-portal.hf.space/cv.pdf',
        qrMenu: 'https://test-portal.hf.space/qr-menu',
        api: {
          chat: 'https://test-portal.hf.space/api/chat',
          contact: 'https://test-portal.hf.space/api/contact',
          analytics: 'https://test-portal.hf.space/api/analytics'
        }
      };

      const result = await qrService.generatePortalQRCodes('test-job', mockUrls);
      
      result.forEach(qrCode => {
        // Validate QR code properties
        expect(qrCode.errorCorrectionLevel).toMatch(/^[LMQH]$/);
        expect(qrCode.size).toBeGreaterThan(0);
        expect(qrCode.size).toBeLessThanOrEqual(2048); // Reasonable size limit
        
        // Validate colors are valid hex codes
        expect(qrCode.foregroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(qrCode.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('Security Validation', () => {
    test('should sanitize user input', async () => {
      const cv = { ...mockStandardCV };
      
      // Test XSS prevention
      cv.personalInfo!.name = '<script>alert("xss")</script>';
      cv.summary = '<img src="x" onerror="alert(1)">';
      
      const result = await portalService.generatePortal(cv, 'test-xss', 'test-user');
      
      if (result.success) {
        // Ensure dangerous content is sanitized
        expect(result.portalConfig?.customization.personalInfo.name).not.toContain('<script>');
        expect(result.portalConfig?.customization.content.summary).not.toContain('onerror');
      }
    });

    test('should validate privacy settings', async () => {
      const result = await portalService.generatePortal(mockStandardCV, 'test-privacy', 'test-user');
      
      expect(result.success).toBe(true);
      expect(result.portalConfig?.privacy).toBeDefined();
      
      const privacy = result.portalConfig?.privacy;
      if (privacy) {
        expect(['public', 'unlisted', 'password_protected', 'private']).toContain(privacy.level);
        expect(typeof privacy.analyticsConsent).toBe('boolean');
        expect(Array.isArray(privacy.masking.maskCompanies)).toBe(true);
        expect(Array.isArray(privacy.masking.customRules)).toBe(true);
      }
    });

    test('should validate content filtering', async () => {
      const cv = { ...mockStandardCV };
      
      // Test inappropriate content detection
      cv.summary = 'This contains inappropriate content that should be filtered out';
      cv.experience![0].description = 'Contains profanity and inappropriate material';
      
      const result = await portalService.generatePortal(cv, 'test-filtering', 'test-user');
      
      // The service should either filter content or reject it
      if (result.success) {
        // Content should be cleaned
        expect(result.portalConfig?.customization.content.summary).toBeDefined();
      } else {
        // Or rejected with appropriate error
        expect(result.error?.code).toBe(PortalErrorCode.INVALID_CV_DATA);
      }
    });
  });

  describe('Business Rules Validation', () => {
    test('should enforce minimum content requirements', async () => {
      const minimalCV = { ...mockMinimalCV };
      
      const result = await portalService.generatePortal(minimalCV, 'test-minimal', 'test-user');
      
      if (result.success) {
        // Should generate default content for missing sections
        expect(result.portalConfig?.template.requiredSections).toContain('hero');
        expect(result.portalConfig?.template.requiredSections).toContain('contact');
      } else {
        // Or require minimum content
        expect(result.error?.code).toBe(PortalErrorCode.MISSING_REQUIRED_FIELDS);
      }
    });

    test('should validate professional standards', async () => {
      const result = await portalService.generatePortal(mockExecutiveCV, 'test-executive', 'test-user');
      
      expect(result.success).toBe(true);
      
      // Executive template should have appropriate sections
      expect(result.portalConfig?.template.category).toBe('executive_leadership');
      expect(result.portalConfig?.template.requiredSections).toContain('experience');
      expect(result.portalConfig?.template.requiredSections).toContain('achievements');
    });

    test('should validate template-content compatibility', async () => {
      const creativeCV = TestUtils.generateRandomCV({
        complexity: 'complex',
        industry: 'design'
      });
      
      const result = await portalService.generatePortal(creativeCV, 'test-creative', 'test-user');
      
      expect(result.success).toBe(true);
      
      // Should select appropriate template for creative industry
      expect(['creative_portfolio', 'freelancer']).toContain(result.portalConfig?.template.category);
    });

    test('should validate accessibility requirements', async () => {
      const result = await portalService.generatePortal(mockStandardCV, 'test-accessibility', 'test-user');
      
      expect(result.success).toBe(true);
      
      // Should enable accessibility features
      expect(result.portalConfig?.customization.features.enableAccessibility).toBe(true);
      
      // Template should support accessibility
      expect(result.portalConfig?.template.config.accessibility).toBeDefined();
    });
  });

  describe('Data Quality Validation', () => {
    test('should validate generated content completeness', async () => {
      const result = await portalService.generatePortal(mockStandardCV, 'test-completeness', 'test-user');
      
      expect(result.success).toBe(true);
      
      if (result.metadata.quality) {
        expect(result.metadata.quality.completenessScore).toBeGreaterThan(0.7);
        expect(result.metadata.quality.overallScore).toBeGreaterThan(0.6);
      }
    });

    test('should validate RAG system accuracy', async () => {
      const result = await portalService.generatePortal(mockStandardCV, 'test-rag-accuracy', 'test-user');
      
      expect(result.success).toBe(true);
      
      if (result.metadata.quality) {
        expect(result.metadata.quality.ragAccuracyScore).toBeGreaterThan(0.7);
      }
    });

    test('should validate performance metrics', async () => {
      const result = await portalService.generatePortal(mockStandardCV, 'test-performance', 'test-user');
      
      expect(result.success).toBe(true);
      
      if (result.metadata.quality) {
        expect(result.metadata.quality.performanceScore).toBeGreaterThan(0.6);
      }
      
      // Validate processing time is reasonable
      expect(result.processingTimeMs).toBeLessThan(60000); // 60 seconds max
    });
  });
});