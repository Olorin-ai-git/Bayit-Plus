/**
 * Data Validation Utilities
 * Runtime type validation and data sanitization for investigation entities
 */

import { Investigation, Evidence, Domain, EntityType, InvestigationStatus, InvestigationPhase } from '../types';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedData?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: unknown;
}

// Validation rule interface
export interface ValidationRule<T = any> {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly T[];
  custom?: (value: any, data: any) => ValidationError | null;
  sanitizer?: (value: any) => any;
}

/**
 * Base validator class with common validation logic
 */
export class BaseValidator {
  protected static validateField(
    value: any,
    rule: ValidationRule,
    data: any
  ): { errors: ValidationError[]; warnings: ValidationWarning[]; sanitizedValue: any } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let sanitizedValue = value;

    // Check required fields
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: rule.field,
        message: `${rule.field} is required`,
        code: 'REQUIRED',
        value,
      });
      return { errors, warnings, sanitizedValue };
    }

    // Skip validation for optional empty values
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return { errors, warnings, sanitizedValue };
    }

    // Type validation
    if (rule.type) {
      const typeError = this.validateType(value, rule.type, rule.field);
      if (typeError) {
        errors.push(typeError);
        return { errors, warnings, sanitizedValue };
      }
    }

    // String validations
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at least ${rule.minLength} characters`,
          code: 'MIN_LENGTH',
          value,
        });
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must not exceed ${rule.maxLength} characters`,
          code: 'MAX_LENGTH',
          value,
        });
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field: rule.field,
          message: `${rule.field} format is invalid`,
          code: 'PATTERN',
          value,
        });
      }
    }

    // Number validations
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at least ${rule.min}`,
          code: 'MIN_VALUE',
          value,
        });
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must not exceed ${rule.max}`,
          code: 'MAX_VALUE',
          value,
        });
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field: rule.field,
        message: `${rule.field} must be one of: ${rule.enum.join(', ')}`,
        code: 'ENUM',
        value,
      });
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value, data);
      if (customError) {
        errors.push(customError);
      }
    }

    // Sanitization
    if (rule.sanitizer && errors.length === 0) {
      sanitizedValue = rule.sanitizer(value);
    }

    return { errors, warnings, sanitizedValue };
  }

  private static validateType(value: any, expectedType: string, field: string): ValidationError | null {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field,
            message: `${field} must be a string`,
            code: 'TYPE_ERROR',
            value,
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field,
            message: `${field} must be a valid number`,
            code: 'TYPE_ERROR',
            value,
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field,
            message: `${field} must be a boolean`,
            code: 'TYPE_ERROR',
            value,
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field,
            message: `${field} must be an array`,
            code: 'TYPE_ERROR',
            value,
          };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return {
            field,
            message: `${field} must be an object`,
            code: 'TYPE_ERROR',
            value,
          };
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return {
            field,
            message: `${field} must be a valid date`,
            code: 'TYPE_ERROR',
            value,
          };
        }
        break;
    }

    return null;
  }

  protected static sanitizeString(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  protected static sanitizeEmail(value: string): string {
    return value.toLowerCase().trim();
  }

  protected static sanitizeUrl(value: string): string {
    const url = value.trim();
    if (!/^https?:\/\//i.test(url)) {
      return `https://${url}`;
    }
    return url;
  }
}

/**
 * Investigation validator
 */
