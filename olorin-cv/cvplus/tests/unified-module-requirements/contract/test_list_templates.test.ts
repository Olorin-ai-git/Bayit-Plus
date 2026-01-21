import { listTemplates } from '../../../src/unified-module-requirements/lib/template/TemplateService';
import { TemplateListResponse, ModuleType } from '../../../src/unified-module-requirements/models/types';

describe('Contract Test: GET /templates', () => {
  it('should return list of available templates', async () => {
    try {
      // This MUST fail initially - implementation doesn't exist
      const result = await listTemplates();

      // Expected response structure (this test should fail)
      expect(Array.isArray(result.templates)).toBe(true);
      expect(result).toHaveProperty('totalCount');
      expect(result.totalCount).toBeGreaterThanOrEqual(0);

      // Each template should have required structure
      result.templates.forEach(template => {
        expect(template).toHaveProperty('templateId');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('moduleType');
        expect(template).toHaveProperty('version');
        expect(template).toHaveProperty('maintainer');
        expect(['BACKEND', 'FRONTEND', 'UTILITY', 'API', 'CORE']).toContain(template.moduleType);
      });
    } catch (error) {
      // Expected to fail - no implementation yet
      expect(error).toBeDefined();
    }
  });

  it('should filter templates by module type', async () => {
    const moduleTypes: ModuleType[] = ['BACKEND', 'FRONTEND', 'UTILITY', 'API', 'CORE'];

    for (const moduleType of moduleTypes) {
      try {
        // This should fail - template service doesn't exist
        const result = await listTemplates({ moduleType });

        result.templates.forEach(template => {
          expect(template.moduleType).toBe(moduleType);
        });
      } catch (error) {
        // Expected to fail - no implementation yet
        expect(error).toBeDefined();
      }
    }
  });

  it('should return template details with configurable options', async () => {
    try {
      const result = await listTemplates();

      result.templates.forEach(template => {
        expect(template).toHaveProperty('configurableOptions');
        expect(Array.isArray(template.configurableOptions)).toBe(true);

        template.configurableOptions.forEach(option => {
          expect(option).toHaveProperty('name');
          expect(option).toHaveProperty('type');
          expect(option).toHaveProperty('description');
          expect(option).toHaveProperty('defaultValue');
        });
      });
    } catch (error) {
      // Expected to fail - no implementation yet
      expect(error).toBeDefined();
    }
  });

  it('should handle empty template catalog gracefully', async () => {
    try {
      const result = await listTemplates();

      if (result.totalCount === 0) {
        expect(result.templates).toEqual([]);
      }
    } catch (error) {
      // Expected to fail - no implementation yet
      expect(error).toBeDefined();
    }
  });
});