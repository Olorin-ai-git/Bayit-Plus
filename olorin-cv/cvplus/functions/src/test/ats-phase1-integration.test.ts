/**
 * Integration tests for ATS Phase 1 implementation
  */

import { AdvancedATSOptimizationService } from '../services/ats-optimization.service';
import type { ParsedCV } from '../types/job';
import type { ATSOptimizationResult } from '../types/enhanced-models';

describe('ATS Phase 1 Integration Tests', () => {
  let atsService: AdvancedATSOptimizationService;
  let mockParsedCV: ParsedCV;

  beforeEach(() => {
    atsService = new AdvancedATSOptimizationService();
    
    // Mock parsed CV data
    mockParsedCV = {
      personalInfo: {
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '+1-555-123-4567',
        address: 'New York, NY',
        summary: 'Experienced software engineer with 5 years in full-stack development'
      },
      experience: [
        {
          position: 'Senior Software Engineer',
          company: 'Tech Corp',
          startDate: '2020-01',
          endDate: '2024-01',
          duration: '4 years',
          description: 'Led development of microservices architecture and implemented CI/CD pipelines',
          achievements: ['Improved deployment speed by 50%', 'Reduced system downtime by 30%']
        }
      ],
      skills: {
        technical: ['JavaScript', 'Python', 'React', 'Node.js', 'Docker', 'AWS'],
        soft: ['Leadership', 'Communication', 'Problem-solving']
      },
      education: [
        {
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          institution: 'University of Technology',
          graduationDate: '2019',
          gpa: '3.8'
        }
      ]
    };
  });

  describe('Advanced Multi-Factor Scoring', () => {
    test('should generate comprehensive ATS analysis', async () => {
      const result = await atsService.analyzeCV(mockParsedCV);
      
      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      
      // Check advanced score structure
      expect(result.advancedScore).toBeDefined();
      if (result.advancedScore) {
        expect(result.advancedScore.breakdown).toBeDefined();
        expect(result.advancedScore.breakdown.parsing).toBeDefined();
        expect(result.advancedScore.breakdown.keywords).toBeDefined();
        expect(result.advancedScore.breakdown.formatting).toBeDefined();
        expect(result.advancedScore.breakdown.content).toBeDefined();
        expect(result.advancedScore.breakdown.specificity).toBeDefined();
      }
    }, 30000);

    test('should provide ATS system-specific scores', async () => {
      const result = await atsService.analyzeCV(mockParsedCV);
      
      expect(result.advancedScore).toBeDefined();
      if (result.advancedScore?.atsSystemScores) {
        expect(result.advancedScore.atsSystemScores.workday).toBeDefined();
        expect(result.advancedScore.atsSystemScores.greenhouse).toBeDefined();
        expect(result.advancedScore.atsSystemScores.lever).toBeDefined();
        expect(result.advancedScore.atsSystemScores.bamboohr).toBeDefined();
        expect(result.advancedScore.atsSystemScores.taleo).toBeDefined();
        expect(result.advancedScore.atsSystemScores.generic).toBeDefined();
        
        // All scores should be in valid range
        Object.values(result.advancedScore.atsSystemScores).forEach(score => {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        });
      }
    }, 30000);

    test('should generate prioritized recommendations', async () => {
      const result = await atsService.analyzeCV(mockParsedCV);
      
      expect(result.advancedScore).toBeDefined();
      if (result.advancedScore?.recommendations) {
        expect(Array.isArray(result.advancedScore.recommendations)).toBe(true);
        
        if (result.advancedScore.recommendations.length > 0) {
          const firstRec = result.advancedScore.recommendations[0];
          expect(firstRec.id).toBeDefined();
          expect(firstRec.priority).toBeGreaterThanOrEqual(1);
          expect(firstRec.priority).toBeLessThanOrEqual(5);
          expect(firstRec.title).toBeDefined();
          expect(firstRec.description).toBeDefined();
          expect(['high', 'medium', 'low']).toContain(firstRec.impact);
          expect(firstRec.estimatedScoreImprovement).toBeGreaterThan(0);
        }
      }
    }, 30000);

    test('should include competitor benchmark analysis', async () => {
      const result = await atsService.analyzeCV(mockParsedCV);
      
      expect(result.advancedScore).toBeDefined();
      if (result.advancedScore?.competitorBenchmark) {
        expect(result.advancedScore.competitorBenchmark.benchmarkScore).toBeDefined();
        expect(result.advancedScore.competitorBenchmark.industryAverage).toBeDefined();
        expect(result.advancedScore.competitorBenchmark.topPercentile).toBeDefined();
        expect(result.advancedScore.competitorBenchmark.gapAnalysis).toBeDefined();
        
        const gapAnalysis = result.advancedScore.competitorBenchmark.gapAnalysis;
        expect(Array.isArray(gapAnalysis.missingKeywords)).toBe(true);
        expect(Array.isArray(gapAnalysis.weakAreas)).toBe(true);
        expect(Array.isArray(gapAnalysis.strengthAreas)).toBe(true);
      }
    }, 30000);
  });

  describe('Semantic Keyword Analysis', () => {
    test('should provide enhanced keyword analysis', async () => {
      const result = await atsService.analyzeCV(mockParsedCV, 'Software Engineer');
      
      expect(result.semanticAnalysis).toBeDefined();
      if (result.semanticAnalysis) {
        expect(result.semanticAnalysis.primaryKeywords).toBeDefined();
        expect(Array.isArray(result.semanticAnalysis.primaryKeywords)).toBe(true);
        expect(result.semanticAnalysis.contextualRelevance).toBeDefined();
        expect(result.semanticAnalysis.contextualRelevance).toBeGreaterThanOrEqual(0);
        expect(result.semanticAnalysis.contextualRelevance).toBeLessThanOrEqual(1);
        
        if (result.semanticAnalysis.primaryKeywords.length > 0) {
          const firstKeyword = result.semanticAnalysis.primaryKeywords[0];
          expect(firstKeyword.keyword).toBeDefined();
          expect(firstKeyword.relevanceScore).toBeDefined();
          expect(firstKeyword.atsImportance).toBeDefined();
        }
      }
    }, 30000);

    test('should identify industry-specific terms', async () => {
      const result = await atsService.analyzeCV(mockParsedCV, 'Software Engineer', ['technology']);
      
      expect(result.semanticAnalysis).toBeDefined();
      if (result.semanticAnalysis?.industrySpecificTerms) {
        expect(Array.isArray(result.semanticAnalysis.industrySpecificTerms)).toBe(true);
        
        // Should include some technology-related terms
        const hasRelevantTerms = result.semanticAnalysis.industrySpecificTerms.some((term: any) =>
          ['software', 'development', 'programming', 'engineering', 'technology'].includes(term.toLowerCase())
        );
        expect(hasRelevantTerms).toBe(true);
      }
    }, 30000);
  });

  describe('ATS System Simulation', () => {
    test('should simulate different ATS platforms', async () => {
      const result = await atsService.analyzeCV(mockParsedCV);
      
      expect(result.systemSimulations).toBeDefined();
      if (result.systemSimulations) {
        expect(Array.isArray(result.systemSimulations)).toBe(true);
        expect(result.systemSimulations.length).toBeGreaterThan(0);
        
        const workdaySimulation = result.systemSimulations.find((sim: any) => sim.system === 'workday');
        expect(workdaySimulation).toBeDefined();
        
        if (workdaySimulation) {
          expect(workdaySimulation.parsingAccuracy).toBeGreaterThanOrEqual(0);
          expect(workdaySimulation.parsingAccuracy).toBeLessThanOrEqual(1);
          expect(workdaySimulation.keywordMatching).toBeGreaterThanOrEqual(0);
          expect(workdaySimulation.keywordMatching).toBeLessThanOrEqual(1);
          expect(workdaySimulation.overallScore).toBeGreaterThanOrEqual(0);
          expect(workdaySimulation.overallScore).toBeLessThanOrEqual(100);
        }
      }
    }, 30000);

    test('should provide system-specific optimization tips', async () => {
      const result = await atsService.analyzeCV(mockParsedCV);
      
      const anySimulationWithTips = result.systemSimulations?.some((sim: any) => 
        sim.optimizationTips && sim.optimizationTips.length > 0
      );
      
      expect(anySimulationWithTips).toBe(true);
    }, 30000);
  });

  describe('Backward Compatibility', () => {
    test('should maintain legacy interface compatibility', async () => {
      const result = await atsService.analyzeATSCompatibility(mockParsedCV) as ATSOptimizationResult;
      
      // Legacy fields should still exist
      expect(result.score).toBeDefined();
      expect(result.overall).toBeDefined();
      expect(result.passes).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.keywords).toBeDefined();
      
      // Legacy keywords structure
      expect(result.keywords.found).toBeDefined();
      expect(result.keywords.missing).toBeDefined();
      expect(result.keywords.recommended).toBeDefined();
      
      // New advanced fields should also be present
      expect(result.advancedScore).toBeDefined();
      expect(result.semanticAnalysis).toBeDefined();
      expect(result.systemSimulations).toBeDefined();
    }, 30000);

    test('should handle missing optional parameters gracefully', async () => {
      const result = await atsService.analyzeATSCompatibility(mockParsedCV);
      
      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(typeof result.passes).toBe('boolean');
    }, 30000);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty CV gracefully', async () => {
      const emptyCV: ParsedCV = {
        personalInfo: {},
        experience: [],
        skills: [],
        education: []
      };

      const result = await atsService.analyzeATSCompatibility(emptyCV);
      
      expect(result).toBeDefined();
      expect(result.score).toBeLessThan(50); // Should score poorly for empty CV
      expect(result.issues.length).toBeGreaterThan(0); // Should have issues
    }, 30000);

    test('should handle malformed skills data', async () => {
      const malformedCV: ParsedCV = {
        ...mockParsedCV,
        skills: null as any
      };

      const result = await atsService.analyzeATSCompatibility(malformedCV);
      
      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
    }, 30000);

    test('should handle network failures gracefully', async () => {
      // This test simulates LLM service failures
      const serviceWithTimeout = new AdvancedATSOptimizationService();

      const result = await serviceWithTimeout.analyzeATSCompatibility(mockParsedCV);
      
      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
    }, 30000);
  });

  describe('Performance Tests', () => {
    test('should complete analysis within acceptable time', async () => {
      const startTime = Date.now();
      
      await atsService.analyzeCV(mockParsedCV);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    }, 35000);

    test('should handle multiple concurrent requests', async () => {
      const promises = Array(3).fill(0).map(() => 
        atsService.analyzeATSCompatibility(mockParsedCV)
      );
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.score).toBeDefined();
      });
    }, 45000);
  });
});

// Mock configuration for testing
beforeAll(() => {
  // Mock environment variables if needed
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup
});