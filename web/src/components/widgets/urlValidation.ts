/**
 * URL Validation Utilities for Widgets
 *
 * Validates URLs against an allowlist of safe domains.
 */

import type { TFunction } from 'i18next';

// Allowlist of safe domains that can be embedded
export const ALLOWED_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'archive.org',
  'www.archive.org',
  'israelfilmarchive.org.il',
  'www.israelfilmarchive.org.il',
  'vimeo.com',
  'player.vimeo.com',
  'dailymotion.com',
  'www.dailymotion.com',
  'kan.org.il',
  'www.kan.org.il',
] as const;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a URL against the allowlist.
 */
export function validateUrl(url: string, t: TFunction): ValidationResult {
  if (!url.trim()) {
    return { valid: false, error: t('widgets.urlRequired', 'Please enter a URL') };
  }

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: t('widgets.invalidProtocol', 'Only HTTP and HTTPS URLs are allowed') };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some((domain) =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return { valid: false, error: t('widgets.domainNotAllowed', 'This domain is not in the allowed list') };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: t('widgets.invalidUrl', 'Invalid URL format') };
  }
}

/**
 * Returns a display-friendly list of allowed domains.
 */
export function getAllowedDomainsDisplay(): string {
  return 'youtube.com, archive.org, israelfilmarchive.org.il, vimeo.com, kan.org.il';
}
