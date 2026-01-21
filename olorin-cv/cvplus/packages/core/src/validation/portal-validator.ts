/**
 * Portal Configuration Validation Module
 *
 * Validates portal configuration data and settings.
 * Extracted from validation.service.ts for better modularity.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

import { ValidationResult, ValidationError, ValidationErrorCode } from './types';
import { TextValidator } from './text-validator';

export class PortalValidator {
  private textValidator: TextValidator;

  constructor() {
    this.textValidator = new TextValidator();
  }

  /**
   * Validates portal configuration
    */
  validatePortalConfig(config: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    if (!config || typeof config !== 'object') {
      errors.push({ name: 'PortalConfigError',
        field: 'portalConfig',
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: 'Portal configuration is required',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    // Validate required fields
    const requiredFields = ['id', 'jobId', 'userId'];
    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push({ name: 'FieldError',
          field,
          code: ValidationErrorCode.REQUIRED_FIELD,
          message: `${field} is required`,
          severity: 'error'
        });
      } else {
        sanitizedData[field] = config[field];
      }
    }

    // Validate template configuration
    if (config.template) {
      const templateResult = this.validateTemplateConfig(config.template);
      errors.push(...templateResult.errors);
      sanitizedData.template = templateResult.sanitizedData;
    }

    // Validate customization
    if (config.customization) {
      const customResult = this.validateCustomization(config.customization);
      errors.push(...customResult.errors);
      sanitizedData.customization = customResult.sanitizedData;
    }

    // Validate privacy settings
    if (config.privacy) {
      const privacyResult = this.validatePrivacySettings(config.privacy);
      errors.push(...privacyResult.errors);
      sanitizedData.privacy = privacyResult.sanitizedData;
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Validates template configuration
    */
  private validateTemplateConfig(template: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    if (!template || typeof template !== 'object') {
      errors.push({ name: 'ValidationError',
        field: 'template',
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: 'Template configuration is required',
        severity: 'error'
      });
      return { isValid: false, errors };
    }

    // Validate template ID
    if (!template.id) {
      errors.push({ name: 'ValidationError',
        field: 'template.id',
        code: ValidationErrorCode.REQUIRED_FIELD,
        message: 'Template ID is required',
        severity: 'error'
      });
    } else {
      const idResult = this.textValidator.validateText(template.id, 'template.id', 50);
      errors.push(...idResult.errors);
      sanitizedData.id = idResult.sanitizedData;
    }

    // Validate template name
    if (template.name) {
      const nameResult = this.textValidator.validateText(template.name, 'template.name', 100);
      errors.push(...nameResult.errors);
      sanitizedData.name = nameResult.sanitizedData;
    }

    // Validate category
    const validCategories = [
      'professional', 'creative', 'technical', 'academic',
      'business', 'minimal', 'modern', 'classic'
    ];

    if (template.category && !validCategories.includes(template.category)) {
      errors.push({ name: 'ValidationError',
        field: 'template.category',
        code: ValidationErrorCode.INVALID_FORMAT,
        message: `Invalid template category. Must be one of: ${validCategories.join(', ')}`,
        severity: 'error'
      });
    } else if (template.category) {
      sanitizedData.category = template.category;
    }

    // Validate theme settings
    if (template.theme) {
      const themeResult = this.validateThemeSettings(template.theme);
      errors.push(...themeResult.errors);
      sanitizedData.theme = themeResult.sanitizedData;
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Validates customization settings
    */
  private validateCustomization(customization: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    if (!customization || typeof customization !== 'object') {
      return { isValid: true, errors: [], sanitizedData: {} };
    }

    // Validate personal info in customization
    if (customization.personalInfo) {
      const personalResult = this.validateCustomPersonalInfo(customization.personalInfo);
      errors.push(...personalResult.errors);
      sanitizedData.personalInfo = personalResult.sanitizedData;
    }

    // Validate layout settings
    if (customization.layout) {
      const layoutResult = this.validateLayoutSettings(customization.layout);
      errors.push(...layoutResult.errors);
      sanitizedData.layout = layoutResult.sanitizedData;
    }

    // Validate features
    if (customization.features) {
      sanitizedData.features = this.sanitizeFeatures(customization.features);
    }

    // Validate custom CSS (if provided)
    if (customization.customCSS) {
      const cssResult = this.validateCustomCSS(customization.customCSS);
      errors.push(...cssResult.errors);
      sanitizedData.customCSS = cssResult.sanitizedData;
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData
    };
  }

  private validateCustomPersonalInfo(personalInfo: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    const textFields = ['name', 'title', 'summary', 'location'];
    const urlFields = ['website', 'linkedin', 'github', 'twitter'];

    // Validate text fields
    for (const field of textFields) {
      if (personalInfo[field]) {
        const maxLength = field === 'summary' ? 500 : 150;
        const result = this.textValidator.validateText(
          personalInfo[field],
          `customization.personalInfo.${field}`,
          maxLength
        );
        errors.push(...result.errors);
        sanitizedData[field] = result.sanitizedData;
      }
    }

    // Validate URL fields
    for (const field of urlFields) {
      if (personalInfo[field]) {
        const result = this.textValidator.validateUrl(
          personalInfo[field],
          `customization.personalInfo.${field}`
        );
        errors.push(...result.errors);
        sanitizedData[field] = result.sanitizedData;
      }
    }

    // Validate email
    if (personalInfo.email) {
      const emailResult = this.textValidator.validateEmail(personalInfo.email);
      errors.push(...emailResult.errors);
      sanitizedData.email = emailResult.sanitizedData;
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData
    };
  }

  private validateLayoutSettings(layout: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    const validHeaderStyles = ['minimal', 'detailed', 'hero'];
    const validNavStyles = ['horizontal', 'vertical', 'hidden'];
    const validContentLayouts = ['single', 'two-column', 'grid'];

    if (layout.headerStyle && !validHeaderStyles.includes(layout.headerStyle)) {
      errors.push({ name: 'ValidationError',
        field: 'layout.headerStyle',
        code: ValidationErrorCode.INVALID_FORMAT,
        message: `Invalid header style. Must be one of: ${validHeaderStyles.join(', ')}`,
        severity: 'error'
      });
    } else if (layout.headerStyle) {
      sanitizedData.headerStyle = layout.headerStyle;
    }

    if (layout.navigationStyle && !validNavStyles.includes(layout.navigationStyle)) {
      errors.push({ name: 'ValidationError',
        field: 'layout.navigationStyle',
        code: ValidationErrorCode.INVALID_FORMAT,
        message: `Invalid navigation style. Must be one of: ${validNavStyles.join(', ')}`,
        severity: 'error'
      });
    } else if (layout.navigationStyle) {
      sanitizedData.navigationStyle = layout.navigationStyle;
    }

    if (layout.contentLayout && !validContentLayouts.includes(layout.contentLayout)) {
      errors.push({ name: 'ValidationError',
        field: 'layout.contentLayout',
        code: ValidationErrorCode.INVALID_FORMAT,
        message: `Invalid content layout. Must be one of: ${validContentLayouts.join(', ')}`,
        severity: 'error'
      });
    } else if (layout.contentLayout) {
      sanitizedData.contentLayout = layout.contentLayout;
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData
    };
  }

  private validateThemeSettings(theme: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    // Validate color scheme
    if (theme.colorScheme) {
      const validSchemes = ['light', 'dark', 'auto'];
      if (!validSchemes.includes(theme.colorScheme)) {
        errors.push({ name: 'ValidationError',
          field: 'theme.colorScheme',
          code: ValidationErrorCode.INVALID_FORMAT,
          message: `Invalid color scheme. Must be one of: ${validSchemes.join(', ')}`,
          severity: 'error'
        });
      } else {
        sanitizedData.colorScheme = theme.colorScheme;
      }
    }

    // Validate colors (if provided)
    const colorFields = ['primaryColor', 'secondaryColor', 'accentColor'];
    for (const field of colorFields) {
      if (theme[field]) {
        if (this.isValidColor(theme[field])) {
          sanitizedData[field] = theme[field];
        } else {
          errors.push({ name: 'ValidationError',
            field: `theme.${field}`,
            code: ValidationErrorCode.INVALID_FORMAT,
            message: `Invalid color format for ${field}`,
            severity: 'warning'
          });
        }
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData
    };
  }

  private validatePrivacySettings(privacy: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    const validLevels = ['public', 'unlisted', 'private', 'restricted'];

    if (privacy.level && !validLevels.includes(privacy.level)) {
      errors.push({ name: 'ValidationError',
        field: 'privacy.level',
        code: ValidationErrorCode.INVALID_FORMAT,
        message: `Invalid privacy level. Must be one of: ${validLevels.join(', ')}`,
        severity: 'error'
      });
    } else if (privacy.level) {
      sanitizedData.level = privacy.level;
    }

    // Validate boolean settings
    const booleanFields = ['passwordProtected', 'analyticsEnabled', 'cookieConsent'];
    for (const field of booleanFields) {
      if (typeof privacy[field] === 'boolean') {
        sanitizedData[field] = privacy[field];
      }
    }

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData
    };
  }

  private validateCustomCSS(css: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Basic CSS validation - check for dangerous patterns
    const dangerousPatterns = [
      /@import/gi,
      /javascript:/gi,
      /expression\(/gi,
      /<script/gi,
      /document\./gi,
      /window\./gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(css)) {
        errors.push({ name: 'ValidationError',
          field: 'customCSS',
          code: ValidationErrorCode.DANGEROUS_CONTENT,
          message: 'Custom CSS contains potentially dangerous content',
          severity: 'error'
        });
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: css
    };
  }

  private sanitizeFeatures(features: any): any {
    const sanitizedFeatures: any = {};
    const validFeatures = [
      'chatbot', 'downloadCV', 'contactForm', 'analytics',
      'testimonials', 'portfolio'
    ];

    for (const feature of validFeatures) {
      if (typeof features[feature] === 'boolean') {
        sanitizedFeatures[feature] = features[feature];
      }
    }

    return sanitizedFeatures;
  }

  private isValidColor(color: string): boolean {
    // Simple color validation for hex colors
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexPattern.test(color);
  }
}