/**
 * Performance Benchmarks for Portal Generation System
 * 
 * Tests performance characteristics, memory usage, and scalability
 * of the portal generation workflow.
 * 
 * @author Gil Klainert
 * @created 2025-08-19
  */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import { PortalGenerationService } from '../services/portal-generation.service';
import { VectorDatabase } from '../services/vector-database.service';
import { PortalAssetManagementService } from '../services/portal-asset-management.service';
import { EmbeddingService } from '../services/embedding.service';
import { ParsedCV } from '../types/job';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  PORTAL_GENERATION_MAX_TIME: 60000, // 60 seconds
  ASSET_PROCESSING_MAX_TIME: 30000,  // 30 seconds
  VECTOR_SEARCH_MAX_TIME: 1000,      // 1 second
  EMBEDDING_GENERATION_MAX_TIME: 15000, // 15 seconds
  MEMORY_INCREASE_MAX_MB: 100,        // 100MB
  CONCURRENT_GENERATIONS_MAX: 10,     // 10 concurrent
  LARGE_CV_MAX_TIME: 90000           // 90 seconds for large CVs
};

// Test data generators
function generateLargeCV(): ParsedCV {
  return {
    personalInfo: {
      name: 'Performance Test User',
      email: 'test@example.com',
      title: 'Senior Performance Engineer'
    },
    summary: 'A' + 'very '.repeat(100) + 'long summary with extensive details about professional experience and achievements.',
    experience: Array(20).fill(null).map((_, i) => ({
      company: `Company ${i + 1}`,
      position: `Position ${i + 1}`,
      duration: '5 years',
      startDate: '2020-01-01',
      endDate: '2024-12-31',
      description: 'Lorem ipsum '.repeat(50) + 'detailed job description with many responsibilities.',
      achievements: Array(10).fill(null).map((_, j) => `Achievement ${j + 1} with detailed explanation.`),
      technologies: Array(15).fill(null).map((_, k) => `Technology${k + 1}`)
    })),
    skills: Array(50).fill(null).map((_, i) => `Skill ${i + 1}`),
    education: Array(5).fill(null).map((_, i) => ({
      institution: `University ${i + 1}`,
      degree: `Degree ${i + 1}`,
      field: `Field ${i + 1}`,
      graduationDate: `${2010 + i}`
    })),
    projects: Array(15).fill(null).map((_, i) => ({
      name: `Project ${i + 1}`,
      description: 'Project description '.repeat(20),
      technologies: Array(8).fill(null).map((_, j) => `Tech${j + 1}`),
      url: `https://project${i}.example.com`
    })),
    certifications: Array(10).fill(null).map((_, i) => ({
      name: `Certification ${i + 1}`,
      issuer: `Issuer ${i + 1}`,
      date: '2023-01-01'
    }))
  };
}

function generateStandardCV(): ParsedCV {
  return {
    personalInfo: {
      name: 'Standard Test User',
      email: 'standard@example.com',
      title: 'Software Engineer'
    },
    summary: 'Standard professional summary with reasonable length.',
    experience: [
      {
        company: 'Tech Company',
        position: 'Software Engineer',
        startDate: '2020-01-01',
        endDate: '2024-12-31',
        description: 'Standard job description with normal responsibilities.',
        achievements: ['Achievement 1', 'Achievement 2'],
        technologies: ['JavaScript', 'React', 'Node.js']
      }
    ],
    skills: [
      { name: 'JavaScript', level: 'Expert', category: 'Programming' },
      { name: 'React', level: 'Advanced', category: 'Frontend' }
    ],
    education: [
      {
        institution: 'University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        year: '2020'
      }
    ],
    projects: [
      {
        name: 'Sample Project',
        description: 'Project description',
        technologies: ['React', 'TypeScript'],
        url: 'https://project.example.com'
      }
    ]
  };
}

