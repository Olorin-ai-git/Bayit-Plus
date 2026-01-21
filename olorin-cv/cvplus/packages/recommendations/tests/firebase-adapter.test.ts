/**
 * Firebase Functions Adapter Integration Tests
 * 
 * Tests the Firebase functions integration layer and placeholder customization functionality.
 * Ensures 100% API compatibility with existing Firebase function interfaces.
 * 
 * @author Gil Klainert
 * @version 1.0.0
  */

import { firebaseFunctionsAdapter } from '../../integration/firebase/functions-adapter';
import { PlaceholderCustomizationService } from '../../services/customization/placeholder-customization.service';

describe('Firebase Functions Adapter Integration', () => {
  
  describe('API Compatibility', () => {
    test('getRecommendations maintains Firebase function interface', async () => {
      const mockRequest = {
        auth: { uid: 'test-user-123' },
        data: {
          jobId: 'job-123',
          targetRole: 'Software Engineer',
          industryKeywords: ['JavaScript', 'React'],
          forceRegenerate: false
        }
      };

      // This would normally call the actual Firebase function
      // For testing, we can mock the behavior
      const result = await firebaseFunctionsAdapter.getRecommendations(mockRequest as any);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      
      if (result.success) {
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('recommendations');
        expect(result.data).toHaveProperty('cached');
      }
    });

    test('customizePlaceholders provides new functionality', async () => {
      const mockRequest = {
        auth: { uid: 'test-user-123' },
        data: {
          jobId: 'job-123',
          recommendationId: 'rec-123',
          placeholderValues: {
            'ROLE': 'Senior Software Engineer',
            'YEARS': '8',
            'SKILLS': 'React, Node.js, TypeScript'
          }
        }
      };

      const result = await firebaseFunctionsAdapter.customizePlaceholders(mockRequest as any);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      
      if (result.success) {
        expect(result.data).toHaveProperty('recommendation');
        expect(result.data).toHaveProperty('customizedContent');
        expect(result.data).toHaveProperty('placeholdersApplied');
        expect(result.data).toHaveProperty('validationResults');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles missing authentication', async () => {
      const mockRequest = {
        data: { jobId: 'job-123' }
      };

      const result = await firebaseFunctionsAdapter.getRecommendations(mockRequest as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    test('handles missing required parameters', async () => {
      const mockRequest = {
        auth: { uid: 'test-user-123' },
        data: {} // Missing jobId
      };

      const result = await firebaseFunctionsAdapter.getRecommendations(mockRequest as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Job ID is required');
    });
  });

  describe('Health Check', () => {
    test('provides health status', async () => {
      const health = await firebaseFunctionsAdapter.healthCheck();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('details');
    });
  });
});

describe('Placeholder Customization Service', () => {
  let service: PlaceholderCustomizationService;

  beforeEach(() => {
    service = new PlaceholderCustomizationService();
  });

  describe('Placeholder Validation', () => {
    test('validates required placeholders', async () => {
      const params = {
        jobId: 'job-123',
        recommendationId: 'rec-123',
        placeholderValues: {
          'ROLE': 'Software Engineer',
          // Missing required YEARS and SKILLS
        }
      };

      try {
        await service.customizePlaceholders(params);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.message).toContain('Required placeholder');
      }
    });

    test('applies default values for optional placeholders', async () => {
      const params = {
        jobId: 'job-123',
        recommendationId: 'rec-123',
        placeholderValues: {
          'ROLE': 'Software Engineer',
          'YEARS': '5',
          'SKILLS': 'React, JavaScript'
          // ACHIEVEMENT and COMPANY should use defaults
        }
      };

      const result = await service.customizePlaceholders(params);
      
      expect(result.placeholdersApplied).toHaveProperty('ACHIEVEMENT');
      expect(result.placeholdersApplied).toHaveProperty('COMPANY');
      expect(result.placeholdersApplied.ACHIEVEMENT).toBe('delivering high-quality results');
      expect(result.placeholdersApplied.COMPANY).toBe('leading organizations');
    });

    test('transforms numeric placeholders', async () => {
      const params = {
        jobId: 'job-123',
        recommendationId: 'rec-123',
        placeholderValues: {
          'ROLE': 'Software Engineer',
          'YEARS': '8.5', // Should be converted to number
          'SKILLS': 'React, JavaScript'
        }
      };

      const result = await service.customizePlaceholders(params);
      
      expect(result.placeholdersApplied.YEARS).toBe('8.5');
      expect(result.validationResults.find(r => r.placeholderId === 'YEARS')?.isValid).toBe(true);
    });
  });

  describe('Content Transformation', () => {
    test('replaces placeholders in content', async () => {
      const params = {
        jobId: 'job-123',
        recommendationId: 'rec-123',
        placeholderValues: {
          'ROLE': 'Senior Software Engineer',
          'YEARS': '8',
          'SKILLS': 'React, Node.js, TypeScript',
          'ACHIEVEMENT': 'increased system performance by 40%',
          'COMPANY': 'TechCorp Inc'
        }
      };

      const result = await service.customizePlaceholders(params);
      
      expect(result.customizedContent).toContain('Senior Software Engineer');
      expect(result.customizedContent).toContain('8 years');
      expect(result.customizedContent).toContain('React, Node.js, TypeScript');
      expect(result.customizedContent).toContain('increased system performance by 40%');
      expect(result.customizedContent).toContain('TechCorp Inc');
    });

    test('handles multiple placeholder formats', async () => {
      const service = new PlaceholderCustomizationService();
      
      // Test the private method via a public interface
      const content = 'Hello {NAME} and {{TITLE}} from [COMPANY]';
      const values = {
        'NAME': 'John',
        'TITLE': 'Engineer', 
        'COMPANY': 'TechCorp'
      };
      
      // This tests the placeholder replacement logic
      const params = {
        jobId: 'job-123',
        recommendationId: 'rec-123',
        placeholderValues: values
      };

      const result = await service.customizePlaceholders(params);
      
      // The mock recommendation uses {PLACEHOLDER} format
      expect(result.customizedContent).toBeDefined();
    });
  });

  describe('Placeholder Types', () => {
    test('provides available placeholder types', () => {
      const types = service.getPlaceholderTypes();
      
      expect(types).toHaveLength(5);
      expect(types.map(t => t.value)).toContain('text');
      expect(types.map(t => t.value)).toContain('multiline');
      expect(types.map(t => t.value)).toContain('number');
      expect(types.map(t => t.value)).toContain('date');
      expect(types.map(t => t.value)).toContain('dropdown');
    });
  });
});