/**
 * Comprehensive Input Validation Service
 *
 * Facade for the modular validation system.
 * Maintains backward compatibility while delegating to specialized modules.
 *
 * REFACTORED: Original 1,179-line file decomposed into focused modules
 * under ./validation/ directory for better maintainability.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

import { ParsedCV } from '../types/job';
import { PortalConfig } from '../types/portal';

// Import from modular components
export * from './validation';
import {
  ValidationService as ModularValidationService,
  ValidationResult,
  ValidationError,
  ValidationOptions,
  ValidationErrorCode
} from './validation';

/**
 * Main Validation Service class
 *
 * Provides backward compatibility interface while delegating
 * to the new modular validation system.
  */
export class ValidationService {
  private modularService: ModularValidationService;

  constructor() {
    this.modularService = new ModularValidationService();
  }

  /**
   * Validates complete CV data
   *
   * @param cv Parsed CV data to validate
   * @param options Validation options
   * @returns Validation result with errors and sanitized data
    */
  validateCV(cv: ParsedCV, _options: ValidationOptions = {}): ValidationResult {
    return this.modularService.validateCV(cv);
  }

  /**
   * Validates portal configuration
   *
   * @param config Portal configuration to validate
   * @param options Validation options
   * @returns Validation result with errors and sanitized data
    */
  validatePortalConfig(config: PortalConfig, _options: ValidationOptions = {}): ValidationResult {
    return this.modularService.validatePortalConfig(config);
  }

  /**
   * Validates individual text field
   *
   * @param text Text to validate
   * @param fieldName Name of the field for error reporting
   * @param maxLength Maximum allowed length
   * @returns Validation result
    */
  validateText(text: string, _fieldName: string, _maxLength: number = 1000): ValidationResult {
    return this.modularService.validateText(text);
  }

  /**
   * Validates email address
   *
   * @param email Email address to validate
   * @returns Validation result
    */
  validateEmail(email: string): ValidationResult {
    return this.modularService.validateEmail(email);
  }

  /**
   * Validates URL format
   *
   * @param url URL to validate
   * @param fieldName Field name for error reporting
   * @returns Validation result
    */
  validateUrl(url: string, _fieldName: string = 'url'): ValidationResult {
    return this.modularService.validateUrl(url);
  }

  /**
   * Validates date string
   *
   * @param date Date string to validate
   * @param fieldName Field name for error reporting
   * @returns Validation result
    */
  validateDate(date: string, _fieldName: string = 'date'): ValidationResult {
    return this.modularService.validateDate(date);
  }

  // Utility methods for backward compatibility

  /**
   * Checks if a validation result represents success
   *
   * @param result Validation result to check
   * @returns True if validation passed (no errors)
    */
  isValid(result: ValidationResult): boolean {
    return result.isValid;
  }

  /**
   * Gets error messages from validation result
   *
   * @param result Validation result
   * @returns Array of error messages
    */
  getErrorMessages(result: ValidationResult): string[] {
    return result.errors.map((error: ValidationError) => error.message);
  }

  /**
   * Gets errors of specific severity level
   *
   * @param result Validation result
   * @param severity Severity level to filter by
   * @returns Array of errors with specified severity
    */
  getErrorsBySeverity(result: ValidationResult, severity: 'error' | 'warning'): ValidationError[] {
    return result.errors.filter((error: ValidationError) => (error as any).severity === severity);
  }

  /**
   * Creates a validation error
   *
   * @param field Field name
   * @param code Error code
   * @param message Error message
   * @param severity Error severity
   * @returns Validation error object
    */
  createError(
    field: string,
    code: ValidationErrorCode,
    message: string,
    _severity: 'error' | 'warning' = 'error'
  ): ValidationError {
    return {
      field,
      code,
      message
    } as ValidationError & { severity: 'error' | 'warning' };
  }
}

// Export types for backward compatibility
export type {
  ValidationResult,
  ValidationError,
  ValidationOptions
};

export {
  ValidationErrorCode
};