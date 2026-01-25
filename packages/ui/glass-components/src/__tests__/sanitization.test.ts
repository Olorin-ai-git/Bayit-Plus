/**
 * Sanitization Tests
 */

import {
  sanitizeMessage,
  detectSensitiveData,
  sanitizeForTTS,
  validateAction,
} from '../utils/sanitization';

describe('sanitization', () => {
  describe('sanitizeMessage', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeMessage('<script>alert("xss")</script>Hello');
      expect(result).toBe('Hello');
    });

    it('should normalize whitespace', () => {
      const result = sanitizeMessage('Hello    \n\n   World');
      expect(result).toBe('Hello World');
    });

    it('should truncate to 500 characters', () => {
      const longMessage = 'a'.repeat(600);
      const result = sanitizeMessage(longMessage);
      expect(result.length).toBe(500);
    });

    it('should handle non-string input', () => {
      const result = sanitizeMessage(123 as any);
      expect(result).toBe('123');
    });
  });

  describe('detectSensitiveData', () => {
    it('should detect SSN', () => {
      expect(detectSensitiveData('My SSN is 123-45-6789')).toBe(true);
    });

    it('should detect credit card numbers', () => {
      expect(detectSensitiveData('Card: 1234567890123456')).toBe(true);
    });

    it('should detect long tokens', () => {
      const token = 'a'.repeat(40);
      expect(detectSensitiveData(`Token: ${token}`)).toBe(true);
    });

    it('should not detect normal text', () => {
      expect(detectSensitiveData('This is a normal message')).toBe(false);
    });
  });

  describe('sanitizeForTTS', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeForTTS('<b>Bold</b> text');
      expect(result).toBe('Bold text');
    });

    it('should remove special characters', () => {
      const result = sanitizeForTTS('Hello @#$% World');
      expect(result).toBe('Hello  World');
    });

    it('should preserve allowed punctuation', () => {
      const result = sanitizeForTTS('Hello, World! How are you?');
      expect(result).toBe('Hello, World! How are you?');
    });

    it('should truncate to 280 characters', () => {
      const longText = 'a'.repeat(300);
      const result = sanitizeForTTS(longText);
      expect(result.length).toBe(280);
    });
  });

  describe('validateAction', () => {
    it('should validate correct action', () => {
      const action = {
        label: 'Retry',
        type: 'retry',
        onPress: () => {},
      };
      expect(validateAction(action)).toBe(true);
    });

    it('should reject invalid action type', () => {
      const action = {
        label: 'Invalid',
        type: 'invalid',
        onPress: () => {},
      };
      expect(validateAction(action)).toBe(false);
    });

    it('should reject missing onPress', () => {
      const action = {
        label: 'Test',
        type: 'dismiss',
      };
      expect(validateAction(action)).toBe(false);
    });

    it('should reject overly long label', () => {
      const action = {
        label: 'a'.repeat(60),
        type: 'dismiss',
        onPress: () => {},
      };
      expect(validateAction(action)).toBe(false);
    });

    it('should accept all allowed types', () => {
      ['navigate', 'retry', 'dismiss'].forEach((type) => {
        const action = { label: 'Test', type, onPress: () => {} };
        expect(validateAction(action)).toBe(true);
      });
    });
  });
});
