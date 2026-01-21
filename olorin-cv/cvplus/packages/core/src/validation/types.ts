/**
 * Validation Types and Interfaces
 *
 * Core types for the validation system.
 * Extracted from validation.service.ts for better modularity.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: any;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationOptions {
  allowHtml?: boolean;
  strictMode?: boolean;
  maxLength?: Record<string, number>;
  requiredFields?: string[];
  requireEmailValidation?: boolean;
  requireUrlValidation?: boolean;
  maxStringLength?: number;
  allowedImageExtensions?: string[];
  maxSkillsCount?: number;
  maxExperienceYears?: number;
}

export interface ValidationContext {
  fieldName: string;
  value: any;
  options: ValidationOptions;
  parentPath?: string;
}

export enum ValidationErrorCode {
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  TOO_LONG = 'TOO_LONG',
  TOO_SHORT = 'TOO_SHORT',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_URL = 'INVALID_URL',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_DATE = 'INVALID_DATE',
  DANGEROUS_CONTENT = 'DANGEROUS_CONTENT',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  OUT_OF_RANGE = 'OUT_OF_RANGE'
}

export class ValidationError extends Error {
  constructor(
    public field: string,
    public code: string,
    message: string,
    public severity: 'error' | 'warning' = 'error'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}