/**
 * CVPlus Portal Integration Test Suite
 * 
 * Comprehensive tests for the portal integration system including:
 * - CV-Portal integration service
 * - QR code enhancement service
 * - Contact form feature enhancement
 * - Firebase Functions integration
 * 
 * @author Gil Klainert
 * @created 2025-08-19
 * @version 1.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as admin from 'firebase-admin';
import { CVPortalIntegrationService, CVPortalTrigger } from '../services/portal-integration.service';
import { QRCodeEnhancementService } from '../services/qr-enhancement.service';
import { ContactFormFeature } from '../services/cv-generator/features/ContactFormFeature';
import { PortalStatus, QRCodeType } from '../types/portal';
import { ParsedCV } from '../types/job';

// ============================================================================
// TEST SETUP AND MOCKS
// ============================================================================

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn()
      })),
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn()
        }))
      })),
      add: jest.fn()
    })),
    runTransaction: jest.fn()
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date())
  }
}));

// Mock Firebase Functions
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Test data
const mockCVData: ParsedCV = {
  personalInfo: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    location: 'San Francisco, CA'
  },
  sections: {
    experience: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        duration: '2020-2023',
        description: 'Led development of web applications'
      }
    ],
    education: [
      {
        degree: 'B.S. Computer Science',
        school: 'University of Technology',
        year: '2020'
      }
    ],
    skills: [
      'JavaScript', 'TypeScript', 'React', 'Node.js'
    ]
  },
  metadata: {
    completeness: 0.9,
    sections: ['experience', 'education', 'skills']
  }
};

const mockPortalUrls = {
  portal: 'https://portal.example.com',
  chat: 'https://portal.example.com/chat',
  contact: 'https://portal.example.com/contact',
  download: 'https://portal.example.com/download',
  qrMenu: 'https://portal.example.com/qr-menu',
  api: {
    chat: 'https://portal.example.com/api/chat',
    contact: 'https://portal.example.com/api/contact',
    analytics: 'https://portal.example.com/api/analytics'
  }
};

// ============================================================================
// CV-PORTAL INTEGRATION SERVICE TESTS
// ============================================================================

describe('CVPortalIntegrationService', () => {
  let integrationService: CVPortalIntegrationService;
  let mockDb: any;

  beforeEach(() => {
    integrationService = new CVPortalIntegrationService();
    mockDb = admin.firestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePortalGeneration', () => {
    test('should successfully initialize portal generation', async () => {
      // Mock database responses
      const mockJobDoc = {
        exists: true,
        data: () => ({
          userId: 'user123',
          status: 'completed',
          ...mockCVData
        })
      };

      const mockPortalQuery = {
        empty: true
      };

      mockDb.collection.mockImplementation((collection: string) => {
        if (collection === 'jobs') {
          return {
            doc: () => ({
              get: () => Promise.resolve(mockJobDoc)
            })
          };
        }
        if (collection === 'portal_configs') {
          return {
            where: () => ({
              limit: () => ({
                get: () => Promise.resolve(mockPortalQuery)
              })
            })
          };
        }
        if (collection === 'portal_integration_status') {
          return {
            doc: () => ({
              set: jest.fn().mockResolvedValue(undefined),
              update: jest.fn().mockResolvedValue(undefined)
            })
          };
        }
        return {
          doc: () => ({
            set: jest.fn().mockResolvedValue(undefined)
          })
        };
      });

      const trigger: CVPortalTrigger = {
        jobId: 'job123',
        userId: 'user123',
        cvData: mockCVData,
        triggerType: 'manual',
        preferences: {
          autoGenerate: true,
          updateCVDocument: true,
          generateQRCodes: true,
          urlPlacements: [],
          qrCodeTypes: [QRCodeType.PRIMARY_PORTAL],
          enableAnalytics: true,
          privacyLevel: 'public'
        }
      };

      const result = await integrationService.initializePortalGeneration(trigger);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.stepsCompleted).toContain('validate_input');
    });

    test('should handle invalid CV data', async () => {
      const invalidTrigger: CVPortalTrigger = {
        jobId: '',
        userId: '',
        cvData: { personalInfo: {}, sections: {}, metadata: {} },
        triggerType: 'manual'
      };

      const result = await integrationService.initializePortalGeneration(invalidTrigger);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Validation failed');
    });

    test('should skip generation when user preferences disable it', async () => {
      const mockJobDoc = {
        exists: true,
        data: () => ({
          userId: 'user123',
          status: 'completed',
          ...mockCVData
        })
      };

      mockDb.collection.mockImplementation((collection: string) => {
        if (collection === 'jobs') {
          return {
            doc: () => ({
              get: () => Promise.resolve(mockJobDoc)
            })
          };
        }
        return {
          doc: () => ({
            set: jest.fn().mockResolvedValue(undefined)
          })
        };
      });

      const trigger: CVPortalTrigger = {
        jobId: 'job123',
        userId: 'user123',
        cvData: mockCVData,
        triggerType: 'automatic',
        preferences: {
          autoGenerate: false,
          updateCVDocument: false,
          generateQRCodes: false,
          urlPlacements: [],
          qrCodeTypes: [],
          enableAnalytics: false,
          privacyLevel: 'private'
        }
      };

      const result = await integrationService.initializePortalGeneration(trigger);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not enabled');
    });
  });

  describe('getPortalStatus', () => {
    test('should return portal status when exists', async () => {
      const mockStatusDoc = {
        exists: true,
        data: () => ({
          jobId: 'job123',
          status: PortalStatus.COMPLETED,
          progress: 100,
          currentStep: 'finalize_portal',
          startedAt: new Date(),
          updatedAt: new Date(),
          portalId: 'portal123',
          urls: mockPortalUrls
        })
      };

      mockDb.collection.mockImplementation(() => ({
        doc: () => ({
          get: () => Promise.resolve(mockStatusDoc)
        })
      }));

      const status = await integrationService.getPortalStatus('job123');

      expect(status).toBeDefined();
      expect(status?.jobId).toBe('job123');
      expect(status?.status).toBe(PortalStatus.COMPLETED);
      expect(status?.progress).toBe(100);
      expect(status?.portalId).toBe('portal123');
    });

    test('should return null when status does not exist', async () => {
      const mockStatusDoc = {
        exists: false
      };

      mockDb.collection.mockImplementation(() => ({
        doc: () => ({
          get: () => Promise.resolve(mockStatusDoc)
        })
      }));

      const status = await integrationService.getPortalStatus('job123');

      expect(status).toBeNull();
    });
  });
});

// ============================================================================
// QR CODE ENHANCEMENT SERVICE TESTS
// ============================================================================

describe('QRCodeEnhancementService', () => {
  let qrService: QRCodeEnhancementService;
  let mockDb: any;

  beforeEach(() => {
    qrService = new QRCodeEnhancementService();
    mockDb = admin.firestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enhanceQRCodes', () => {
    test('should successfully enhance QR codes', async () => {
      // Mock existing QR codes
      const mockExistingQRDoc = {
        exists: true,
        data: () => ({
          qrCodes: [
            {
              id: 'qr1',
              label: 'Contact Me',
              metadata: { purpose: 'contact' }
            }
          ]
        })
      };

      mockDb.collection.mockImplementation((collection: string) => {
        if (collection === 'qr_codes') {
          return {
            doc: () => ({
              get: () => Promise.resolve(mockExistingQRDoc)
            })
          };
        }
        if (collection === 'enhanced_qr_codes') {
          return {
            doc: () => ({
              set: jest.fn().mockResolvedValue(undefined)
            })
          };
        }
        return {
          doc: () => ({
            set: jest.fn().mockResolvedValue(undefined)
          })
        };
      });

      const result = await qrService.enhanceQRCodes('job123', mockPortalUrls, {
        updateExisting: true,
        generateNew: true,
        types: [QRCodeType.PRIMARY_PORTAL, QRCodeType.CHAT_DIRECT]
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.qrCodes.length).toBeGreaterThan(0);
      expect(result.generatedCount).toBeGreaterThan(0);
    });

    test('should handle errors gracefully', async () => {
      // Mock database error
      mockDb.collection.mockImplementation(() => ({
        doc: () => ({
          get: () => Promise.reject(new Error('Database error'))
        })
      }));

      const result = await qrService.enhanceQRCodes('job123', mockPortalUrls);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.qrCodes.length).toBe(0);
    });
  });

  describe('trackQRCodeScan', () => {
    test('should track QR code scan successfully', async () => {
      const mockAdd = jest.fn().mockResolvedValue({ id: 'scan123' });
      const mockTransaction = jest.fn().mockImplementation((callback) => {
        return callback({
          get: () => Promise.resolve({
            exists: false
          }),
          set: jest.fn()
        });
      });

      mockDb.collection.mockImplementation((collection: string) => {
        if (collection === 'qr_code_scans') {
          return { add: mockAdd };
        }
        return {
          doc: () => ({})
        };
      });

      mockDb.runTransaction = mockTransaction;

      await qrService.trackQRCodeScan('job123', 'qr123', {
        device: {
          type: 'mobile',
          os: 'iOS',
          browser: 'Safari'
        },
        location: {
          country: 'US',
          city: 'San Francisco'
        }
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job123',
          qrCodeId: 'qr123'
        })
      );
    });
  });

  describe('getQRCodeAnalytics', () => {
    test('should return analytics when available', async () => {
      const mockAnalyticsDoc = {
        exists: true,
        data: () => ({
          totalScans: 150,
          uniqueScans: 120,
          sources: {
            primary: 80,
            chat: 40,
            contact: 30,
            menu: 0
          },
          devices: {
            mobile: 90,
            tablet: 30,
            desktop: 30
          },
          locations: [
            { country: 'US', city: 'San Francisco', scans: 50 },
            { country: 'UK', city: 'London', scans: 30 }
          ]
        })
      };

      mockDb.collection.mockImplementation(() => ({
        doc: () => ({
          get: () => Promise.resolve(mockAnalyticsDoc)
        })
      }));

      const analytics = await qrService.getQRCodeAnalytics('job123');

      expect(analytics).toBeDefined();
      expect(analytics?.totalScans).toBe(150);
      expect(analytics?.uniqueScans).toBe(120);
      expect(analytics?.devices.mobile).toBe(90);
      expect(analytics?.locations).toHaveLength(2);
    });

    test('should return null when no analytics exist', async () => {
      const mockAnalyticsDoc = {
        exists: false
      };

      mockDb.collection.mockImplementation(() => ({
        doc: () => ({
          get: () => Promise.resolve(mockAnalyticsDoc)
        })
      }));

      const analytics = await qrService.getQRCodeAnalytics('job123');

      expect(analytics).toBeNull();
    });
  });
});

// ============================================================================
// CONTACT FORM FEATURE TESTS
// ============================================================================

describe('ContactFormFeature', () => {
  let contactFormFeature: ContactFormFeature;
  let mockDb: any;

  beforeEach(() => {
    contactFormFeature = new ContactFormFeature();
    mockDb = admin.firestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    test('should generate form with portal integration when portal exists', async () => {
      // Mock portal URLs
      const mockPortalDoc = {
        empty: false,
        docs: [{
          data: () => ({
            urls: mockPortalUrls
          })
        }]
      };

      mockDb.collection.mockImplementation(() => ({
        where: () => ({
          limit: () => ({
            get: () => Promise.resolve(mockPortalDoc)
          })
        })
      }));

      const html = await contactFormFeature.generate(mockCVData, 'job123', {
        useReactComponent: false
      });

      expect(html).toContain('portal-integration-section');
      expect(html).toContain('Visit Interactive Portal');
      expect(html).toContain('Chat with AI Assistant');
      expect(html).toContain(mockPortalUrls.portal);
      expect(html).toContain(mockPortalUrls.chat);
    });

    test('should generate form without portal integration when no portal exists', async () => {
      // Mock no portal
      const mockPortalDoc = {
        empty: true
      };

      mockDb.collection.mockImplementation(() => ({
        where: () => ({
          limit: () => ({
            get: () => Promise.resolve(mockPortalDoc)
          })
        })
      }));

      const html = await contactFormFeature.generate(mockCVData, 'job123', {
        useReactComponent: false
      });

      expect(html).not.toContain('portal-integration-section');
      expect(html).toContain('contact-form-container');
      expect(html).toContain('Get in Touch');
    });

    test('should generate React component with portal integration props', async () => {
      // Mock portal URLs
      const mockPortalDoc = {
        empty: false,
        docs: [{
          data: () => ({
            urls: mockPortalUrls
          })
        }]
      };

      mockDb.collection.mockImplementation(() => ({
        where: () => ({
          limit: () => ({
            get: () => Promise.resolve(mockPortalDoc)
          })
        })
      }));

      const html = await contactFormFeature.generate(mockCVData, 'job123', {
        useReactComponent: true
      });

      expect(html).toContain('react-component-placeholder');
      expect(html).toContain('data-component="ContactForm"');
      
      // Extract and parse component props
      const propsMatch = html.match(/data-props='([^']+)'/);
      expect(propsMatch).toBeTruthy();
      
      if (propsMatch) {
        const props = JSON.parse(propsMatch[1]);
        expect(props.portalUrls).toEqual(mockPortalUrls);
        expect(props.enablePortalIntegration).toBe(true);
      }
    });
  });

  describe('getStyles', () => {
    test('should include portal integration styles', () => {
      const styles = contactFormFeature.getStyles();

      expect(styles).toContain('.portal-integration-section');
      expect(styles).toContain('.portal-btn');
      expect(styles).toContain('.portal-features');
      expect(styles).toContain('.feature-item');
      
      // Check responsive styles
      expect(styles).toContain('@media (max-width: 768px)');
      
      // Check dark mode styles
      expect(styles).toContain('@media (prefers-color-scheme: dark)');
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  test('should complete full portal generation workflow', async () => {
    // This would test the complete workflow from CV completion to portal generation
    // In a real implementation, this would involve more complex setup and teardown
    
    const integrationService = new CVPortalIntegrationService();
    const qrService = new QRCodeEnhancementService();
    
    // Mock successful database operations
    const mockDb = admin.firestore();
    mockDb.collection.mockImplementation(() => ({
      doc: () => ({
        get: () => Promise.resolve({
          exists: true,
          data: () => ({ userId: 'user123', status: 'completed' })
        }),
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined)
      }),
      where: () => ({
        limit: () => ({
          get: () => Promise.resolve({ empty: true })
        })
      })
    }));

    const trigger: CVPortalTrigger = {
      jobId: 'job123',
      userId: 'user123',
      cvData: mockCVData,
      triggerType: 'manual',
      preferences: {
        autoGenerate: true,
        updateCVDocument: true,
        generateQRCodes: true,
        urlPlacements: [],
        qrCodeTypes: [QRCodeType.PRIMARY_PORTAL],
        enableAnalytics: true,
        privacyLevel: 'public'
      }
    };

    // Test portal generation
    const portalResult = await integrationService.initializePortalGeneration(trigger);
    expect(portalResult.success).toBe(true);

    // Test QR code enhancement (if portal generation succeeded)
    if (portalResult.success && portalResult.urls) {
      const qrResult = await qrService.enhanceQRCodes('job123', portalResult.urls);
      expect(qrResult.success).toBe(true);
    }
  });

  test('should handle workflow errors gracefully', async () => {
    const integrationService = new CVPortalIntegrationService();
    
    // Mock database error
    const mockDb = admin.firestore();
    mockDb.collection.mockImplementation(() => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Database connection failed'))
      })
    }));

    const trigger: CVPortalTrigger = {
      jobId: 'job123',
      userId: 'user123',
      cvData: mockCVData,
      triggerType: 'manual'
    };

    const result = await integrationService.initializePortalGeneration(trigger);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.category).toBe('system');
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance Tests', () => {
  test('should complete portal generation within time limit', async () => {
    const startTime = Date.now();
    
    const integrationService = new CVPortalIntegrationService();
    
    // Mock fast database operations
    const mockDb = admin.firestore();
    mockDb.collection.mockImplementation(() => ({
      doc: () => ({
        get: () => Promise.resolve({
          exists: true,
          data: () => ({ userId: 'user123', status: 'completed' })
        }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve()
      }),
      where: () => ({
        limit: () => ({
          get: () => Promise.resolve({ empty: true })
        })
      })
    }));

    const trigger: CVPortalTrigger = {
      jobId: 'job123',
      userId: 'user123',
      cvData: mockCVData,
      triggerType: 'manual',
      preferences: {
        autoGenerate: true,
        updateCVDocument: true,
        generateQRCodes: true,
        urlPlacements: [],
        qrCodeTypes: [QRCodeType.PRIMARY_PORTAL],
        enableAnalytics: true,
        privacyLevel: 'public'
      }
    };

    const result = await integrationService.initializePortalGeneration(trigger);
    const endTime = Date.now();
    
    expect(result).toBeDefined();
    expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds for mocked operations
  });

  test('should handle multiple concurrent portal generations', async () => {
    const integrationService = new CVPortalIntegrationService();
    
    // Mock database operations
    const mockDb = admin.firestore();
    mockDb.collection.mockImplementation(() => ({
      doc: () => ({
        get: () => Promise.resolve({
          exists: true,
          data: () => ({ userId: 'user123', status: 'completed' })
        }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve()
      }),
      where: () => ({
        limit: () => ({
          get: () => Promise.resolve({ empty: true })
        })
      })
    }));

    const triggers = Array(5).fill(null).map((_, index) => ({
      jobId: `job${index}`,
      userId: 'user123',
      cvData: mockCVData,
      triggerType: 'manual' as const,
      preferences: {
        autoGenerate: true,
        updateCVDocument: true,
        generateQRCodes: true,
        urlPlacements: [],
        qrCodeTypes: [QRCodeType.PRIMARY_PORTAL],
        enableAnalytics: true,
        privacyLevel: 'public' as const
      }
    }));

    const results = await Promise.all(
      triggers.map(trigger => integrationService.initializePortalGeneration(trigger))
    );

    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });
  });
});

export { };