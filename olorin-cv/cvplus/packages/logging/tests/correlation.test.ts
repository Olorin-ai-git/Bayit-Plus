/**
 * T006: Correlation ID test in packages/core/src/logging/__tests__/correlation.test.ts
 * CRITICAL: This test MUST FAIL before implementation
  */

import { CorrelationService } from '../CorrelationService';

describe('CorrelationService', () => {
  beforeEach(() => {
    CorrelationService.clear();
  });

  afterEach(() => {
    CorrelationService.clear();
  });

  describe('generateId', () => {
    it('should generate unique correlation ID', () => {
      const id1 = CorrelationService.generateId();
      const id2 = CorrelationService.generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-zA-Z0-9_-]{12,}$/); // nanoid format
    });

    it('should generate ID with custom prefix', () => {
      const id = CorrelationService.generateId('req');

      expect(id).toMatch(/^req-[a-zA-Z0-9_-]+$/);
    });
  });

  describe('setCurrentId', () => {
    it('should set and get current correlation ID', () => {
      const testId = 'test-correlation-123';

      CorrelationService.setCurrentId(testId);
      const currentId = CorrelationService.getCurrentId();

      expect(currentId).toBe(testId);
    });

    it('should handle nested correlation contexts', () => {
      const parentId = 'parent-123';
      const childId = 'child-456';

      CorrelationService.setCurrentId(parentId);
      expect(CorrelationService.getCurrentId()).toBe(parentId);

      CorrelationService.withCorrelationId(childId, () => {
        expect(CorrelationService.getCurrentId()).toBe(childId);
      });

      expect(CorrelationService.getCurrentId()).toBe(parentId);
    });
  });

  describe('getCurrentId', () => {
    it('should return null when no correlation ID is set', () => {
      const currentId = CorrelationService.getCurrentId();

      expect(currentId).toBeNull();
    });

    it('should return current correlation ID when set', () => {
      const testId = 'test-123';
      CorrelationService.setCurrentId(testId);

      const currentId = CorrelationService.getCurrentId();

      expect(currentId).toBe(testId);
    });
  });

  describe('withCorrelationId', () => {
    it('should execute function with specific correlation ID', () => {
      const testId = 'scoped-test-123';
      let capturedId: string | null = null;

      CorrelationService.withCorrelationId(testId, () => {
        capturedId = CorrelationService.getCurrentId();
      });

      expect(capturedId).toBe(testId);
      expect(CorrelationService.getCurrentId()).toBeNull();
    });

    it('should return function result', () => {
      const result = CorrelationService.withCorrelationId('test-id', () => {
        return 'function-result';
      });

      expect(result).toBe('function-result');
    });

    it('should handle async functions', async () => {
      const testId = 'async-test-123';
      let capturedId: string | null = null;

      await CorrelationService.withCorrelationId(testId, async () => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        capturedId = CorrelationService.getCurrentId();
      });

      expect(capturedId).toBe(testId);
    });

    it('should restore previous correlation ID after execution', () => {
      const originalId = 'original-123';
      const nestedId = 'nested-456';

      CorrelationService.setCurrentId(originalId);

      CorrelationService.withCorrelationId(nestedId, () => {
        expect(CorrelationService.getCurrentId()).toBe(nestedId);
      });

      expect(CorrelationService.getCurrentId()).toBe(originalId);
    });

    it('should handle exceptions and restore correlation ID', () => {
      const originalId = 'original-123';
      const nestedId = 'nested-456';

      CorrelationService.setCurrentId(originalId);

      expect(() => {
        CorrelationService.withCorrelationId(nestedId, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      expect(CorrelationService.getCurrentId()).toBe(originalId);
    });
  });

  describe('clear', () => {
    it('should clear current correlation ID', () => {
      CorrelationService.setCurrentId('test-123');
      expect(CorrelationService.getCurrentId()).toBe('test-123');

      CorrelationService.clear();
      expect(CorrelationService.getCurrentId()).toBeNull();
    });
  });

  describe('middleware', () => {
    it('should create Express middleware function', () => {
      const middleware = CorrelationService.middleware();

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });
  });
});