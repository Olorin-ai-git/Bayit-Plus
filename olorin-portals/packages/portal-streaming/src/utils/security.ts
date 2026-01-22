/**
 * Security utilities for input validation and sanitization
 */

import DOMPurify from 'dompurify';

const ALLOWED_VIDEO_DOMAINS = [
  'cloudfront.net',
  'storage.googleapis.com',
  'gcs.googleapis.com',
];

const MAX_URL_LENGTH = 2048;

/**
 * Comprehensive video URL validation
 * Protects against XSS, injection attacks, and validates domain whitelist
 */
export const validateVideoUrl = (url: string): string => {
  // Length check (prevent DoS)
  if (url.length > MAX_URL_LENGTH) {
    throw new Error('Invalid video URL: URL too long');
  }

  // Normalize and decode to prevent bypasses
  const normalizedUrl = url.trim().toLowerCase();
  let decodedUrl = normalizedUrl;
  try {
    decodedUrl = decodeURIComponent(normalizedUrl);
  } catch {
    throw new Error('Invalid video URL: Malformed URL encoding');
  }

  // Block dangerous protocols (case-insensitive, decoded)
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (dangerousProtocols.some(proto => decodedUrl.startsWith(proto))) {
    throw new Error('Invalid video URL: Dangerous protocol detected');
  }

  // Block protocol-relative URLs
  if (decodedUrl.startsWith('//')) {
    throw new Error('Invalid video URL: Protocol-relative URLs not allowed');
  }

  // Production: Enforce HTTPS and domain whitelist
  if (process.env.NODE_ENV === 'production') {
    if (!normalizedUrl.startsWith('https://')) {
      throw new Error('Invalid video URL: HTTPS required in production');
    }

    const urlObj = new URL(url);
    const isAllowed = ALLOWED_VIDEO_DOMAINS.some(domain =>
      urlObj.hostname.endsWith(domain)
    );

    if (!isAllowed) {
      throw new Error('Invalid video URL: Domain not in whitelist');
    }
  }

  // Validate URL structure
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid video URL: Malformed URL');
  }

  return url;
};

/**
 * Sanitize HTML input to prevent XSS
 * Strips all HTML tags and attributes
 */
export const sanitizeHTML = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize text input
 * Removes dangerous characters and limits length
 */
export const sanitizeTextInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 1000);
};

/**
 * Validate email address
 * Checks format and blocks suspicious patterns
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;

  const suspiciousPatterns = [/script/i, /<.*>/, /javascript:/i, /data:/i];
  return !suspiciousPatterns.some(pattern => pattern.test(email));
};
