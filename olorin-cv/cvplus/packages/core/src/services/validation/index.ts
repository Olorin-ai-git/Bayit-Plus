export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
  data?: any;
}

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  field?: string;
  value?: any;
}

export enum ValidationErrorCode {
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_VALUE = 'INVALID_VALUE',
  TOO_SHORT = 'TOO_SHORT',
  TOO_LONG = 'TOO_LONG',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_URL = 'INVALID_URL'
}

export interface ValidationOptions {
  strict?: boolean;
  skipOptional?: boolean;
  customRules?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  validator: (value: any) => boolean | string;
  message?: string;
}

export class ValidationService {
  static validate(data: any, _schema: any, _options?: ValidationOptions): ValidationResult {
    // Basic validation implementation
    const errors: ValidationError[] = [];

    // This is a placeholder implementation
    // In a real application, this would contain comprehensive validation logic
    if (!data) {
      errors.push({
        code: ValidationErrorCode.REQUIRED_FIELD_MISSING,
        message: 'Data is required',
        field: 'root'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data
    };
  }

  static validateCV(cv: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!cv.personalInfo?.fullName) {
      errors.push({
        code: ValidationErrorCode.REQUIRED_FIELD_MISSING,
        message: 'Full name is required',
        field: 'personalInfo.fullName'
      });
    }

    if (!cv.personalInfo?.email) {
      errors.push({
        code: ValidationErrorCode.REQUIRED_FIELD_MISSING,
        message: 'Email is required',
        field: 'personalInfo.email'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: cv
    };
  }

  // Instance methods for compatibility
  validateCV(cv: any): ValidationResult {
    return ValidationService.validateCV(cv);
  }

  validatePortalConfig(config: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config.id) {
      errors.push({
        code: ValidationErrorCode.REQUIRED_FIELD_MISSING,
        message: 'Portal ID is required',
        field: 'id'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: config
    };
  }

  validateText(text: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!text || text.trim().length === 0) {
      errors.push({
        code: ValidationErrorCode.REQUIRED_FIELD_MISSING,
        message: 'Text is required',
        field: 'text'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: text
    };
  }

  validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      errors.push({
        code: ValidationErrorCode.INVALID_EMAIL,
        message: 'Invalid email format',
        field: 'email'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: email
    };
  }

  validateUrl(url: string): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      new URL(url);
    } catch {
      errors.push({
        code: ValidationErrorCode.INVALID_URL,
        message: 'Invalid URL format',
        field: 'url'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: url
    };
  }

  validateDate(date: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (isNaN(Date.parse(date))) {
      errors.push({
        code: ValidationErrorCode.INVALID_DATE,
        message: 'Invalid date format',
        field: 'date'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: date
    };
  }
}