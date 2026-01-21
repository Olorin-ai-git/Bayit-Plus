/**
 * T007: PII redaction test in packages/core/src/logging/__tests__/pii-redaction.test.ts
 * CRITICAL: This test MUST FAIL before implementation
  */

import { PiiRedaction } from '../PiiRedaction';

describe('PiiRedaction', () => {
  describe('redactString', () => {
    it('should redact email addresses', () => {
      const text = 'User email is john.doe@example.com and admin@test.org';
      const result = PiiRedaction.redactString(text);

      expect(result).toBe('User email is [EMAIL_REDACTED] and [EMAIL_REDACTED]');
    });

    it('should redact phone numbers', () => {
      const text = 'Contact at +1-555-123-4567 or (555) 987-6543';
      const result = PiiRedaction.redactString(text);

      expect(result).toBe('Contact at [PHONE_REDACTED] or [PHONE_REDACTED]');
    });

    it('should redact credit card numbers', () => {
      const text = 'Card number is 4111111111111111 and 5555-4444-3333-2222';
      const result = PiiRedaction.redactString(text);

      expect(result).toBe('Card number is [CARD_REDACTED] and [CARD_REDACTED]');
    });

    it('should redact social security numbers', () => {
      const text = 'SSN: 123-45-6789 or 987654321';
      const result = PiiRedaction.redactString(text);

      expect(result).toBe('SSN: [SSN_REDACTED] or [SSN_REDACTED]');
    });

    it('should redact IP addresses', () => {
      const text = 'From IP 192.168.1.1 and 2001:0db8:85a3::8a2e:0370:7334';
      const result = PiiRedaction.redactString(text);

      expect(result).toBe('From IP [IP_REDACTED] and [IP_REDACTED]');
    });

    it('should redact custom patterns', () => {
      const customPatterns = {
        customId: /CUST-\\d{6}/g
      };
      const text = 'Customer ID is CUST-123456';
      const result = PiiRedaction.redactString(text, customPatterns);

      expect(result).toBe('Customer ID is [CUSTOMID_REDACTED]');
    });

    it('should return original string if no PII found', () => {
      const text = 'This is a clean log message with no PII';
      const result = PiiRedaction.redactString(text);

      expect(result).toBe(text);
    });
  });

  describe('redactObject', () => {
    it('should redact PII in nested objects', () => {
      const obj = {
        user: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          profile: {
            phone: '555-123-4567',
            address: '123 Main St'
          }
        },
        metadata: {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0...'
        }
      };

      const result = PiiRedaction.redactObject(obj);

      expect(result.user.email).toBe('[EMAIL_REDACTED]');
      expect(result.user.profile.phone).toBe('[PHONE_REDACTED]');
      expect(result.metadata.ip).toBe('[IP_REDACTED]');
      expect(result.user.name).toBe('John Doe'); // Non-PII preserved
      expect(result.metadata.userAgent).toBe('Mozilla/5.0...'); // Non-PII preserved
    });

    it('should redact PII in arrays', () => {
      const obj = {
        contacts: ['john@example.com', 'jane@test.org'],
        phones: ['+1-555-1234', '555-9876']
      };

      const result = PiiRedaction.redactObject(obj);

      expect(result.contacts).toEqual(['[EMAIL_REDACTED]', '[EMAIL_REDACTED]']);
      expect(result.phones).toEqual(['[PHONE_REDACTED]', '[PHONE_REDACTED]']);
    });

    it('should handle null and undefined values', () => {
      const obj = {
        email: null,
        phone: undefined,
        name: 'John Doe'
      };

      const result = PiiRedaction.redactObject(obj);

      expect(result.email).toBeNull();
      expect(result.phone).toBeUndefined();
      expect(result.name).toBe('John Doe');
    });

    it('should not modify original object', () => {
      const original = {
        email: 'test@example.com',
        data: { phone: '555-1234' }
      };
      const originalCopy = JSON.parse(JSON.stringify(original));

      PiiRedaction.redactObject(original);

      expect(original).toEqual(originalCopy);
    });
  });

  describe('redactLogEntry', () => {
    it('should redact PII in log entry message', () => {
      const logEntry = {
        timestamp: '2023-12-01T10:00:00Z',
        level: 'info',
        message: 'User john.doe@example.com logged in from 192.168.1.1',
        meta: {
          userId: '12345'
        }
      };

      const result = PiiRedaction.redactLogEntry(logEntry);

      expect(result.message).toBe('User [EMAIL_REDACTED] logged in from [IP_REDACTED]');
      expect(result.meta.userId).toBe('12345');
      expect(result.timestamp).toBe(logEntry.timestamp);
    });

    it('should redact PII in meta data', () => {
      const logEntry = {
        timestamp: '2023-12-01T10:00:00Z',
        level: 'info',
        message: 'User registration',
        meta: {
          user: {
            email: 'user@example.com',
            phone: '555-1234'
          },
          context: {
            ip: '10.0.0.1'
          }
        }
      };

      const result = PiiRedaction.redactLogEntry(logEntry);

      expect(result.meta.user.email).toBe('[EMAIL_REDACTED]');
      expect(result.meta.user.phone).toBe('[PHONE_REDACTED]');
      expect(result.meta.context.ip).toBe('[IP_REDACTED]');
    });
  });

  describe('isEnabled', () => {
    it('should return current redaction status', () => {
      const initialStatus = PiiRedaction.isEnabled();
      expect(typeof initialStatus).toBe('boolean');
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable PII redaction', () => {
      PiiRedaction.setEnabled(false);
      expect(PiiRedaction.isEnabled()).toBe(false);

      PiiRedaction.setEnabled(true);
      expect(PiiRedaction.isEnabled()).toBe(true);
    });

    it('should not redact when disabled', () => {
      PiiRedaction.setEnabled(false);

      const text = 'Email: test@example.com';
      const result = PiiRedaction.redactString(text);

      expect(result).toBe(text);

      // Re-enable for other tests
      PiiRedaction.setEnabled(true);
    });
  });
});