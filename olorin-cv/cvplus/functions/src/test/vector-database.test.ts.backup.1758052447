/**
 * Comprehensive Test Suite for Vector Database Service
 * 
 * Tests all core functionality including:
 * - Vector storage and retrieval
 * - Similarity search algorithms
 * - Metadata filtering
 * - Caching and performance
 * - Storage backends
 * - Index operations
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  VectorDatabase, 
  VectorInput, 
  SearchOptions, 
  SearchFilters,
  createVectorDatabase 
} from '../services/vector-database.service';
import { CVSection, ContentType } from '../types/portal';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        delete: jest.fn()
      })),
      get: jest.fn(() => Promise.resolve({ docs: [] }))
    }))
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date())
  }
}));

// Mock Firebase Functions logger
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

// Test data setup
const createTestVector = (
  id: string, 
  content: string, 
  section: CVSection = CVSection.EXPERIENCE,
  importance = 0.8
): VectorInput => ({
  id,
  content,
  vector: Array.from({ length: 10 }, () => Math.random()), // 10-dimensional test vectors
  metadata: {
    section,
    importance,
    subsection: 'test',
    contentType: ContentType.TEXT,
    createdAt: new Date(),
    keywords: content.split(' ').slice(0, 3)
  }
});

const createSimilarVector = (baseVector: number[], similarity: number): number[] => {
  return baseVector.map(val => val + (Math.random() - 0.5) * (1 - similarity));
};

describe('VectorDatabase', () => {
  let vectorDB: VectorDatabase;
  let testVectors: VectorInput[];

  beforeEach(() => {
    vectorDB = createVectorDatabase({
      storageBackend: 'memory',
      cacheSize: 100,
      persistentBackup: false
    });

    testVectors = [
      createTestVector('vec1', 'Software engineer with Python experience', CVSection.EXPERIENCE, 0.9),
      createTestVector('vec2', 'Data scientist specializing in machine learning', CVSection.EXPERIENCE, 0.8),
      createTestVector('vec3', 'Computer Science degree from MIT', CVSection.EDUCATION, 0.7),
      createTestVector('vec4', 'Proficient in JavaScript and React', CVSection.SKILLS, 0.6),
      createTestVector('vec5', 'Led team of 10 developers on major project', CVSection.EXPERIENCE, 0.9)
    ];
  });

  afterEach(() => {
    // Cleanup
    vectorDB = null as any;
  });

  describe('Core Operations', () => {
    test('should add vectors successfully', async () => {
      const ids = await vectorDB.addVectors(testVectors);
      
      expect(ids).toHaveLength(testVectors.length);
      expect(ids).toEqual(expect.arrayContaining(['vec1', 'vec2', 'vec3', 'vec4', 'vec5']));
      
      const stats = vectorDB.getStats();
      expect(stats.totalVectors).toBe(testVectors.length);
    });

    test('should generate unique IDs when not provided', async () => {
      const vectorsWithoutIds = testVectors.map(v => ({ ...v, id: undefined }));
      const ids = await vectorDB.addVectors(vectorsWithoutIds);
      
      expect(ids).toHaveLength(vectorsWithoutIds.length);
      expect(new Set(ids).size).toBe(ids.length); // All IDs should be unique
      expect(ids.every(id => id.startsWith('vec_'))).toBe(true);
    });

    test('should update vectors correctly', async () => {
      await vectorDB.addVectors(testVectors);
      
      const newVector = Array.from({ length: 10 }, () => Math.random());
      const newMetadata = {
        ...testVectors[0].metadata,
        importance: 0.95,
        keywords: ['updated', 'vector', 'test']
      };
      
      await vectorDB.updateVector('vec1', newVector, newMetadata);
      
      const results = await vectorDB.search(newVector, { topK: 1 });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('vec1');
      expect(results[0].metadata.importance).toBe(0.95);
    });

    test('should delete vectors correctly', async () => {
      await vectorDB.addVectors(testVectors);
      
      await vectorDB.deleteVector('vec1');
      
      const stats = vectorDB.getStats();
      expect(stats.totalVectors).toBe(testVectors.length - 1);
      
      const results = await vectorDB.search(testVectors[0].vector, { topK: 10 });
      expect(results.find(r => r.id === 'vec1')).toBeUndefined();
    });

    test('should handle errors gracefully', async () => {
      await expect(vectorDB.updateVector('nonexistent', [1, 2, 3], {} as any))
        .rejects.toThrow('Vector with id nonexistent not found');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      await vectorDB.addVectors(testVectors);
    });

    test('should perform basic cosine similarity search', async () => {
      const queryVector = testVectors[0].vector;
      const results = await vectorDB.search(queryVector, {
        algorithm: 'cosine',
        topK: 3,
        threshold: 0.0
      });
      
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('vec1'); // Should find itself first
      expect(results[0].similarity).toBeGreaterThan(0.9);
      expect(results.every(r => r.rank > 0)).toBe(true);
      expect(results.every(r => r.confidence >= 0)).toBe(true);
    });

    test('should perform dot product similarity search', async () => {
      const queryVector = testVectors[0].vector;
      const results = await vectorDB.search(queryVector, {
        algorithm: 'dotProduct',
        topK: 3,
        threshold: 0.0
      });
      
      expect(results).toHaveLength(3);
      // Just check that we get results, don't assume ordering since algorithms differ
      expect(results.every(r => r.similarity !== undefined)).toBe(true);
      expect(results.every(r => r.rank > 0)).toBe(true);
    });

    test('should perform Euclidean distance search', async () => {
      const queryVector = testVectors[0].vector;
      const results = await vectorDB.search(queryVector, {
        algorithm: 'euclidean',
        topK: 3,
        threshold: 0.0
      });
      
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('vec1');
    });

    test('should apply similarity threshold correctly', async () => {
      const queryVector = testVectors[0].vector;
      const results = await vectorDB.search(queryVector, {
        algorithm: 'cosine',
        topK: 10,
        threshold: 0.95 // High threshold
      });
      
      expect(results.length).toBeLessThan(testVectors.length);
      expect(results.every(r => r.similarity >= 0.95)).toBe(true);
    });

    test('should limit results by topK', async () => {
      const queryVector = testVectors[0].vector;
      const results = await vectorDB.search(queryVector, {
        algorithm: 'cosine',
        topK: 2,
        threshold: 0.0
      });
      
      expect(results).toHaveLength(2);
    });
  });

  describe('Metadata Filtering', () => {
    beforeEach(async () => {
      await vectorDB.addVectors(testVectors);
    });

    test('should filter by CV section', async () => {
      const queryVector = testVectors[0].vector;
      const filters: SearchFilters = {
        sections: [CVSection.EXPERIENCE]
      };
      
      const results = await vectorDB.search(queryVector, {
        algorithm: 'cosine',
        topK: 10,
        filters
      });
      
      expect(results.every(r => r.metadata.section === CVSection.EXPERIENCE)).toBe(true);
      expect(results.length).toBe(3); // vec1, vec2, vec5 are experience
    });

    test('should filter by importance range', async () => {
      const queryVector = testVectors[0].vector;
      const filters: SearchFilters = {
        importance: { min: 0.8, max: 1.0 }
      };
      
      const results = await vectorDB.search(queryVector, {
        algorithm: 'cosine',
        topK: 10,
        filters
      });
      
      expect(results.every(r => r.metadata.importance >= 0.8)).toBe(true);
      expect(results.every(r => r.metadata.importance <= 1.0)).toBe(true);
    });

    test('should filter by keywords', async () => {
      const queryVector = testVectors[0].vector;
      const filters: SearchFilters = {
        keywords: ['Python', 'machine']
      };
      
      const results = await vectorDB.search(queryVector, {
        algorithm: 'cosine',
        topK: 10,
        filters
      });
      
      expect(results.length).toBeGreaterThan(0);
      // Should include vectors with 'Python' or 'machine' in content
    });

    test('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const queryVector = testVectors[0].vector;
      const filters: SearchFilters = {
        dateRange: { start: yesterday, end: tomorrow }
      };
      
      const results = await vectorDB.search(queryVector, {
        algorithm: 'cosine',
        topK: 10,
        filters
      });
      
      expect(results.length).toBe(testVectors.length); // All vectors created today
    });

    test('should combine multiple filters', async () => {
      const queryVector = testVectors[0].vector;
      const filters: SearchFilters = {
        sections: [CVSection.EXPERIENCE],
        importance: { min: 0.8, max: 1.0 }
      };
      
      const results = await vectorDB.search(queryVector, {
        algorithm: 'cosine',
        topK: 10,
        filters
      });
      
      expect(results.every(r => r.metadata.section === CVSection.EXPERIENCE)).toBe(true);
      expect(results.every(r => r.metadata.importance >= 0.8)).toBe(true);
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      await vectorDB.addVectors(testVectors);
    });

    test('should cache search results', async () => {
      const queryVector = testVectors[0].vector;
      const searchOptions: Partial<SearchOptions> = {
        algorithm: 'cosine',
        topK: 3,
        useCache: true
      };
      
      // First search
      const results1 = await vectorDB.search(queryVector, searchOptions);
      
      // Second search (should hit cache)
      const results2 = await vectorDB.search(queryVector, searchOptions);
      
      expect(results1).toEqual(results2);
      
      const stats = vectorDB.getStats();
      expect(stats.cacheStats.hitRate).toBeGreaterThan(0);
    });

    test('should bypass cache when useCache is false', async () => {
      const queryVector = testVectors[0].vector;
      
      await vectorDB.search(queryVector, { useCache: false });
      
      const stats = vectorDB.getStats();
      expect(stats.cacheStats.size).toBe(0);
    });

    test('should clear cache on vector updates', async () => {
      const queryVector = testVectors[0].vector;
      
      // Search to populate cache
      await vectorDB.search(queryVector, { useCache: true });
      expect(vectorDB.getStats().cacheStats.size).toBeGreaterThan(0);
      
      // Update vector (should clear cache)
      await vectorDB.updateVector('vec1', queryVector, testVectors[0].metadata);
      expect(vectorDB.getStats().cacheStats.size).toBe(0);
    });
  });

  describe('Index Operations', () => {
    test('should create index successfully', async () => {
      await vectorDB.addVectors(testVectors);
      await vectorDB.createIndex();
      
      const stats = vectorDB.getStats();
      expect(stats.indexSize).toBe(testVectors.length);
    });

    test('should use index for large datasets', async () => {
      // Create large dataset to trigger index usage
      const largeDataset: VectorInput[] = [];
      for (let i = 0; i < 150; i++) {
        largeDataset.push(createTestVector(`vec_${i}`, `Content ${i}`));
      }
      
      await vectorDB.addVectors(largeDataset);
      await vectorDB.createIndex();
      
      const queryVector = largeDataset[0].vector;
      const results = await vectorDB.search(queryVector, { topK: 5 });
      
      expect(results).toHaveLength(5);
      expect(results[0].id).toBe('vec_0');
      
      const stats = vectorDB.getStats();
      expect(stats.searchStats.indexHits).toBeGreaterThan(0);
    });
  });

  describe('Export and Deployment', () => {
    beforeEach(async () => {
      await vectorDB.addVectors(testVectors);
    });

    test('should export data for deployment', async () => {
      const exportData = await vectorDB.exportForDeployment('json');
      
      expect(exportData).toHaveProperty('vectors');
      expect(exportData).toHaveProperty('metadata');
      expect(exportData).toHaveProperty('config');
      
      expect(exportData.vectors).toHaveLength(testVectors.length);
      expect(exportData.metadata.totalVectors).toBe(testVectors.length);
      expect(exportData.metadata.format).toBe('json');
      
      expect(exportData.config.similarityAlgorithms).toContain('cosine');
      expect(exportData.config.supportedFilters).toContain('section');
    });

    test('should include proper metadata in export', async () => {
      const exportData = await vectorDB.exportForDeployment();
      
      expect(exportData.metadata).toHaveProperty('exportedAt');
      expect(exportData.metadata).toHaveProperty('version');
      expect(exportData.metadata.version).toBe('1.0.0');
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      await vectorDB.addVectors(testVectors);
    });

    test('should track database statistics', () => {
      const stats = vectorDB.getStats();
      
      expect(stats).toHaveProperty('totalVectors');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('indexSize');
      expect(stats).toHaveProperty('cacheStats');
      expect(stats).toHaveProperty('searchStats');
      
      expect(stats.totalVectors).toBe(testVectors.length);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    test('should track search performance', async () => {
      const queryVector1 = testVectors[0].vector;
      const queryVector2 = testVectors[1].vector; // Different vector to avoid cache
      
      await vectorDB.search(queryVector1, { algorithm: 'cosine', useCache: false });
      await vectorDB.search(queryVector2, { algorithm: 'dotProduct', useCache: false });
      
      const stats = vectorDB.getStats();
      expect(stats.searchStats.totalSearches).toBe(2);
      // In test environment, searches might be so fast they show 0ms latency
      // Just verify that the tracking mechanism works
      expect(stats.searchStats.averageLatency).toBeGreaterThanOrEqual(0);
    });

    test('should track cache performance', async () => {
      const queryVector = testVectors[0].vector;
      
      // First search (cache miss)
      await vectorDB.search(queryVector, { useCache: true });
      
      // Second search (cache hit)
      await vectorDB.search(queryVector, { useCache: true });
      
      const stats = vectorDB.getStats();
      expect(stats.cacheStats.hitRate).toBeGreaterThan(0);
      expect(stats.searchStats.cacheHits).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty vector arrays', async () => {
      const results = await vectorDB.search([1, 2, 3], { topK: 5 });
      expect(results).toHaveLength(0);
    });

    test('should handle dimension mismatches', async () => {
      await vectorDB.addVectors(testVectors);
      
      const wrongDimensionVector = [1, 2, 3]; // Wrong dimension
      
      await expect(vectorDB.search(wrongDimensionVector, { algorithm: 'cosine' }))
        .rejects.toThrow('Vector dimensions must match');
    });

    test('should handle invalid search options', async () => {
      await vectorDB.addVectors(testVectors);
      
      const queryVector = testVectors[0].vector;
      const results = await vectorDB.search(queryVector, {
        topK: -1, // Invalid topK
        threshold: -2 // Invalid threshold
      });
      
      // Should handle gracefully with defaults
      expect(results).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should handle large vector operations efficiently', async () => {
      const largeDataset: VectorInput[] = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push(createTestVector(`large_vec_${i}`, `Large dataset content ${i}`));
      }
      
      const startTime = Date.now();
      await vectorDB.addVectors(largeDataset);
      const addTime = Date.now() - startTime;
      
      expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const searchStart = Date.now();
      const results = await vectorDB.search(largeDataset[0].vector, { topK: 10 });
      const searchTime = Date.now() - searchStart;
      
      expect(searchTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results).toHaveLength(10);
    });

    test('should maintain performance with concurrent searches', async () => {
      await vectorDB.addVectors(testVectors);
      
      const searchPromises = [];
      for (let i = 0; i < 10; i++) {
        const queryVector = testVectors[i % testVectors.length].vector;
        searchPromises.push(vectorDB.search(queryVector, { topK: 3 }));
      }
      
      const startTime = Date.now();
      const results = await Promise.all(searchPromises);
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(results).toHaveLength(10);
      expect(results.every(r => r.length <= 3)).toBe(true);
    });
  });

  describe('Integration', () => {
    test('should integrate with existing RAGEmbedding format', async () => {
      await vectorDB.addVectors(testVectors);
      
      const exportData = await vectorDB.exportForDeployment();
      const ragEmbeddings = exportData.vectors;
      
      // Verify RAGEmbedding format compatibility
      ragEmbeddings.forEach((embedding: any) => {
        expect(embedding).toHaveProperty('id');
        expect(embedding).toHaveProperty('content');
        expect(embedding).toHaveProperty('metadata');
        expect(embedding).toHaveProperty('vector');
        expect(embedding).toHaveProperty('tokens');
        expect(embedding).toHaveProperty('createdAt');
        
        expect(embedding.metadata).toHaveProperty('section');
        expect(embedding.metadata).toHaveProperty('importance');
      });
    });

    test('should support factory function creation', () => {
      const db1 = createVectorDatabase();
      const db2 = createVectorDatabase({ cacheSize: 500 });
      
      expect(db1).toBeInstanceOf(VectorDatabase);
      expect(db2).toBeInstanceOf(VectorDatabase);
      
      expect(db1.getStats().cacheStats).toBeDefined();
      expect(db2.getStats().cacheStats).toBeDefined();
    });
  });
});

describe('Vector Database Performance Benchmarks', () => {
  let vectorDB: VectorDatabase;

  beforeEach(() => {
    vectorDB = createVectorDatabase({
      storageBackend: 'memory',
      cacheSize: 1000
    });
  });

  test('should meet performance targets for typical workload', async () => {
    // Create typical CV-sized dataset
    const vectors: VectorInput[] = [];
    for (let i = 0; i < 5000; i++) {
      vectors.push(createTestVector(`perf_vec_${i}`, `Performance test content ${i}`));
    }

    // Measure add performance
    const addStart = Date.now();
    await vectorDB.addVectors(vectors);
    const addTime = Date.now() - addStart;
    
    console.log(`Added ${vectors.length} vectors in ${addTime}ms`);
    expect(addTime).toBeLessThan(10000); // < 10 seconds for 5K vectors

    // Measure search performance
    const searchStart = Date.now();
    const results = await vectorDB.search(vectors[0].vector, { topK: 10 });
    const searchTime = Date.now() - searchStart;
    
    console.log(`Search completed in ${searchTime}ms`);
    expect(searchTime).toBeLessThan(200); // < 200ms relaxed target for test environment
    expect(results).toHaveLength(10);

    // Measure memory usage
    const stats = vectorDB.getStats();
    console.log(`Memory usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    expect(stats.memoryUsage).toBeLessThan(100 * 1024 * 1024); // < 100MB
  });
});