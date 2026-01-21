import { Request } from 'express';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'array' | 'object' | 'date' | 'uuid';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enumValues?: any[];
  customValidator?: (value: any) => boolean | string;
  nested?: ValidationRule[]; // For object/array validation
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  sanitizedData?: any;
}

/**
 * Validate request body against schema
 */
export function validateRequestBody(
  req: Request,
  rules: ValidationRule[]
): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];
  const sanitizedData: any = {};

  try {
    const data = req.body || {};

    for (const rule of rules) {
      const value = getNestedValue(data, rule.field);
      const validationResult = validateField(rule.field, value, rule);

      if (validationResult.errors.length > 0) {
        errors.push(...validationResult.errors);
      } else if (validationResult.sanitizedValue !== undefined) {
        setNestedValue(sanitizedData, rule.field, validationResult.sanitizedValue);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };

  } catch (error) {
    console.error('Request validation failed:', error);
    return {
      isValid: false,
      errors: [{ field: 'general', message: 'Request validation failed' }]
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  req: Request,
  rules: ValidationRule[]
): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];
  const sanitizedData: any = {};

  try {
    const data = req.query || {};

    for (const rule of rules) {
      const value = data[rule.field];
      const validationResult = validateField(rule.field, value, rule);

      if (validationResult.errors.length > 0) {
        errors.push(...validationResult.errors);
      } else if (validationResult.sanitizedValue !== undefined) {
        sanitizedData[rule.field] = validationResult.sanitizedValue;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };

  } catch (error) {
    console.error('Query parameter validation failed:', error);
    return {
      isValid: false,
      errors: [{ field: 'general', message: 'Query parameter validation failed' }]
    };
  }
}

/**
 * Validate individual field
 */
function validateField(
  fieldName: string,
  value: any,
  rule: ValidationRule
): { errors: Array<{ field: string; message: string }>; sanitizedValue?: any } {
  const errors: Array<{ field: string; message: string }> = [];

  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    errors.push({ field: fieldName, message: `${fieldName} is required` });
    return { errors };
  }

  // If not required and value is empty, skip validation
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return { errors };
  }

  let sanitizedValue = value;

  // Type validation and sanitization
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push({ field: fieldName, message: `${fieldName} must be a string` });
        break;
      }
      sanitizedValue = value.trim();

      if (rule.minLength && sanitizedValue.length < rule.minLength) {
        errors.push({ field: fieldName, message: `${fieldName} must be at least ${rule.minLength} characters long` });
      }

      if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
        errors.push({ field: fieldName, message: `${fieldName} must be no more than ${rule.maxLength} characters long` });
      }

      if (rule.pattern && !rule.pattern.test(sanitizedValue)) {
        errors.push({ field: fieldName, message: `${fieldName} format is invalid` });
      }

      break;

    case 'number':
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue) || typeof numValue !== 'number') {
        errors.push({ field: fieldName, message: `${fieldName} must be a valid number` });
        break;
      }
      sanitizedValue = numValue;

      if (rule.min !== undefined && numValue < rule.min) {
        errors.push({ field: fieldName, message: `${fieldName} must be at least ${rule.min}` });
      }

      if (rule.max !== undefined && numValue > rule.max) {
        errors.push({ field: fieldName, message: `${fieldName} must be no more than ${rule.max}` });
      }

      break;

    case 'boolean':
      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') sanitizedValue = true;
        else if (value.toLowerCase() === 'false') sanitizedValue = false;
        else {
          errors.push({ field: fieldName, message: `${fieldName} must be true or false` });
          break;
        }
      } else if (typeof value !== 'boolean') {
        errors.push({ field: fieldName, message: `${fieldName} must be a boolean` });
      }
      break;

    case 'email':
      if (typeof value !== 'string') {
        errors.push({ field: fieldName, message: `${fieldName} must be a string` });
        break;
      }
      sanitizedValue = value.trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedValue)) {
        errors.push({ field: fieldName, message: `${fieldName} must be a valid email address` });
      }
      break;

    case 'url':
      if (typeof value !== 'string') {
        errors.push({ field: fieldName, message: `${fieldName} must be a string` });
        break;
      }
      try {
        new URL(value);
        sanitizedValue = value.trim();
      } catch {
        errors.push({ field: fieldName, message: `${fieldName} must be a valid URL` });
      }
      break;

    case 'date':
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({ field: fieldName, message: `${fieldName} must be a valid date` });
        } else {
          sanitizedValue = date.toISOString();
        }
      } else if (!(value instanceof Date)) {
        errors.push({ field: fieldName, message: `${fieldName} must be a valid date` });
      }
      break;

    case 'uuid':
      if (typeof value !== 'string') {
        errors.push({ field: fieldName, message: `${fieldName} must be a string` });
        break;
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be a valid UUID` });
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be an array` });
        break;
      }

      if (rule.minLength && value.length < rule.minLength) {
        errors.push({ field: fieldName, message: `${fieldName} must contain at least ${rule.minLength} items` });
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({ field: fieldName, message: `${fieldName} must contain no more than ${rule.maxLength} items` });
      }

      // Validate array items if nested rules provided
      if (rule.nested && rule.nested.length > 0) {
        sanitizedValue = [];
        for (let i = 0; i < value.length; i++) {
          const itemErrors: Array<{ field: string; message: string }> = [];
          const sanitizedItem: any = {};

          for (const nestedRule of rule.nested) {
            const itemValue = value[i][nestedRule.field];
            const itemValidation = validateField(`${fieldName}[${i}].${nestedRule.field}`, itemValue, nestedRule);

            if (itemValidation.errors.length > 0) {
              itemErrors.push(...itemValidation.errors);
            } else if (itemValidation.sanitizedValue !== undefined) {
              sanitizedItem[nestedRule.field] = itemValidation.sanitizedValue;
            }
          }

          if (itemErrors.length > 0) {
            errors.push(...itemErrors);
          } else {
            sanitizedValue.push(sanitizedItem);
          }
        }
      }

      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({ field: fieldName, message: `${fieldName} must be an object` });
        break;
      }

      // Validate object properties if nested rules provided
      if (rule.nested && rule.nested.length > 0) {
        sanitizedValue = {};

        for (const nestedRule of rule.nested) {
          const nestedValue = value[nestedRule.field];
          const nestedValidation = validateField(`${fieldName}.${nestedRule.field}`, nestedValue, nestedRule);

          if (nestedValidation.errors.length > 0) {
            errors.push(...nestedValidation.errors);
          } else if (nestedValidation.sanitizedValue !== undefined) {
            sanitizedValue[nestedRule.field] = nestedValidation.sanitizedValue;
          }
        }
      }

      break;
  }

  // Enum validation
  if (rule.enumValues && !rule.enumValues.includes(sanitizedValue)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be one of: ${rule.enumValues.join(', ')}`
    });
  }

  // Custom validation
  if (rule.customValidator && errors.length === 0) {
    const customResult = rule.customValidator(sanitizedValue);
    if (customResult !== true) {
      const message = typeof customResult === 'string' ? customResult : `${fieldName} failed custom validation`;
      errors.push({ field: fieldName, message });
    }
  }

  return { errors, sanitizedValue: errors.length === 0 ? sanitizedValue : undefined };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;

  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);

  target[lastKey] = value;
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: any,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
    required?: boolean;
  } = {}
): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  if (!file) {
    if (options.required) {
      errors.push({ field: 'file', message: 'File is required' });
    }
    return { isValid: false, errors };
  }

  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    const maxSizeMB = Math.round(options.maxSize / (1024 * 1024));
    errors.push({
      field: 'file',
      message: `File size must not exceed ${maxSizeMB}MB`
    });
  }

  // Check MIME type
  if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
    errors.push({
      field: 'file',
      message: `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
    });
  }

  // Check file extension
  if (options.allowedExtensions) {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !options.allowedExtensions.includes(extension)) {
      errors.push({
        field: 'file',
        message: `File extension not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? file : undefined
  };
}

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  // CV Upload validation
  cvUpload: [
    { field: 'features', type: 'object' as const, required: true },
    { field: 'targetRole', type: 'string' as const, maxLength: 100 },
    { field: 'targetCompany', type: 'string' as const, maxLength: 100 }
  ],

  // Profile creation validation
  profileCreate: [
    { field: 'cvId', type: 'string' as const, required: true, minLength: 10 },
    {
      field: 'settings',
      type: 'object' as const,
      nested: [
        { field: 'isPublic', type: 'boolean' as const },
        { field: 'allowContact', type: 'boolean' as const },
        { field: 'passwordProtected', type: 'boolean' as const }
      ]
    },
    {
      field: 'customizations',
      type: 'object' as const,
      nested: [
        {
          field: 'theme',
          type: 'string' as const,
          enumValues: ['professional', 'modern', 'creative', 'minimal']
        }
      ]
    }
  ],

  // Contact form validation
  contactForm: [
    { field: 'senderName', type: 'string' as const, required: true, minLength: 2, maxLength: 100 },
    { field: 'senderEmail', type: 'email' as const, required: true },
    { field: 'senderCompany', type: 'string' as const, maxLength: 100 },
    { field: 'subject', type: 'string' as const, required: true, minLength: 5, maxLength: 200 },
    { field: 'message', type: 'string' as const, required: true, minLength: 10, maxLength: 5000 },
    {
      field: 'inquiryType',
      type: 'string' as const,
      enumValues: ['job_opportunity', 'collaboration', 'networking', 'general']
    }
  ],

  // Analytics query validation
  analyticsQuery: [
    {
      field: 'period',
      type: 'string' as const,
      enumValues: ['last_24_hours', 'last_7_days', 'last_30_days', 'last_90_days', 'all_time']
    },
    { field: 'startDate', type: 'date' as const },
    { field: 'endDate', type: 'date' as const },
    { field: 'includeRawEvents', type: 'boolean' as const },
    { field: 'limit', type: 'number' as const, min: 1, max: 1000 }
  ]
};

/**
 * Sanitize HTML content (basic XSS prevention)
 */
export function sanitizeHtml(content: string): string {
  if (typeof content !== 'string') return '';

  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize user input
 */
export function sanitizeUserInput(
  input: any,
  options: {
    allowHtml?: boolean;
    maxLength?: number;
    stripWhitespace?: boolean;
  } = {}
): string {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  // Strip whitespace if requested
  if (options.stripWhitespace) {
    sanitized = sanitized.trim();
  }

  // Truncate if too long
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Sanitize HTML if not allowed
  if (!options.allowHtml) {
    sanitized = sanitizeHtml(sanitized);
  }

  return sanitized;
}