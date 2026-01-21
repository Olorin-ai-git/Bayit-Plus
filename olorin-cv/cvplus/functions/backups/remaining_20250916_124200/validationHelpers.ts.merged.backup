// @ts-ignore - Export conflicts/**
 * Validation helper functions for the CVPlus Workflow module
 */

import { Job, JobStatus } from '../types/Job';
import { Feature, FeatureStatus } from '../types/Feature';
import { CVTemplate, PlaceholderValue } from '../types/Template';
import { CertificationBadge, BadgeType } from '../types/Certification';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validate job data
 */
export const validateJob = (job: Partial<Job>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!job.userId) {
    errors.push('User ID is required');
  }
  
  if (!job.title || job.title.trim().length === 0) {
    errors.push('Job title is required');
  } else if (job.title.length > 200) {
    errors.push('Job title must be less than 200 characters');
  }

  // Optional but validated fields
  if (job.description && job.description.length > 1000) {
    errors.push('Job description must be less than 1000 characters');
  }

  if (job.priority && !['low', 'medium', 'high'].includes(job.priority)) {
    errors.push('Priority must be low, medium, or high');
  }

  if (job.features) {
    if (!Array.isArray(job.features)) {
      errors.push('Features must be an array');
    } else if (job.features.length === 0) {
      warnings.push('Job has no features');
    } else if (job.features.length > 50) {
      errors.push('Job cannot have more than 50 features');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Validate feature data
 */
export const validateFeature = (feature: Partial<Feature>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!feature.name || feature.name.trim().length === 0) {
    errors.push('Feature name is required');
  } else if (feature.name.length > 100) {
    errors.push('Feature name must be less than 100 characters');
  }

  if (!feature.category) {
    errors.push('Feature category is required');
  }

  if (!feature.priority || !['low', 'medium', 'high'].includes(feature.priority)) {
    errors.push('Feature priority must be low, medium, or high');
  }

  // Optional but validated fields
  if (feature.description && feature.description.length > 500) {
    errors.push('Feature description must be less than 500 characters');
  }

  if (feature.estimatedDuration !== undefined) {
    if (typeof feature.estimatedDuration !== 'number' || feature.estimatedDuration < 0) {
      errors.push('Estimated duration must be a positive number');
    } else if (feature.estimatedDuration > 480) {
      warnings.push('Feature estimated duration is very long (over 8 hours)');
    }
  }

  if (feature.dependencies) {
    if (!Array.isArray(feature.dependencies)) {
      errors.push('Dependencies must be an array');
    } else if (feature.dependencies.length > 10) {
      warnings.push('Feature has many dependencies - consider breaking it down');
    }
  }

  if (feature.progress !== undefined) {
    if (typeof feature.progress !== 'number' || feature.progress < 0 || feature.progress > 100) {
      errors.push('Progress must be a number between 0 and 100');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Validate template data
 */
export const validateTemplate = (template: Partial<CVTemplate>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!template.name || template.name.trim().length === 0) {
    errors.push('Template name is required');
  } else if (template.name.length > 100) {
    errors.push('Template name must be less than 100 characters');
  }

  if (!template.category) {
    errors.push('Template category is required');
  }

  // Optional but validated fields
  if (template.description && template.description.length > 1000) {
    errors.push('Template description must be less than 1000 characters');
  }

  if (template.tags && !Array.isArray(template.tags)) {
    errors.push('Tags must be an array');
  }

  if (template.thumbnailUrl && !isValidUrl(template.thumbnailUrl)) {
    errors.push('Thumbnail URL must be a valid URL');
  }

  if (template.previewUrl && !isValidUrl(template.previewUrl)) {
    errors.push('Preview URL must be a valid URL');
  }

  if (template.templateUrl && !isValidUrl(template.templateUrl)) {
    errors.push('Template URL must be a valid URL');
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Validate placeholder value
 */
export const validatePlaceholderValue = (
  value: any, 
  expectedType: string, 
  validation?: any
): ValidationResult => {
  const errors: string[] = [];

  // Type validation
  switch (expectedType) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push('Value must be a string');
      } else {
        if (validation?.minLength && value.length < validation.minLength) {
          errors.push(`Value must be at least ${validation.minLength} characters long`);
        }
        if (validation?.maxLength && value.length > validation.maxLength) {
          errors.push(`Value must be no more than ${validation.maxLength} characters long`);
        }
        if (validation?.pattern && !new RegExp(validation.pattern).test(value)) {
          errors.push('Value does not match required format');
        }
      }
      break;
    
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push('Value must be a number');
      } else {
        if (validation?.min !== undefined && value < validation.min) {
          errors.push(`Value must be at least ${validation.min}`);
        }
        if (validation?.max !== undefined && value > validation.max) {
          errors.push(`Value must be no more than ${validation.max}`);
        }
      }
      break;
    
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push('Value must be true or false');
      }
      break;
    
    case 'date':
      if (!(value instanceof Date) && !isValidDateString(value)) {
        errors.push('Value must be a valid date');
      }
      break;
    
    case 'array':
      if (!Array.isArray(value)) {
        errors.push('Value must be an array');
      }
      break;
    
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push('Value must be an object');
      }
      break;
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate certification badge
 */
export const validateCertificationBadge = (badge: Partial<CertificationBadge>): ValidationResult => {
  const errors: string[] = [];

  // Required fields
  if (!badge.userId) {
    errors.push('User ID is required');
  }

  if (!badge.badgeType) {
    errors.push('Badge type is required');
  }

  if (!badge.name || badge.name.trim().length === 0) {
    errors.push('Badge name is required');
  } else if (badge.name.length > 100) {
    errors.push('Badge name must be less than 100 characters');
  }

  // Optional but validated fields
  if (badge.description && badge.description.length > 500) {
    errors.push('Badge description must be less than 500 characters');
  }

  if (badge.verificationCode && badge.verificationCode.length < 8) {
    errors.push('Verification code must be at least 8 characters');
  }

  if (badge.verificationUrl && !isValidUrl(badge.verificationUrl)) {
    errors.push('Verification URL must be a valid URL');
  }

  if (badge.expiresAt && badge.issuedAt) {
    if (new Date(badge.expiresAt) <= new Date(badge.issuedAt)) {
      errors.push('Expiration date must be after issued date');
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate date string
 */
export const isValidDateString = (dateString: any): boolean => {
  if (typeof dateString !== 'string') return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Validate UUID format
 */
export const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string, maxLength?: number): string => {
  let sanitized = input.trim();
  
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Truncate if necessary
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }
  
  return sanitized;
};

/**
 * Validate batch operation size
 */
export const validateBatchSize = (items: any[], maxSize: number = 100): ValidationResult => {
  const errors: string[] = [];

  if (!Array.isArray(items)) {
    errors.push('Items must be an array');
  } else if (items.length === 0) {
    errors.push('At least one item is required');
  } else if (items.length > maxSize) {
    errors.push(`Batch size cannot exceed ${maxSize} items`);
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (page?: number, limit?: number): ValidationResult => {
  const errors: string[] = [];

  if (page !== undefined) {
    if (typeof page !== 'number' || page < 1) {
      errors.push('Page must be a positive number');
    }
  }

  if (limit !== undefined) {
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      errors.push('Limit must be a number between 1 and 100');
    }
  }

  return { valid: errors.length === 0, errors };
};