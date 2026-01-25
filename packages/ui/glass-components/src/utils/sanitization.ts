/**
 * Sanitization Utilities
 * XSS prevention and input sanitization for notifications
 */

const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b\d{16}\b/g, // Credit card
  /\b[A-Za-z0-9]{32,}\b/g, // Tokens
];

/**
 * Sanitize message text - strip all HTML tags and dangerous content
 */
export const sanitizeMessage = (message: string): string => {
  if (typeof message !== 'string') {
    return String(message);
  }

  // Remove script tags and their content (XSS prevention)
  let sanitized = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove all remaining HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove common XSS patterns
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers

  // Normalize whitespace
  return sanitized
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500); // Max length 500 chars
};

/**
 * Detect sensitive data in text
 */
export const detectSensitiveData = (text: string): boolean => {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
};

/**
 * Sanitize for TTS (remove special chars, limit length)
 */
export const sanitizeForTTS = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML/SSML tags
    .replace(/[^\w\s.,!?-]/g, '') // Remove special chars
    .substring(0, 280); // Max 280 chars for TTS
};

/**
 * Validate notification action
 */
export const validateAction = (action: any): boolean => {
  if (!action || typeof action !== 'object') {
    return false;
  }

  const allowedTypes = ['navigate', 'retry', 'dismiss'];
  if (!allowedTypes.includes(action.type)) {
    return false;
  }

  if (typeof action.label !== 'string' || action.label.length > 50) {
    return false;
  }

  if (typeof action.onPress !== 'function') {
    return false;
  }

  return true;
};
