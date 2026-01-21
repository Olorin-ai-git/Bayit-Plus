/**
 * Unit Tests for MockDataService
 * Comprehensive testing of data generation, caching, and management functionality
  */

import { MockDataService, DataGenerationOptions, DataCacheOptions, DataTemplate } from '../../../src/services/MockDataService';
import { MockDataSetModel, MockDataType } from '../../../src/models';

describe('MockDataService', () => {
  let service: MockDataService;

  beforeEach(() => {
    service = new MockDataService();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default cache options', () => {
      const defaultService = new MockDataService();
      const stats = defaultService.getCacheStats();
      expect(stats.count).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should initialize with custom cache options', () => {
      const customOptions: DataCacheOptions = {
        maxSize: 50 * 1024 * 1024, // 50MB
        maxAge: 12 * 60 * 60 * 1000, // 12 hours
        compression: true,
        encryption: true
      };

      const customService = new MockDataService(customOptions);
      expect(customService).toBeDefined();
    });

    it('should initialize default templates', () => {
      const templates = service.listTemplates();
      expect(templates.length).toBeGreaterThan(0);

      // Should have CV template
      const cvTemplates = service.listTemplates('cv');
      expect(cvTemplates.length).toBeGreaterThan(0);
      expect(cvTemplates[0].name).toBe('CV Data Template');

      // Should have user profile template
      const userTemplates = service.listTemplates('user-profile');
      expect(userTemplates.length).toBeGreaterThan(0);
      expect(userTemplates[0].name).toBe('User Profile Template');
    });
  });

  describe('Data Set Management', () => {
    describe('createDataSet', () => {
      it('should create a new data set with required fields', async () => {
        const testData = { name: 'John Doe', email: 'john@example.com' };
        const dataSet = await service.createDataSet(
          'Test CV',
          'cv',
          testData
        );

        expect(dataSet).toBeDefined();
        expect(dataSet.name).toBe('Test CV');
        expect(dataSet.type).toBe('cv');
        expect(dataSet.data).toEqual(testData);
        expect(dataSet.id).toMatch(/^mock-\d+-[a-f0-9]{16}$/);
        expect(dataSet.description).toBe('Generated cv data');
        expect(dataSet.category).toBe('default');
        expect(dataSet.metadata.generatedBy).toBe('MockDataService');
        expect(dataSet.metadata.usageCount).toBe(0);
        expect(dataSet.metadata.source).toBe('generated');
      });

      it('should create a data set with custom options', async () => {
        const testData = { firstName: 'Jane', lastName: 'Smith' };
        const customId = 'custom-test-id';
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        const dataSet = await service.createDataSet(
          'Custom Test',
          'user-profile',
          testData,
          {
            id: customId,
            description: 'Custom test data set',
            category: 'testing',
            expiresAt,
            metadata: {
              generatedBy: 'test',
              generatedAt: new Date(),
              usageCount: 0,
              source: 'generated',
              tags: ['test', 'custom']
            }
          }
        );

        expect(dataSet.id).toBe(customId);
        expect(dataSet.description).toBe('Custom test data set');
        expect(dataSet.category).toBe('testing');
        expect(dataSet.expiresAt).toEqual(expiresAt);
        expect(dataSet.metadata.tags).toContain('test');
        expect(dataSet.metadata.tags).toContain('custom');
      });

      it('should infer schema from data when not provided', async () => {
        const testData = {
          name: 'Test User',
          age: 30,
          active: true,
          skills: ['JavaScript', 'TypeScript'],
          profile: { bio: 'Software developer' }
        };

        const dataSet = await service.createDataSet('Schema Test', 'cv', testData);

        expect(dataSet.schema).toBeDefined();
        expect(dataSet.schema.properties?.name).toEqual({ type: 'string' });
        expect(dataSet.schema.properties?.age).toEqual({ type: 'number' });
        expect(dataSet.schema.properties?.active).toEqual({ type: 'boolean' });
        expect(dataSet.schema.properties?.skills).toEqual({ type: 'array', items: { type: 'string' } });
        expect(dataSet.schema.properties?.profile).toEqual({ type: 'object' });
        expect(dataSet.schema.required).toContain('name');
        expect(dataSet.schema.required).toContain('age');
      });
    });

    describe('getDataSet', () => {
      it('should retrieve existing data set', async () => {
        const testData = { test: 'data' };
        const created = await service.createDataSet('Test', 'cv', testData);

        const retrieved = await service.getDataSet(created.id);
        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
        expect(retrieved!.data).toEqual(testData);
      });

      it('should return null for non-existent data set', async () => {
        const result = await service.getDataSet('non-existent-id');
        expect(result).toBeNull();
      });

      it('should increment usage count when retrieving data set', async () => {
        const created = await service.createDataSet('Usage Test', 'cv', { data: 'test' });
        expect(created.metadata.usageCount).toBe(0);

        const retrieved1 = await service.getDataSet(created.id);
        expect(retrieved1!.metadata.usageCount).toBe(1);

        const retrieved2 = await service.getDataSet(created.id);
        expect(retrieved2!.metadata.usageCount).toBe(2);
      });

      it('should return cached data set when available', async () => {
        const created = await service.createDataSet('Cache Test', 'cv', { data: 'test' });

        // First call should cache the result
        const first = await service.getDataSet(created.id);
        expect(first).toBeDefined();

        // Second call should return cached version
        const second = await service.getDataSet(created.id);
        expect(second).toBeDefined();
        expect(second!.id).toBe(first!.id);
      });

      it('should delete expired data set and return null', async () => {
        // Create with future expiration first, then manually set expired
        const created = await service.createDataSet('Expired', 'cv', { data: 'test' });

        // Manually set expiration to past (bypassing validation)
        (created as any).expiresAt = new Date(Date.now() - 1000);

        const result = await service.getDataSet(created.id);
        expect(result).toBeNull();
      });
    });

    describe('listDataSets', () => {
      beforeEach(async () => {
        // Create test data sets
        await service.createDataSet('CV 1', 'cv', { name: 'User1' }, { category: 'tech' });
        await service.createDataSet('CV 2', 'cv', { name: 'User2' }, {
          category: 'design',
          metadata: {
            generatedBy: 'test',
            generatedAt: new Date(),
            usageCount: 0,
            source: 'generated',
            tags: ['creative', 'design']
          }
        });
        await service.createDataSet('Profile 1', 'user-profile', { username: 'user1' }, { category: 'tech' });

        // Expired data set - create then manually expire
        const expired = await service.createDataSet('Expired', 'cv', { data: 'old' });
        (expired as any).expiresAt = new Date(Date.now() - 1000);
      });

      it('should list all data sets', async () => {
        const dataSets = await service.listDataSets();
        expect(dataSets.length).toBeGreaterThanOrEqual(4);
      });

      it('should filter by type', async () => {
        const cvDataSets = await service.listDataSets({ type: 'cv' });
        expect(cvDataSets.length).toBeGreaterThanOrEqual(3);
        cvDataSets.forEach(ds => expect(ds.type).toBe('cv'));

        const profileDataSets = await service.listDataSets({ type: 'user-profile' });
        expect(profileDataSets.length).toBeGreaterThanOrEqual(1);
        profileDataSets.forEach(ds => expect(ds.type).toBe('user-profile'));
      });

      it('should filter by category', async () => {
        const techDataSets = await service.listDataSets({ category: 'tech' });
        expect(techDataSets.length).toBeGreaterThanOrEqual(2);
        techDataSets.forEach(ds => expect(ds.category).toBe('tech'));

        const designDataSets = await service.listDataSets({ category: 'design' });
        expect(designDataSets.length).toBeGreaterThanOrEqual(1);
        designDataSets.forEach(ds => expect(ds.category).toBe('design'));
      });

      it('should filter by tags', async () => {
        const taggedDataSets = await service.listDataSets({ tags: ['design'] });
        expect(taggedDataSets.length).toBeGreaterThanOrEqual(1);
        taggedDataSets.forEach(ds => expect(ds.metadata.tags).toContain('design'));
      });

      it('should filter by expiration status', async () => {
        const expiredDataSets = await service.listDataSets({ expired: true });
        expect(expiredDataSets.length).toBeGreaterThanOrEqual(1);

        const activeDataSets = await service.listDataSets({ expired: false });
        expect(activeDataSets.length).toBeGreaterThanOrEqual(3);
      });

      it('should combine multiple filters', async () => {
        const filteredDataSets = await service.listDataSets({
          type: 'cv',
          category: 'tech',
          expired: false
        });

        filteredDataSets.forEach(ds => {
          expect(ds.type).toBe('cv');
          expect(ds.category).toBe('tech');
          expect(ds.isExpired()).toBe(false);
        });
      });

      it('should sort results by updatedAt descending', async () => {
        const dataSets = await service.listDataSets();

        for (let i = 1; i < dataSets.length; i++) {
          expect(dataSets[i-1].updatedAt.getTime()).toBeGreaterThanOrEqual(
            dataSets[i].updatedAt.getTime()
          );
        }
      });
    });

    describe('updateDataSet', () => {
      it('should update data set fields', async () => {
        const created = await service.createDataSet('Original', 'cv', { data: 'original' });

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 50));

        const updated = await service.updateDataSet(created.id, {
          name: 'Updated Name',
          description: 'Updated description',
          category: 'updated-category',
          data: { data: 'updated' }
        });

        expect(updated).toBeDefined();
        expect(updated!.name).toBe('Updated Name');
        expect(updated!.description).toBe('Updated description');
        expect(updated!.category).toBe('updated-category');
        expect(updated!.data).toEqual({ data: 'updated' });
        expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
      });

      it('should update metadata', async () => {
        const created = await service.createDataSet('Test', 'cv', { data: 'test' });

        const updated = await service.updateDataSet(created.id, {
          metadata: {
            generatedBy: 'updated',
            generatedAt: new Date(),
            usageCount: 0,
            source: 'generated',
            tags: ['updated', 'test']
          }
        });

        expect(updated!.metadata.tags).toContain('updated');
        expect(updated!.metadata.tags).toContain('test');
      });

      it('should return null for non-existent data set', async () => {
        const result = await service.updateDataSet('non-existent', { name: 'New Name' });
        expect(result).toBeNull();
      });

      it('should update expiration date', async () => {
        const created = await service.createDataSet('Expiry Test', 'cv', { data: 'test' });
        const newExpiry = new Date(Date.now() + 7200000); // 2 hours

        const updated = await service.updateDataSet(created.id, {
          expiresAt: newExpiry
        });

        expect(updated!.expiresAt).toEqual(newExpiry);
      });
    });

    describe('deleteDataSet', () => {
      it('should delete existing data set', async () => {
        const created = await service.createDataSet('To Delete', 'cv', { data: 'test' });

        const deleted = await service.deleteDataSet(created.id);
        expect(deleted).toBe(true);

        const retrieved = await service.getDataSet(created.id);
        expect(retrieved).toBeNull();
      });

      it('should return false for non-existent data set', async () => {
        const result = await service.deleteDataSet('non-existent');
        expect(result).toBe(false);
      });

      it('should invalidate cache when deleting', async () => {
        const created = await service.createDataSet('Cache Delete', 'cv', { data: 'test' });

        // Cache the data set
        await service.getDataSet(created.id);

        // Delete should invalidate cache
        await service.deleteDataSet(created.id);

        const result = await service.getDataSet(created.id);
        expect(result).toBeNull();
      });
    });
  });

  describe('Data Generation', () => {
    describe('generateData', () => {
      it('should generate CV data using default template', async () => {
        const options: DataGenerationOptions = {
          type: 'cv',
          count: 1
        };

        const dataSet = await service.generateData(options);

        expect(dataSet).toBeDefined();
        expect(dataSet.type).toBe('cv');
        expect(dataSet.data).toBeDefined();
        expect(dataSet.data.firstName).toBeDefined();
        expect(dataSet.data.lastName).toBeDefined();
        expect(dataSet.data.email).toBeDefined();
        expect(dataSet.metadata.tags).toContain('generated');
        expect(dataSet.metadata.tags).toContain('type:cv');
      });

      it('should generate multiple data items', async () => {
        const options: DataGenerationOptions = {
          type: 'user-profile',
          count: 3
        };

        const dataSet = await service.generateData(options);

        expect(dataSet).toBeDefined();
        expect(Array.isArray(dataSet.data)).toBe(true);
        expect(dataSet.data.length).toBe(3);
        expect(dataSet.metadata.tags).toContain('count:3');
      });

      it('should throw error for unknown type', async () => {
        const options: DataGenerationOptions = {
          type: 'unknown-type' as MockDataType
        };

        await expect(service.generateData(options)).rejects.toThrow(
          'No template found for type unknown-type'
        );
      });

      it('should use custom seed and options', async () => {
        const options: DataGenerationOptions = {
          type: 'cv',
          seed: 'test-seed',
          locale: 'en-US',
          customFields: { department: 'Engineering' }
        };

        const dataSet = await service.generateData(options);
        expect(dataSet).toBeDefined();
      });
    });

    describe('generateFromTemplate', () => {
      it('should generate data from specific template', async () => {
        const dataSet = await service.generateFromTemplate('cv-template', {
          type: 'cv',
          count: 1,
          seed: 'template-test'
        });

        expect(dataSet).toBeDefined();
        expect(dataSet.type).toBe('cv');
        expect(dataSet.data.firstName).toBeDefined();
      });

      it('should throw error for non-existent template', async () => {
        await expect(
          service.generateFromTemplate('non-existent-template')
        ).rejects.toThrow('Template non-existent-template not found');
      });
    });
  });

  describe('Template Management', () => {
    describe('registerTemplate', () => {
      it('should register new template', () => {
        const customTemplate: DataTemplate = {
          id: 'custom-test',
          name: 'Custom Test Template',
          type: 'cv',
          category: 'custom',
          schema: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name']
          },
          generator: async () => ({ name: 'Custom Generated' }),
          examples: [{ name: 'Example' }]
        };

        service.registerTemplate(customTemplate);

        const retrieved = service.getTemplate('custom-test');
        expect(retrieved).toEqual(customTemplate);
      });
    });

    describe('getTemplate', () => {
      it('should return existing template', () => {
        const template = service.getTemplate('cv-template');
        expect(template).toBeDefined();
        expect(template!.id).toBe('cv-template');
        expect(template!.name).toBe('CV Data Template');
      });

      it('should return null for non-existent template', () => {
        const template = service.getTemplate('non-existent');
        expect(template).toBeNull();
      });
    });

    describe('listTemplates', () => {
      it('should list all templates', () => {
        const templates = service.listTemplates();
        expect(templates.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter templates by type', () => {
        const cvTemplates = service.listTemplates('cv');
        expect(cvTemplates.length).toBeGreaterThanOrEqual(1);
        cvTemplates.forEach(t => expect(t.type).toBe('cv'));

        const profileTemplates = service.listTemplates('user-profile');
        expect(profileTemplates.length).toBeGreaterThanOrEqual(1);
        profileTemplates.forEach(t => expect(t.type).toBe('user-profile'));
      });
    });
  });

  describe('Data Export/Import', () => {
    let testDataSet: MockDataSetModel;

    beforeEach(async () => {
      testDataSet = await service.createDataSet(
        'Export Test',
        'cv',
        {
          name: 'John Doe',
          email: 'john@example.com',
          skills: ['JavaScript', 'TypeScript']
        }
      );
    });

    describe('exportDataSet', () => {
      it('should export as JSON', async () => {
        const exported = await service.exportDataSet(testDataSet.id, {
          format: 'json',
          includeMetadata: false
        });

        const parsed = JSON.parse(exported);
        expect(parsed.name).toBe('John Doe');
        expect(parsed.email).toBe('john@example.com');
      });

      it('should export with metadata', async () => {
        const exported = await service.exportDataSet(testDataSet.id, {
          format: 'json',
          includeMetadata: true
        });

        const parsed = JSON.parse(exported);
        expect(parsed.id).toBeDefined();
        expect(parsed.metadata).toBeDefined();
        expect(parsed.data).toBeDefined();
      });

      it('should export as CSV for single object', async () => {
        const exported = await service.exportDataSet(testDataSet.id, {
          format: 'csv'
        });

        expect(exported).toContain('name,email,skills');
        expect(exported).toContain('"John Doe","john@example.com"');
      });

      it('should export as CSV for array data', async () => {
        const arrayDataSet = await service.createDataSet(
          'Array Test',
          'cv',
          [
            { name: 'John', email: 'john@example.com' },
            { name: 'Jane', email: 'jane@example.com' }
          ]
        );

        const exported = await service.exportDataSet(arrayDataSet.id, {
          format: 'csv'
        });

        const lines = exported.split('\n');
        expect(lines.length).toBe(3); // Header + 2 data rows
        expect(lines[0]).toBe('name,email');
        expect(lines[1]).toContain('John');
        expect(lines[2]).toContain('Jane');
      });

      it('should export as YAML', async () => {
        const exported = await service.exportDataSet(testDataSet.id, {
          format: 'yaml'
        });

        expect(exported).toContain('name:  John Doe');
        expect(exported).toContain('email:  john@example.com');
      });

      it('should export as XML', async () => {
        const exported = await service.exportDataSet(testDataSet.id, {
          format: 'xml'
        });

        expect(exported).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(exported).toContain('<data>');
        expect(exported).toContain('<name>John Doe</name>');
        expect(exported).toContain('<email>john@example.com</email>');
        expect(exported).toContain('</data>');
      });

      it('should handle CSV export with quotes in data', async () => {
        const quotedDataSet = await service.createDataSet(
          'Quoted Test',
          'cv',
          { description: 'A "quoted" description', title: 'Software Engineer' }
        );

        const exported = await service.exportDataSet(quotedDataSet.id, {
          format: 'csv'
        });

        expect(exported).toContain('"A ""quoted"" description"');
      });

      it('should throw error for non-existent data set', async () => {
        await expect(
          service.exportDataSet('non-existent', { format: 'json' })
        ).rejects.toThrow('Data set non-existent not found');
      });

      it('should throw error for unsupported format', async () => {
        await expect(
          service.exportDataSet(testDataSet.id, { format: 'pdf' as any })
        ).rejects.toThrow('Unsupported export format: pdf');
      });
    });

    describe('importDataSet', () => {
      it('should import JSON data', async () => {
        const jsonData = JSON.stringify({
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com'
        });

        const imported = await service.importDataSet(jsonData, 'json', {
          name: 'Imported JSON',
          type: 'cv'
        });

        expect(imported).toBeDefined();
        expect(imported.name).toBe('Imported JSON');
        expect(imported.data.firstName).toBe('Alice');
        expect(imported.metadata.source).toBe('imported');
      });

      it('should import CSV data', async () => {
        const csvData = 'name,email,age\nBob,bob@example.com,30\nCharlie,charlie@example.com,25';

        const imported = await service.importDataSet(csvData, 'csv', {
          name: 'Imported CSV',
          type: 'user-profile'
        });

        expect(imported).toBeDefined();
        expect(Array.isArray(imported.data)).toBe(true);
        expect(imported.data.length).toBe(2);
        expect(imported.data[0].name).toBe('Bob');
        expect(imported.data[1].name).toBe('Charlie');
      });

      it('should import YAML data', async () => {
        const yamlData = `name: David
email: david@example.com
skills:
  - Python
  - Django`;

        const imported = await service.importDataSet(yamlData, 'yaml', {
          name: 'Imported YAML',
          type: 'cv'
        });

        expect(imported).toBeDefined();
        expect(imported.data.name).toBe('David');
        expect(imported.data.email).toBe('david@example.com');
      });

      it('should use default values when metadata not provided', async () => {
        const jsonData = JSON.stringify({ test: 'data' });

        const imported = await service.importDataSet(jsonData, 'json', {});

        expect(imported.name).toBe('Imported data');
        expect(imported.type).toBe('cv');
        expect(imported.metadata.tags).toContain('imported');
      });

      it('should throw error for unsupported import format', async () => {
        await expect(
          service.importDataSet('data', 'xml' as any, {})
        ).rejects.toThrow('Unsupported import format: xml');
      });

      it('should handle invalid JSON', async () => {
        await expect(
          service.importDataSet('invalid json', 'json', {})
        ).rejects.toThrow();
      });

      it('should handle empty CSV', async () => {
        const imported = await service.importDataSet('', 'csv', {
          name: 'Empty CSV',
          type: 'cv'
        });

        expect(imported.data).toEqual([]);
      });
    });
  });

  describe('Cache Management', () => {
    describe('clearCache', () => {
      it('should clear all cached data', async () => {
        const dataSet = await service.createDataSet('Cache Test', 'cv', { data: 'test' });

        // Cache the data set
        await service.getDataSet(dataSet.id);

        let stats = service.getCacheStats();
        expect(stats.count).toBeGreaterThan(0);

        service.clearCache();

        stats = service.getCacheStats();
        expect(stats.count).toBe(0);
        expect(stats.size).toBe(0);
      });
    });

    describe('cleanupExpired', () => {
      it('should remove expired data sets', async () => {
        // Create expired data set
        const expiredDataSet = await service.createDataSet('Expired', 'cv', { data: 'expired' });
        (expiredDataSet as any).expiresAt = new Date(Date.now() - 1000);

        // Create non-expired data set
        await service.createDataSet('Active', 'cv', { data: 'active' });

        const cleanedCount = await service.cleanupExpired();
        expect(cleanedCount).toBeGreaterThanOrEqual(1);

        // Expired data set should be gone
        const retrieved = await service.getDataSet(expiredDataSet.id);
        expect(retrieved).toBeNull();
      });

      it('should return count of cleaned up data sets', async () => {
        // Create multiple expired data sets
        const expired1 = await service.createDataSet('Expired 1', 'cv', { data: '1' });
        (expired1 as any).expiresAt = new Date(Date.now() - 1000);

        const expired2 = await service.createDataSet('Expired 2', 'cv', { data: '2' });
        (expired2 as any).expiresAt = new Date(Date.now() - 1000);

        const cleanedCount = await service.cleanupExpired();
        expect(cleanedCount).toBeGreaterThanOrEqual(2);
      });
    });

    describe('getCacheStats', () => {
      it('should return cache statistics', () => {
        const stats = service.getCacheStats();
        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('count');
        expect(stats).toHaveProperty('hitRate');
        expect(typeof stats.size).toBe('number');
        expect(typeof stats.count).toBe('number');
        expect(typeof stats.hitRate).toBe('number');
      });

      it('should reflect cached data size', async () => {
        const initialStats = service.getCacheStats();
        expect(initialStats.count).toBe(0);

        const dataSet = await service.createDataSet('Cache Stats', 'cv', { data: 'test' });
        await service.getDataSet(dataSet.id); // This should cache it

        const afterCacheStats = service.getCacheStats();
        expect(afterCacheStats.count).toBeGreaterThan(initialStats.count);
      });
    });
  });

  describe('Private Method Behavior (through public interface)', () => {
    describe('ID Generation', () => {
      it('should generate unique IDs', async () => {
        const dataSet1 = await service.createDataSet('Test 1', 'cv', { data: '1' });
        const dataSet2 = await service.createDataSet('Test 2', 'cv', { data: '2' });

        expect(dataSet1.id).not.toBe(dataSet2.id);
        expect(dataSet1.id).toMatch(/^mock-\d+-[a-f0-9]{16}$/);
        expect(dataSet2.id).toMatch(/^mock-\d+-[a-f0-9]{16}$/);
      });
    });

    describe('Schema Inference', () => {
      it('should infer correct types from data', async () => {
        const complexData = {
          stringField: 'test',
          numberField: 42,
          booleanField: true,
          arrayField: ['item1', 'item2'],
          objectField: { nested: 'value' },
          nullField: null,
          undefinedField: undefined
        };

        const dataSet = await service.createDataSet('Schema Test', 'cv', complexData);
        const schema = dataSet.schema;

        expect(schema.properties?.stringField).toEqual({ type: 'string' });
        expect(schema.properties?.numberField).toEqual({ type: 'number' });
        expect(schema.properties?.booleanField).toEqual({ type: 'boolean' });
        expect(schema.properties?.arrayField).toEqual({ type: 'array', items: { type: 'string' } });
        expect(schema.properties?.objectField).toEqual({ type: 'object' });

        // null and undefined should not be in required fields
        expect(schema.required).not.toContain('nullField');
        expect(schema.required).not.toContain('undefinedField');

        // Non-null fields should be required
        expect(schema.required).toContain('stringField');
        expect(schema.required).toContain('numberField');
        expect(schema.required).toContain('booleanField');
      });
    });

    describe('Cache Eviction', () => {
      it('should evict oldest cache entries when size limit is reached', async () => {
        // Create a service with very small cache size
        const smallCacheService = new MockDataService({
          maxSize: 1, // 1 byte - very small to force eviction
          maxAge: 3600000 // 1 hour
        });

        // Create multiple data sets that should exceed cache size
        const dataSet1 = await smallCacheService.createDataSet('Cache 1', 'cv', { large: 'data'.repeat(100) });
        const dataSet2 = await smallCacheService.createDataSet('Cache 2', 'cv', { large: 'data'.repeat(100) });

        // Access them to cache them
        await smallCacheService.getDataSet(dataSet1.id);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps
        await smallCacheService.getDataSet(dataSet2.id);

        const stats = smallCacheService.getCacheStats();
        // Should have evicted older entries due to size limit
        expect(stats.count).toBeLessThanOrEqual(1);

        smallCacheService.clearCache();
      });
    });

    describe('Template Selection', () => {
      it('should select appropriate template for type and category', async () => {
        // Register a custom template with specific category
        const customTemplate: DataTemplate = {
          id: 'custom-cv-tech',
          name: 'Tech CV Template',
          type: 'cv',
          category: 'tech-specific',
          schema: {
            type: 'object',
            properties: { techSkills: { type: 'array' } },
            required: ['techSkills']
          },
          generator: async () => ({ techSkills: ['React', 'Node.js'] }),
          examples: []
        };

        service.registerTemplate(customTemplate);

        const generated = await service.generateData({
          type: 'cv',
          category: 'tech-specific'
        });

        expect(generated.category).toBe('tech-specific');
        expect(generated.data.techSkills).toBeDefined();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large data sets', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        data: 'x'.repeat(1000) // 1KB per item
      }));

      const dataSet = await service.createDataSet('Large Data', 'cv', largeData);
      expect(dataSet.data.length).toBe(1000);
      expect(dataSet.size).toBeGreaterThan(1000000); // At least 1MB
    });

    it('should handle special characters in data', async () => {
      const specialData = {
        name: 'José María',
        description: 'Contains émojis 🚀 and ñ characters',
        code: '<script>alert("XSS")</script>',
        unicode: '你好世界',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
      };

      const dataSet = await service.createDataSet('Special Chars', 'cv', specialData);
      expect(dataSet.data).toEqual(specialData);

      // Test export/import with special characters
      const exported = await service.exportDataSet(dataSet.id, { format: 'json' });
      const reimported = await service.importDataSet(exported, 'json', {
        name: 'Reimported Special',
        type: 'cv'
      });

      expect(reimported.data).toEqual(specialData);
    });

    it('should handle empty and null data gracefully', async () => {
      const emptyData = {};
      const dataSet = await service.createDataSet('Empty Data', 'cv', emptyData);
      expect(dataSet.data).toEqual(emptyData);
      expect(dataSet.schema.required).toEqual([]);
    });

    it('should handle concurrent operations', async () => {
      // Create multiple data sets concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.createDataSet(`Concurrent ${i}`, 'cv', { index: i })
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(10);

      // Verify all have unique IDs
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle cache expiration correctly', async () => {
      // Create service with very short cache expiration
      const shortCacheService = new MockDataService({
        maxAge: 50 // 50ms
      });

      const dataSet = await shortCacheService.createDataSet('Short Cache', 'cv', { data: 'test' });

      // Cache it
      await shortCacheService.getDataSet(dataSet.id);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should reload from main storage, not cache
      const retrieved = await shortCacheService.getDataSet(dataSet.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(dataSet.id);

      shortCacheService.clearCache();
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create 100 data sets
      const createPromises = Array.from({ length: 100 }, (_, i) =>
        service.createDataSet(`Bulk ${i}`, 'cv', { index: i })
      );

      const created = await Promise.all(createPromises);
      const createTime = Date.now() - startTime;

      expect(created.length).toBe(100);
      expect(createTime).toBeLessThan(5000); // Should complete within 5 seconds

      // List all data sets
      const listStartTime = Date.now();
      const listed = await service.listDataSets();
      const listTime = Date.now() - listStartTime;

      expect(listed.length).toBeGreaterThanOrEqual(100);
      expect(listTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain performance with large schemas', async () => {
      const largeSchema = {
        type: 'object',
        properties: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`field${i}`, { type: 'string' }])
        ),
        required: Array.from({ length: 50 }, (_, i) => `field${i}`)
      };

      const largeData = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`field${i}`, `value${i}`])
      );

      const startTime = Date.now();
      const dataSet = await service.createDataSet('Large Schema', 'cv', largeData, {
        schema: largeSchema
      });
      const createTime = Date.now() - startTime;

      expect(dataSet).toBeDefined();
      expect(createTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});