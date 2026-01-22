/**
 * Input Validation Middleware
 * Implements comprehensive input validation and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import * as validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Validation rules interface
 */
export interface ValidationRule {
  field: string;
  location?: 'body' | 'query' | 'params';
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'uuid' | 'date' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  sanitize?: boolean;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  escape?: boolean;
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Sanitize HTML input using DOMPurify
 */
export function sanitizeHtml(html: string, options: any = {}): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: options.allowedTags || ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: options.allowedAttributes || ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ...options,
  }) as unknown as string;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, options: {
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  escape?: boolean;
} = {}): string {
  let sanitized = input;

  if (options.trim) {
    sanitized = sanitized.trim();
  }

  if (options.lowercase) {
    sanitized = sanitized.toLowerCase();
  }

  if (options.uppercase) {
    sanitized = sanitized.toUpperCase();
  }

  if (options.escape) {
    sanitized = validator.default.escape(sanitized);
  }

  return sanitized;
}

/**
 * Validate a single field
 */
function validateField(value: any, rule: ValidationRule): ValidationError | null {
  const { field, type, required, min, max, pattern, custom } = rule;

  // Check required
  if (required && (value === undefined || value === null || value === '')) {
    return { field, message: `${field} is required` };
  }

  // Skip validation if not required and value is empty
  if (!required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Type validation
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { field, message: `${field} must be a string`, value };
      }
      if (min !== undefined && value.length < min) {
        return { field, message: `${field} must be at least ${min} characters`, value };
      }
      if (max !== undefined && value.length > max) {
        return { field, message: `${field} must be at most ${max} characters`, value };
      }
      if (pattern && !pattern.test(value)) {
        return { field, message: `${field} format is invalid`, value };
      }
      break;

    case 'number':
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) {
        return { field, message: `${field} must be a number`, value };
      }
      if (min !== undefined && num < min) {
        return { field, message: `${field} must be at least ${min}`, value };
      }
      if (max !== undefined && num > max) {
        return { field, message: `${field} must be at most ${max}`, value };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return { field, message: `${field} must be a boolean`, value };
      }
      break;

    case 'email':
      if (!validator.default.isEmail(String(value))) {
        return { field, message: `${field} must be a valid email`, value };
      }
      break;

    case 'url':
      if (!validator.default.isURL(String(value))) {
        return { field, message: `${field} must be a valid URL`, value };
      }
      break;

    case 'uuid':
      if (!validator.default.isUUID(String(value))) {
        return { field, message: `${field} must be a valid UUID`, value };
      }
      break;

    case 'date':
      if (!validator.default.isISO8601(String(value))) {
        return { field, message: `${field} must be a valid ISO 8601 date`, value };
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return { field, message: `${field} must be an array`, value };
      }
      if (min !== undefined && value.length < min) {
        return { field, message: `${field} must have at least ${min} items`, value };
      }
      if (max !== undefined && value.length > max) {
        return { field, message: `${field} must have at most ${max} items`, value };
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        return { field, message: `${field} must be an object`, value };
      }
      break;
  }

  // Custom validation
  if (custom) {
    const result = custom(value);
    if (result !== true) {
      return {
        field,
        message: typeof result === 'string' ? result : `${field} validation failed`,
        value,
      };
    }
  }

  return null;
}

/**
 * Validate and sanitize request data
 */
export function validate(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const location = rule.location || 'body';
      const source = req[location] || {};
      let value = source[rule.field];

      // Sanitize if requested
      if (rule.sanitize && typeof value === 'string') {
        value = sanitizeString(value, {
          trim: rule.trim,
          lowercase: rule.lowercase,
          uppercase: rule.uppercase,
          escape: rule.escape,
        });
        // Update the value in request
        source[rule.field] = value;
      }

      // Validate
      const error = validateField(value, rule);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Request validation failed',
        details: errors,
      });
      return;
    }

    next();
  };
}

/**
 * Sanitize all request body fields
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key], { trim: true, escape: true });
      }
    }
  }
  next();
}

/**
 * Prevent SQL injection in query parameters
 */
export function preventSqlInjection(req: Request, res: Response, next: NextFunction): void {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi;

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string' && sqlPattern.test(value)) {
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.query) || checkValue(req.body) || checkValue(req.params)) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Potentially malicious input detected',
    });
    return;
  }

  next();
}

/**
 * Prevent XSS attacks
 */
export function preventXss(req: Request, _res: Response, next: NextFunction): void {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeHtml(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
}

/**
 * Validate file upload
 */
export function validateFileUpload(options: {
  maxSize?: number; // bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  required?: boolean;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const file = (req as any).file;

    if (!file) {
      if (options.required) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'File upload is required',
        });
        return;
      }
      next();
      return;
    }

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      res.status(400).json({
        error: 'Validation Error',
        message: `File size exceeds maximum allowed size of ${options.maxSize} bytes`,
      });
      return;
    }

    // Check MIME type
    if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
      res.status(400).json({
        error: 'Validation Error',
        message: `File type ${file.mimetype} is not allowed`,
        allowedTypes: options.allowedMimeTypes,
      });
      return;
    }

    // Check file extension
    if (options.allowedExtensions) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (!ext || !options.allowedExtensions.includes(ext)) {
        res.status(400).json({
          error: 'Validation Error',
          message: `File extension .${ext} is not allowed`,
          allowedExtensions: options.allowedExtensions,
        });
        return;
      }
    }

    next();
  };
}
