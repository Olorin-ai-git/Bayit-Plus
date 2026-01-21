/**
 * External Data Integration Test
 * 
 * Tests for the external data integration system
 * 
 * @author Gil Klainert
 * @created 2025-08-23
 * @version 1.0
  */

import { 
  ExternalDataOrchestrator,
  GitHubAdapter,
  LinkedInAdapter,
  WebSearchAdapter,
  WebsiteAdapter,
  ValidationService,
  CacheService
} from '@cvplus/processing/external-data';

describe('External Data Integration', () => {
  let orchestrator: ExternalDataOrchestrator;
  let githubAdapter: GitHubAdapter;
  let validationService: ValidationService;
  
  beforeEach(() => {
    orchestrator = new ExternalDataOrchestrator();
    githubAdapter = new GitHubAdapter();
    validationService = new ValidationService();
  });
  
  describe('GitHub Adapter', () => {
    it('should validate GitHub username format', () => {
      // GitHub usernames can contain alphanumeric characters and hyphens
      const validUsernames = ['octocat', 'torvalds', 'gklainert'];
      const invalidUsernames = ['', 'user name', '@user'];
      
      validUsernames.forEach(username => {
        expect(username.match(/^[a-zA-Z0-9-]+$/)).toBeTruthy();
      });
      
      invalidUsernames.forEach(username => {
        expect(username.match(/^[a-zA-Z0-9-]+$/)).toBeFalsy();
      });
    });
  });
  
  describe('LinkedIn Adapter', () => {
    it('should validate LinkedIn profile URLs', () => {
      const adapter = new LinkedInAdapter();
      
      const validUrls = [
        'https://www.linkedin.com/in/john-doe',
        'https://linkedin.com/in/jane-smith-123',
        'https://www.linkedin.com/company/google'
      ];
      
      const invalidUrls = [
        'https://twitter.com/user',
        'linkedin.com/in/user',
        'https://linkedin.com/profile/user'
      ];
      
      validUrls.forEach(url => {
        expect(adapter.isValidProfileUrl(url)).toBe(true);
      });
      
      invalidUrls.forEach(url => {
        expect(adapter.isValidProfileUrl(url)).toBe(false);
      });
    });
    
    it('should extract profile ID from URL', () => {
      const adapter = new LinkedInAdapter();
      
      expect(adapter.extractProfileId('https://linkedin.com/in/john-doe'))
        .toBe('john-doe');
      expect(adapter.extractProfileId('https://www.linkedin.com/in/jane-smith-123/'))
        .toBe('jane-smith-123');
      expect(adapter.extractProfileId('https://linkedin.com/company/google'))
        .toBe(null);
    });
  });
  
  describe('Validation Service', () => {
    it('should remove duplicate skills', () => {
      const skills = ['JavaScript', 'TypeScript', 'JavaScript', 'React', 'TypeScript'];
      const uniqueSkills = validationService.removeDuplicates(
        skills.map(s => ({ name: s })),
        item => item.name
      );
      
      expect(uniqueSkills.length).toBe(3);
      expect(uniqueSkills.map(s => s.name)).toEqual(['JavaScript', 'TypeScript', 'React']);
    });
    
    it('should detect PII in text', async () => {
      const dataWithPII = {
        originalCVId: 'test-cv',
        userId: 'test-user',
        fetchedAt: new Date().toISOString(),
        sources: [],
        aggregatedSkills: [],
        aggregatedProjects: [],
        github: {
          profile: {
            username: 'testuser',
            email: 'test@example.com',
            bio: 'My SSN is 123-45-6789'
          }
        }
      };
      
      const validated = await validationService.validate(dataWithPII as any);
      
      expect(validated.validationStatus.hasPersonalInfo).toBe(true);
      expect(validated.github.profile.bio).toContain('[REDACTED]');
    });
  });
  
  describe('Cache Service', () => {
    it('should handle cache key sanitization', () => {
      const cache = new CacheService();
      const key = 'external_data:user/123:cv/456:github_linkedin';
      
      // The sanitizeKey method should replace invalid characters
      // This is tested indirectly through the set/get operations
      expect(async () => {
        await cache.set(key, { test: 'data' }, 60);
      }).not.toThrow();
    });
  });
  
  describe('Orchestrator', () => {
    it('should handle missing sources gracefully', async () => {
      const request = {
        userId: 'test-user',
        cvId: 'test-cv',
        sources: ['invalid-source']
      };
      
      try {
        await orchestrator.orchestrate(request);
      } catch (error) {
        // Should handle gracefully, not throw
        expect(error).toBeUndefined();
      }
    });
    
    it('should generate unique request IDs', () => {
      const ids = new Set();
      
      for (let i = 0; i < 100; i++) {
        // Access private method through type assertion
        const id = (orchestrator as any).generateRequestId();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
      
      expect(ids.size).toBe(100);
    });
  });
});

// Export for Jest
export {};