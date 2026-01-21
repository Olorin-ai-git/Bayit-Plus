/**
 * Text Validation Module
 *
 * Handles text validation, sanitization, and security checks.
 * Extracted from validation.service.ts for better modularity.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

import * as validator from 'validator';
import { ValidationResult, ValidationError, ValidationErrorCode } from './types';

export class TextValidator {
  // HTML sanitize options for future use
  // private readonly htmlSanitizeOptions = {
  //   allowedTags: ['b', 'i', 'em', 'strong', 'br', 'p'],
  //   allowedAttributes: {},
  //   disallowedTagsMode: 'discard'
  // };

  private readonly forbiddenPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /file:/gi,
    /document\.cookie/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi
  ];

  /**
   * Validates and sanitizes text input
    */
  validateText(text: string, fieldName: string, maxLength: number): ValidationResult {
    const errors: ValidationError[] = [];

    if (!text || typeof text !== 'string') {
      errors.push({ name: 'TextValidationError',
        field: fieldName,
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: `${fieldName} is required and must be a string`,
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    // Length validation
    if (text.length > maxLength) {
      errors.push({ name: 'TextValidationError',
        field: fieldName,
        code: ValidationErrorCode.TOO_LONG,
        message: `${fieldName} exceeds maximum length of ${maxLength} characters`,
        severity: 'error'
      });
    }

    // Security validation
    if (this.containsDangerousPatterns(text)) {
      errors.push({ name: 'SecurityValidationError',
        field: fieldName,
        code: ValidationErrorCode.DANGEROUS_CONTENT,
        message: `${fieldName} contains potentially dangerous content`,
        severity: 'error'
      });
    }

    // Sanitize text
    const sanitizedText = this.sanitizeText(text);

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: sanitizedText
    };
  }

  /**
   * Validates email format
    */
  validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!email || typeof email !== 'string') {
      errors.push({ name: 'ValidationError',
        field: 'email',
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: 'Email is required',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    // Basic format validation
    if (!validator.isEmail(email)) {
      errors.push({ name: 'ValidationError',
        field: 'email',
        code: ValidationErrorCode.INVALID_EMAIL,
        message: 'Invalid email format',
        severity: 'error'
      });
    }

    // Length validation
    if (email.length > 254) {
      errors.push({ name: 'ValidationError',
        field: 'email',
        code: ValidationErrorCode.TOO_LONG,
        message: 'Email address is too long',
        severity: 'error'
      });
    }

    // Domain validation
    const domain = email.split('@')[1];
    if (domain && domain.length > 253) {
      errors.push({ name: 'ValidationError',
        field: 'email',
        code: ValidationErrorCode.INVALID_FORMAT,
        message: 'Email domain is too long',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: email.toLowerCase().trim()
    };
  }

  /**
   * Validates phone number format
    */
  validatePhone(phone: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!phone || typeof phone !== 'string') {
      return { isValid: true, errors: [] }; // Phone is optional
    }

    // Remove common formatting characters
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

    // Basic format validation
    if (!validator.isMobilePhone(cleanPhone, 'any', { strictMode: false })) {
      errors.push({ name: 'ValidationError',
        field: 'phone',
        code: ValidationErrorCode.INVALID_PHONE,
        message: 'Invalid phone number format',
        severity: 'warning'
      });
    }

    // Length validation
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      errors.push({ name: 'ValidationError',
        field: 'phone',
        code: ValidationErrorCode.INVALID_FORMAT,
        message: 'Phone number should be between 7 and 15 digits',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData: cleanPhone
    };
  }

  /**
   * Validates URL format
    */
  validateUrl(url: string, fieldName: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!url || typeof url !== 'string') {
      return { isValid: true, errors: [] }; // URLs are typically optional
    }

    // Basic URL validation
    if (!validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_host: true,
      require_valid_protocol: true,
      allow_underscores: false,
      host_whitelist: [] as (string | RegExp)[],
      host_blacklist: [] as (string | RegExp)[],
      allow_trailing_dot: false,
      allow_protocol_relative_urls: false
    })) {
      errors.push({ name: 'ValidationError',
        field: fieldName,
        code: ValidationErrorCode.INVALID_URL,
        message: `Invalid URL format for ${fieldName}`,
        severity: 'error'
      });
    }

    // Check for forbidden patterns
    const forbiddenPatterns = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'ftp:'
    ];

    const lowerUrl = url.toLowerCase();
    for (const pattern of forbiddenPatterns) {
      if (lowerUrl.includes(pattern)) {
        errors.push({ name: 'ValidationError',
          field: fieldName,
          code: ValidationErrorCode.DANGEROUS_CONTENT,
          message: `URL contains forbidden protocol: ${pattern}`,
          severity: 'error'
        });
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: url.trim()
    };
  }

  /**
   * Validates date format
    */
  validateDate(date: string, fieldName: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!date || typeof date !== 'string') {
      return { isValid: true, errors: [] }; // Dates may be optional
    }

    // Try to parse the date
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      errors.push({ name: 'ValidationError',
        field: fieldName,
        code: ValidationErrorCode.INVALID_DATE,
        message: `Invalid date format for ${fieldName}`,
        severity: 'error'
      });
    } else {
      // Check for reasonable date ranges
      const currentYear = new Date().getFullYear();
      const year = parsedDate.getFullYear();

      if (year < 1900 || year > currentYear + 10) {
        errors.push({ name: 'ValidationError',
          field: fieldName,
          code: ValidationErrorCode.OUT_OF_RANGE,
          message: `Date year should be between 1900 and ${currentYear + 10}`,
          severity: 'warning'
        });
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData: date.trim()
    };
  }

  private sanitizeText(text: string): string {
    // Remove dangerous patterns
    let sanitized = text;

    for (const pattern of this.forbiddenPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Basic HTML entity encoding for common dangerous characters
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized.trim();
  }

  private containsDangerousPatterns(text: string): boolean {
    return this.forbiddenPatterns.some(pattern => pattern.test(text));
  }
}