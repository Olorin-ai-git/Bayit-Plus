/**
 * Security Test Suite
 * Comprehensive tests for all security measures
 */

import { validateVideoUrl, sanitizeTextInput, validateEmail, sanitizeHTML } from '../utils/security';

describe('Security - URL Validation', () => {
  it('should block javascript: protocol', () => {
    expect(() => validateVideoUrl('javascript:alert(1)')).toThrow();
  });

  it('should block case-sensitivity bypass', () => {
    expect(() => validateVideoUrl('JaVaScRiPt:alert(1)')).toThrow();
  });

  it('should block URL-encoded bypass', () => {
    expect(() => validateVideoUrl('%6A%61%76%61%73%63%72%69%70%74:alert(1)')).toThrow();
  });

  it('should block data: URLs', () => {
    expect(() => validateVideoUrl('data:text/html,<script>alert(1)</script>')).toThrow();
  });

  it('should block protocol-relative URLs', () => {
    expect(() => validateVideoUrl('//evil.com/video.mp4')).toThrow();
  });

  it('should block vbscript: protocol', () => {
    expect(() => validateVideoUrl('vbscript:msgbox("XSS")')).toThrow();
  });

  it('should block file: protocol', () => {
    expect(() => validateVideoUrl('file:///etc/passwd')).toThrow();
  });

  it('should reject URLs exceeding max length', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(3000);
    expect(() => validateVideoUrl(longUrl)).toThrow('URL too long');
  });

  it('should accept valid HTTPS URLs in development', () => {
    process.env.NODE_ENV = 'development';
    expect(validateVideoUrl('https://example.com/video.mp4')).toBe('https://example.com/video.mp4');
  });

  it('should accept valid HTTP URLs in development only', () => {
    process.env.NODE_ENV = 'development';
    expect(validateVideoUrl('http://localhost:3000/video.mp4')).toBe('http://localhost:3000/video.mp4');
  });
});

describe('Security - Input Sanitization', () => {
  it('should sanitize HTML tags', () => {
    const result = sanitizeTextInput('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
  });

  it('should remove angle brackets', () => {
    const result = sanitizeTextInput('Hello <World>');
    expect(result).toBe('Hello World');
  });

  it('should trim whitespace', () => {
    const result = sanitizeTextInput('  Hello World  ');
    expect(result).toBe('Hello World');
  });

  it('should limit length to 1000 characters', () => {
    const longInput = 'a'.repeat(2000);
    const result = sanitizeTextInput(longInput);
    expect(result.length).toBe(1000);
  });

  it('should sanitize all HTML with DOMPurify', () => {
    const result = sanitizeHTML('<img src=x onerror=alert(1)>');
    expect(result).toBe('');
  });

  it('should strip all tags from HTML', () => {
    const result = sanitizeHTML('<b>Bold</b> <i>Italic</i>');
    expect(result).toBe('Bold Italic');
  });
});

describe('Security - Email Validation', () => {
  it('should validate correct email format', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('should reject invalid email format', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
  });

  it('should reject emails with script tags', () => {
    expect(validateEmail('<script>@test.com')).toBe(false);
    expect(validateEmail('test<script>@example.com')).toBe(false);
  });

  it('should reject emails with javascript: protocol', () => {
    expect(validateEmail('javascript:alert@test.com')).toBe(false);
  });

  it('should reject emails with data: protocol', () => {
    expect(validateEmail('data:text@test.com')).toBe(false);
  });

  it('should reject emails with angle brackets', () => {
    expect(validateEmail('test<>@example.com')).toBe(false);
  });
});
