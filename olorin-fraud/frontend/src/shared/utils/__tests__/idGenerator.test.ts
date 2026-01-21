/**
 * Investigation ID Generator Tests
 *
 * Tests for investigation ID generation with various configurations.
 * Ensures proper uniqueness, format, and validation.
 */

import {
  generateInvestigationId,
  isValidInvestigationId,
  extractTimestamp
} from '../idGenerator';

// Mock getRuntimeConfig
jest.mock('../../config/runtimeConfig', () => ({
  getRuntimeConfig: jest.fn((key, options = {}) => {
    const mockConfig: Record<string, string> = {
      'REACT_APP_INVESTIGATION_ID_PREFIX': 'inv',
      'REACT_APP_INVESTIGATION_ID_TIMESTAMP': 'true',
      'REACT_APP_INVESTIGATION_ID_CRYPTO_RANDOM': 'true',
      'REACT_APP_INVESTIGATION_ID_RANDOM_LENGTH': '8'
    };

    const value = mockConfig[key] || options.defaultValue;
    return options.parser ? options.parser(value) : value;
  })
}));

describe('idGenerator', () => {
  describe('generateInvestigationId', () => {
    it('should generate ID with correct format', () => {
      const id = generateInvestigationId();

      // Should have format: prefix-timestamp-random
      const parts = id.split('-');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('inv');
      expect(parts[1]).toMatch(/^\d+$/); // Timestamp
      expect(parts[2]).toHaveLength(8); // Random suffix
    });

    it('should generate unique IDs', () => {
      const id1 = generateInvestigationId();
      const id2 = generateInvestigationId();

      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with valid characters', () => {
      const id = generateInvestigationId();

      // Should only contain alphanumeric and hyphens
      expect(id).toMatch(/^[a-z0-9-]+$/);
    });

    it('should use crypto.getRandomValues for random suffix', () => {
      // Mock crypto.getRandomValues
      const originalGetRandomValues = crypto.getRandomValues;
      const mockGetRandomValues = jest.fn((arr: Uint8Array) => {
        // Fill with deterministic values for testing
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i;
        }
        return arr;
      });
      crypto.getRandomValues = mockGetRandomValues;

      const id = generateInvestigationId();

      expect(mockGetRandomValues).toHaveBeenCalled();

      // Restore original implementation
      crypto.getRandomValues = originalGetRandomValues;
    });

    it('should include current timestamp', () => {
      const beforeTimestamp = Date.now();
      const id = generateInvestigationId();
      const afterTimestamp = Date.now();

      const timestamp = extractTimestamp(id);
      expect(timestamp).not.toBeNull();
      expect(timestamp!).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestamp!).toBeLessThanOrEqual(afterTimestamp);
    });
  });

  describe('isValidInvestigationId', () => {
    it('should validate correctly formatted IDs', () => {
      const id = generateInvestigationId();
      expect(isValidInvestigationId(id)).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidInvestigationId('')).toBe(false);
      expect(isValidInvestigationId('invalid')).toBe(false);
      expect(isValidInvestigationId('prefix-only')).toBe(false);
      expect(isValidInvestigationId('wrong-prefix-123-abc')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidInvestigationId(null as any)).toBe(false);
      expect(isValidInvestigationId(undefined as any)).toBe(false);
      expect(isValidInvestigationId(123 as any)).toBe(false);
      expect(isValidInvestigationId({} as any)).toBe(false);
    });

    it('should validate IDs with correct prefix', () => {
      const validId = 'inv-1704067200000-a8f3d9c2';
      expect(isValidInvestigationId(validId)).toBe(true);
    });

    it('should reject IDs with incorrect number of parts', () => {
      expect(isValidInvestigationId('inv-1704067200000')).toBe(false); // Missing random
      expect(isValidInvestigationId('inv-1704067200000-abc-def')).toBe(false); // Too many parts
    });
  });

  describe('extractTimestamp', () => {
    it('should extract timestamp from valid ID', () => {
      const id = generateInvestigationId();
      const timestamp = extractTimestamp(id);

      expect(timestamp).not.toBeNull();
      expect(typeof timestamp).toBe('number');
      expect(timestamp!).toBeGreaterThan(0);
    });

    it('should return null for invalid ID', () => {
      expect(extractTimestamp('invalid-id')).toBeNull();
      expect(extractTimestamp('')).toBeNull();
    });

    it('should extract correct timestamp value', () => {
      const knownTimestamp = 1704067200000;
      const id = `inv-${knownTimestamp}-a8f3d9c2`;

      const extracted = extractTimestamp(id);
      expect(extracted).toBe(knownTimestamp);
    });

    it('should return null for malformed timestamp', () => {
      const id = 'inv-not-a-number-a8f3d9c2';
      expect(extractTimestamp(id)).toBeNull();
    });
  });
});
