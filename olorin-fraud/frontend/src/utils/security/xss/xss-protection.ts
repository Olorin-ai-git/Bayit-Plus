/**
 * XSS Protection
 * Cross-Site Scripting prevention utilities
 * Feature: Client-side security controls
 */

import DOMPurify from 'dompurify';
import type { HTMLSanitizationOptions } from '../types/security-types';
import { getCachedSecurityConfig } from '../config/security-config';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(
  input: string,
  options?: HTMLSanitizationOptions
): string {
  const config = getCachedSecurityConfig();

  if (!config.enableXSSProtection) {
    return input;
  }

  const sanitizeConfig = {
    ALLOWED_TAGS: options?.allowedTags || [
      'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'
    ],
    ALLOWED_ATTR: options?.allowedAttributes || [],
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  };

  return DOMPurify.sanitize(input, sanitizeConfig);
}

/**
 * Sanitize text input to prevent injection attacks
 */
export function sanitizeText(input: string): string {
  const config = getCachedSecurityConfig();

  if (!config.enableXSSProtection) {
    return input;
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/data:/gi, '') // Remove data: protocols
    .replace(/vbscript:/gi, '') // Remove vbscript: protocols
    .trim();
}

/**
 * Validate and sanitize URL to prevent malicious redirects
 */
export function sanitizeURL(url: string): string | null {
  const config = getCachedSecurityConfig();

  try {
    const urlObject = new URL(url);

    // Check if protocol is allowed
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (!allowedProtocols.includes(urlObject.protocol)) {
      console.warn(`Blocked URL with disallowed protocol: ${urlObject.protocol}`);
      return null;
    }

    // Check if domain is in allowed list
    if (config.allowedDomains.length > 0) {
      const isAllowed = config.allowedDomains.some(domain =>
        urlObject.hostname === domain ||
        urlObject.hostname.endsWith(`.${domain}`)
      );

      if (!isAllowed && urlObject.hostname) {
        console.warn(`Blocked URL with disallowed domain: ${urlObject.hostname}`);
        return null;
      }
    }

    return urlObject.toString();
  } catch (error) {
    console.warn(`Invalid URL format: ${url}`);
    return null;
  }
}

/**
 * Check if content contains potentially dangerous patterns
 */
export function containsMaliciousPatterns(input: string): boolean {
  const maliciousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /<iframe[^>]*>/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Remove all HTML tags from input
 */
export function stripHTML(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(input: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return input.replace(/[&<>"']/g, char => escapeMap[char] || char);
}