export class InvestigationValidator extends BaseValidator {
  private static rules: ValidationRule[] = [
    {
      field: 'id',
      required: true,
      type: 'string',
      pattern: /^[A-Z]{3}-\d+$/,
      sanitizer: (value: string) => value.toUpperCase(),
    },
    {
      field: 'entity.type',
      required: true,
      type: 'string',
      enum: ['ip', 'user', 'transaction', 'device', 'email', 'domain'] as const,
    },
    {
      field: 'entity.value',
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 500,
      sanitizer: BaseValidator.sanitizeString,
      custom: (value: string, data: any) => {
        const entityType = data.entity?.type;

        switch (entityType) {
          case 'email':
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value)) {
              return {
                field: 'entity.value',
                message: 'Invalid email format',
                code: 'INVALID_EMAIL',
                value,
              };
            }
            break;

          case 'ip':
            const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
            const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
            if (!ipv4Pattern.test(value) && !ipv6Pattern.test(value)) {
              return {
                field: 'entity.value',
                message: 'Invalid IP address format',
                code: 'INVALID_IP',
                value,
              };
            }
            break;

          case 'domain':
            const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})+$/;
            if (!domainPattern.test(value)) {
              return {
                field: 'entity.value',
                message: 'Invalid domain format',
                code: 'INVALID_DOMAIN',
                value,
              };
            }
            break;
        }

        return null;
      },
    },
    {
      field: 'time_window.start',
      required: true,
      type: 'date',
    },
    {
      field: 'time_window.end',
      required: true,
      type: 'date',
      custom: (value: string, data: any) => {
        const start = new Date(data.time_window?.start);
        const end = new Date(value);

        if (end <= start) {
          return {
            field: 'time_window.end',
            message: 'End time must be after start time',
            code: 'INVALID_TIME_RANGE',
            value,
          };
        }

        // Check for reasonable time window (not more than 1 year)
        const diffMs = end.getTime() - start.getTime();
        const maxMs = 365 * 24 * 60 * 60 * 1000; // 1 year

        if (diffMs > maxMs) {
          return {
            field: 'time_window.end',
            message: 'Time window cannot exceed 1 year',
            code: 'TIME_WINDOW_TOO_LARGE',
            value,
          };
        }

        return null;
      },
    },
    {
      field: 'status',
      required: true,
      type: 'string',
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] as const,
    },
    {
      field: 'priority',
      required: true,
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'] as const,
    },
    {
      field: 'risk_score',
      required: false,
      type: 'number',
      min: 0,
      max: 1,
    },
    {
      field: 'confidence',
      required: false,
      type: 'number',
      min: 0,
      max: 1,
    },
  ];

  static validate(data: Partial<Investigation>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitizedData: any = { ...data };

    for (const rule of this.rules) {
      const fieldValue = this.getNestedValue(data, rule.field);
      const { errors: fieldErrors, warnings: fieldWarnings, sanitizedValue } = this.validateField(
        fieldValue,
        rule,
        data
      );

      errors.push(...fieldErrors);
      warnings.push(...fieldWarnings);

      if (fieldErrors.length === 0) {
        this.setNestedValue(sanitizedData, rule.field, sanitizedValue);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

/**
 * Evidence validator
 */
export class EvidenceValidator extends BaseValidator {
  private static rules: ValidationRule[] = [
    {
      field: 'id',
      required: true,
      type: 'string',
      minLength: 1,
    },
    {
      field: 'domain',
      required: true,
      type: 'string',
      enum: ['network', 'device', 'location', 'behavioral', 'temporal', 'external'] as const,
    },
    {
      field: 'summary',
      required: true,
      type: 'string',
      minLength: 5,
      maxLength: 500,
      sanitizer: BaseValidator.sanitizeString,
    },
    {
      field: 'strength',
      required: true,
      type: 'number',
      min: 0,
      max: 1,
    },
    {
      field: 'timestamp',
      required: true,
      type: 'date',
    },
    {
      field: 'type',
      required: true,
      type: 'string',
      enum: ['anomaly', 'pattern', 'correlation', 'indicator', 'reference'] as const,
    },
  ];

  static validate(data: Partial<Evidence>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitizedData: any = { ...data };

    for (const rule of this.rules) {
      const fieldValue = data[rule.field as keyof Evidence];
      const { errors: fieldErrors, warnings: fieldWarnings, sanitizedValue } = this.validateField(
        fieldValue,
        rule,
        data
      );

      errors.push(...fieldErrors);
      warnings.push(...fieldWarnings);

      if (fieldErrors.length === 0) {
        (sanitizedData as any)[rule.field] = sanitizedValue;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }
}

/**
 * Domain validator
 */
export class DomainValidator extends BaseValidator {
  private static rules: ValidationRule[] = [
    {
      field: 'name',
      required: true,
      type: 'string',
      enum: ['network', 'device', 'location', 'behavioral', 'temporal', 'external'] as const,
    },
    {
      field: 'status',
      required: true,
      type: 'string',
      enum: ['pending', 'analyzing', 'completed', 'failed'] as const,
    },
    {
      field: 'risk_score',
      required: false,
      type: 'number',
      min: 0,
      max: 1,
    },
    {
      field: 'confidence',
      required: false,
      type: 'number',
      min: 0,
      max: 1,
    },
  ];

  static validate(data: Partial<Domain>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const sanitizedData: any = { ...data };

    for (const rule of this.rules) {
      const fieldValue = data[rule.field as keyof Domain];
      const { errors: fieldErrors, warnings: fieldWarnings, sanitizedValue } = this.validateField(
        fieldValue,
        rule,
        data
      );

      errors.push(...fieldErrors);
      warnings.push(...fieldWarnings);

      if (fieldErrors.length === 0) {
        (sanitizedData as any)[rule.field] = sanitizedValue;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }
}

/**
 * Type guards for runtime type checking
 */
export class TypeGuards {
  static isInvestigation(data: any): data is Investigation {
    const result = InvestigationValidator.validate(data);
    return result.isValid;
  }

  static isEvidence(data: any): data is Evidence {
    const result = EvidenceValidator.validate(data);
    return result.isValid;
  }

  static isDomain(data: any): data is Domain {
    const result = DomainValidator.validate(data);
    return result.isValid;
  }

  static isEntityType(value: any): value is EntityType {
    return ['ip', 'user', 'transaction', 'device', 'email', 'domain'].includes(value);
  }

  static isInvestigationStatus(value: any): value is InvestigationStatus {
    return ['pending', 'running', 'completed', 'failed', 'cancelled'].includes(value);
  }

  static isInvestigationPhase(value: any): value is InvestigationPhase {
    return ['initialization', 'data_collection', 'analysis', 'correlation', 'finalization'].includes(value);
  }
}

/**
 * Data sanitizer utility
 */
export class DataSanitizer {
  static sanitizeInvestigation(data: any): Partial<Investigation> {
    const result = InvestigationValidator.validate(data);
    return result.sanitizedData || data;
  }

  static sanitizeEvidence(data: any): Partial<Evidence> {
    const result = EvidenceValidator.validate(data);
    return result.sanitizedData || data;
  }

  static sanitizeDomain(data: any): Partial<Domain> {
    const result = DomainValidator.validate(data);
    return result.sanitizedData || data;
  }

  static sanitizeApiResponse<T>(data: T, validator: (data: any) => ValidationResult): T {
    if (Array.isArray(data)) {
      return data.map(item => {
        const result = validator(item);
        return result.sanitizedData || item;
      }) as T;
    } else {
      const result = validator(data);
      return result.sanitizedData || data;
    }
  }
}

/**
 * Schema validation for complex objects
 */
export class SchemaValidator {
  static createInvestigationSchema() {
    return {
      type: 'object',
      required: ['id', 'entity', 'time_window', 'status', 'priority'],
      properties: {
        id: { type: 'string', pattern: '^[A-Z]{3}-\\d+$' },
        entity: {
          type: 'object',
          required: ['type', 'value'],
          properties: {
            type: { enum: ['ip', 'user', 'transaction', 'device', 'email', 'domain'] },
            value: { type: 'string', minLength: 1, maxLength: 500 },
          },
        },
        time_window: {
          type: 'object',
          required: ['start', 'end'],
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
          },
        },
        status: { enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
        priority: { enum: ['low', 'medium', 'high', 'critical'] },
        risk_score: { type: 'number', minimum: 0, maximum: 1 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    };
  }

  static validateAgainstSchema(data: any, schema: any): ValidationResult {
    // This would integrate with a JSON schema validation library
    // For now, return basic validation
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic implementation - in real app would use ajv or similar
    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'root',
        message: 'Data must be an object',
        code: 'INVALID_TYPE',
        value: data,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: data,
    };
  }
}

// Export convenience functions
export function validateInvestigation(data: any): ValidationResult {
  return InvestigationValidator.validate(data);
}

export function validateEvidence(data: any): ValidationResult {
  return EvidenceValidator.validate(data);
}

export function validateDomain(data: any): ValidationResult {
  return DomainValidator.validate(data);
}

export function isValidInvestigation(data: any): data is Investigation {
  return TypeGuards.isInvestigation(data);
}

export function isValidEvidence(data: any): data is Evidence {
  return TypeGuards.isEvidence(data);
}

export function isValidDomain(data: any): data is Domain {
  return TypeGuards.isDomain(data);
}