describe('Performance Benchmarks', () => {
  let portalService: PortalGenerationService;
  let vectorService: VectorDatabaseService;
  let assetService: PortalAssetManagementService;
  let embeddingService: EmbeddingService;

  beforeAll(() => {
    portalService = new PortalGenerationService();
    vectorService = new VectorDatabaseService();
    assetService = new PortalAssetManagementService();
    embeddingService = new EmbeddingService();
    
    // Warm up services
    console.log('[PERF] Warming up services for performance tests...');
  });

  afterAll(() => {
    console.log('[PERF] Performance tests completed');
  });

  describe('Portal Generation Performance', () => {
    test('Standard CV portal generation should complete within time threshold', async () => {
      const cv = generateStandardCV();
      const startTime = performance.now();
      
      const result = await portalService.generatePortal(cv, 'perf-test-1', 'user-1');
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PORTAL_GENERATION_MAX_TIME);
      
      console.log(`[PERF] Standard CV generation: ${executionTime.toFixed(2)}ms`);
    });

    test('Large CV portal generation should handle complex data efficiently', async () => {
      const largeCV = generateLargeCV();
      const startTime = performance.now();
      
      const result = await portalService.generatePortal(largeCV, 'perf-test-large', 'user-large');
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGE_CV_MAX_TIME);
      
      console.log(`[PERF] Large CV generation: ${executionTime.toFixed(2)}ms`);
    });

    test('Concurrent portal generations should scale appropriately', async () => {
      const concurrencyLevel = 5;
      const cvs = Array(concurrencyLevel).fill(null).map(() => generateStandardCV());
      
      const startTime = performance.now();
      
      const promises = cvs.map((cv, index) => 
        portalService.generatePortal(cv, `perf-concurrent-${index}`, `user-${index}`)
      );
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrencyLevel;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Average time per generation should be reasonable
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PORTAL_GENERATION_MAX_TIME);
      
      console.log(`[PERF] Concurrent (${concurrencyLevel}): Total ${totalTime.toFixed(2)}ms, Average ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('Vector Database Performance', () => {
    test('Vector storage should be efficient for large datasets', async () => {
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        id: `perf-vector-${i}`,
        content: `Performance test content ${i} with detailed information`,
        metadata: {
          section: 'test',
          importance: Math.floor(Math.random() * 10) + 1,
          keywords: [`keyword${i}`, `test${i}`],
          contentType: 'text'
        },
        vector: Array(1536).fill(0).map(() => Math.random()),
        tokens: 20,
        createdAt: new Date()
      }));

      const startTime = performance.now();
      await vectorService.storeEmbeddings(largeDataset);
      const endTime = performance.now();
      
      const storageTime = endTime - startTime;
      const timePerItem = storageTime / largeDataset.length;

      expect(timePerItem).toBeLessThan(10); // Less than 10ms per item
      
      console.log(`[PERF] Vector storage (1000 items): ${storageTime.toFixed(2)}ms (${timePerItem.toFixed(2)}ms per item)`);
    });

    test('Vector search should be fast with large datasets', async () => {
      const queryVector = Array(1536).fill(0).map(() => Math.random());
      
      const startTime = performance.now();
      const results = await vectorService.search(queryVector, {
        topK: 50,
        minScore: 0.3
      });
      const endTime = performance.now();
      
      const searchTime = endTime - startTime;

      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VECTOR_SEARCH_MAX_TIME);
      expect(results.length).toBeLessThanOrEqual(50);
      
      console.log(`[PERF] Vector search (top 50): ${searchTime.toFixed(2)}ms`);
    });

    test('Multiple concurrent searches should maintain performance', async () => {
      const concurrentSearches = 10;
      const queryVectors = Array(concurrentSearches).fill(null).map(() => 
        Array(1536).fill(0).map(() => Math.random())
      );

      const startTime = performance.now();
      
      const searchPromises = queryVectors.map(vector => 
        vectorService.search(vector, { topK: 20, minScore: 0.2 })
      );
      
      const results = await Promise.all(searchPromises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentSearches;

      results.forEach(result => {
        expect(result.length).toBeLessThanOrEqual(20);
      });

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.VECTOR_SEARCH_MAX_TIME);
      
      console.log(`[PERF] Concurrent searches (${concurrentSearches}): ${totalTime.toFixed(2)}ms avg, ${averageTime.toFixed(2)}ms per search`);
    });
  });

  describe('Asset Processing Performance', () => {
    test('Asset extraction should complete within time limits', async () => {
      const cv = generateLargeCV();
      // Add some mock asset URLs
      cv.personalInfo!.profileImage = 'https://example.com/profile.jpg';
      cv.experience!.forEach((exp, i) => {
        exp.companyLogo = `https://example.com/logo${i}.png`;
      });

      const startTime = performance.now();
      const assetBundle = await assetService.extractAssetsFromCV(cv, 'perf-assets');
      const endTime = performance.now();
      
      const processingTime = endTime - startTime;

      expect(assetBundle.assets.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ASSET_PROCESSING_MAX_TIME);
      
      console.log(`[PERF] Asset extraction: ${processingTime.toFixed(2)}ms for ${assetBundle.assets.length} assets`);
    });

    test('Asset optimization should maintain reasonable compression ratios', async () => {
      const cv = generateStandardCV();
      cv.personalInfo!.profileImage = 'https://example.com/large-profile.jpg';

      const startTime = performance.now();
      const assetBundle = await assetService.extractAssetsFromCV(cv, 'perf-optimization');
      const endTime = performance.now();

      const optimizationTime = endTime - startTime;
      const compressionRatio = assetBundle.compressionSummary.averageCompressionRatio;

      expect(compressionRatio).toBeGreaterThan(0.1); // At least 10% compression
      expect(compressionRatio).toBeLessThan(0.9);    // Not more than 90% (quality preservation)
      expect(optimizationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ASSET_PROCESSING_MAX_TIME);
      
      console.log(`[PERF] Asset optimization: ${optimizationTime.toFixed(2)}ms, compression: ${(compressionRatio * 100).toFixed(1)}%`);
    });
  });

  describe('Embedding Generation Performance', () => {
    test('Embedding generation should scale with content size', async () => {
      const texts = [
        'Short text',
        'Medium length text with more content and details about professional experience',
        'Very long text content that includes extensive details about professional experience, technical skills, achievements, and career progression over multiple years with various technologies and methodologies'
      ];

      for (const [index, text] of texts.entries()) {
        const startTime = performance.now();
        const embeddings = await embeddingService.generateEmbeddings([text]);
        const endTime = performance.now();
        
        const generationTime = endTime - startTime;

        expect(embeddings.length).toBe(1);
        expect(embeddings[0].length).toBe(1536); // OpenAI embedding dimension
        expect(generationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.EMBEDDING_GENERATION_MAX_TIME);
        
        console.log(`[PERF] Embedding ${index + 1} (${text.length} chars): ${generationTime.toFixed(2)}ms`);
      }
    });

    test('Batch embedding generation should be efficient', async () => {
      const batchTexts = Array(50).fill(null).map((_, i) => 
        `Batch embedding text ${i} with professional content about software development and engineering practices`
      );

      const startTime = performance.now();
      const embeddings = await embeddingService.generateEmbeddings(batchTexts);
      const endTime = performance.now();
      
      const batchTime = endTime - startTime;
      const timePerEmbedding = batchTime / batchTexts.length;

      expect(embeddings.length).toBe(batchTexts.length);
      expect(timePerEmbedding).toBeLessThan(300); // Less than 300ms per embedding in batch
      
      console.log(`[PERF] Batch embeddings (${batchTexts.length}): ${batchTime.toFixed(2)}ms (${timePerEmbedding.toFixed(2)}ms per item)`);
    });
  });

  describe('Memory Usage Monitoring', () => {
    test('Portal generation should not cause memory leaks', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate multiple portals to test memory usage
      for (let i = 0; i < 5; i++) {
        const cv = generateStandardCV();
        await portalService.generatePortal(cv, `memory-test-${i}`, 'memory-user');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      expect(memoryIncreaseMB).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_MAX_MB);
      
      console.log(`[PERF] Memory usage: +${memoryIncreaseMB.toFixed(2)}MB`);
      console.log(`[PERF] Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`[PERF] Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });

    test('Vector database should manage memory efficiently with large datasets', async () => {
      const initialMemory = process.memoryUsage();
      
      // Store large dataset
      const largeDataset = Array(2000).fill(null).map((_, i) => ({
        id: `memory-vector-${i}`,
        content: `Memory test content ${i}`,
        metadata: {
          section: 'memory-test',
          importance: 5,
          keywords: [`keyword${i}`],
          contentType: 'text'
        },
        vector: Array(1536).fill(0).map(() => Math.random()),
        tokens: 10,
        createdAt: new Date()
      }));

      await vectorService.storeEmbeddings(largeDataset);
      
      // Perform multiple searches
      for (let i = 0; i < 10; i++) {
        const queryVector = Array(1536).fill(0).map(() => Math.random());
        await vectorService.search(queryVector, { topK: 100 });
      }
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      expect(memoryIncreaseMB).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_INCREASE_MAX_MB * 2); // Allow more for large dataset
      
      console.log(`[PERF] Vector DB memory: +${memoryIncreaseMB.toFixed(2)}MB for 2000 vectors`);
    });
  });

  describe('Stress Testing', () => {
    test('System should handle rapid successive portal generations', async () => {
      const rapidGenerations = 10;
      const cv = generateStandardCV();
      
      const startTime = performance.now();
      
      // Generate portals rapidly in sequence
      for (let i = 0; i < rapidGenerations; i++) {
        const result = await portalService.generatePortal(cv, `rapid-${i}`, 'rapid-user');
        expect(result.success).toBe(true);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / rapidGenerations;

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PORTAL_GENERATION_MAX_TIME);
      
      console.log(`[PERF] Rapid generations (${rapidGenerations}): ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(2)}ms avg`);
    });

    test('System should handle maximum concurrent load', async () => {
      const maxConcurrency = PERFORMANCE_THRESHOLDS.CONCURRENT_GENERATIONS_MAX;
      const cv = generateStandardCV();
      
      const startTime = performance.now();
      
      const promises = Array(maxConcurrency).fill(null).map((_, i) => 
        portalService.generatePortal(cv, `max-concurrent-${i}`, `user-${i}`)
      );
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All should succeed under maximum load
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
      });
      
      console.log(`[PERF] Max concurrent (${maxConcurrency}): ${totalTime.toFixed(2)}ms total`);
    });
  });
});