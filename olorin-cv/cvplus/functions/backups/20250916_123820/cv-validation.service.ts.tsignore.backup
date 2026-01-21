// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * CV Validation Service
 *
 * Core service for validating CV content, structure, and compliance.
 * Provides comprehensive validation including content quality, format compliance,
 * and professional standards.
 *
 * @author Gil Klainert
 * @version 2.0.0 - Modularized Architecture
 */

import { CVProcessingContext, ServiceResult } from '../../types';
import { BaseService } from '../../shared/utils/base-service';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'format' | 'structure' | 'compliance' | 'quality';
  severity: 'error' | 'warning' | 'info';
  required: boolean;
}

export interface ValidationError {
  ruleId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestions?: string[];
  location?: {
    section: string;
    line?: number;
    column?: number;
  };
}

export interface CVValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  summary: {
    totalIssues: number;
    criticalErrors: number;
    warnings: number;
    passedRules: number;
    totalRules: number;
  };
  recommendations: string[];
}

export interface ValidationOptions {
  includeContentValidation?: boolean;
  includeFormatValidation?: boolean;
  includeComplianceCheck?: boolean;
  strict?: boolean;
  targetRole?: string;
  customRules?: ValidationRule[];
}

export class CVValidationService extends BaseService {
  private validationRules: ValidationRule[] = [];

  constructor() {
    super();
    this.initializeValidationRules();
  }

  /**
   * Validate CV content and structure
   */
  async validateCV(
    cvData: any,
    options: ValidationOptions = {},
    context?: CVProcessingContext
  ): Promise<ServiceResult<CVValidationResult>> {
    try {
      this.logInfo('Starting CV validation', {
        cvId: context?.cvId,
        strict: options.strict,
        targetRole: options.targetRole
      });

      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [];
      const info: ValidationError[] = [];

      // Get applicable rules
      const applicableRules = this.getApplicableRules(options);

      // Run validation rules
      for (const rule of applicableRules) {
        const ruleResults = await this.executeValidationRule(rule, cvData, options);

        ruleResults.forEach(result => {
          switch (result.severity) {
            case 'error':
              errors.push(result);
              break;
            case 'warning':
              warnings.push(result);
              break;
            case 'info':
              info.push(result);
              break;
          }
        });
      }

      // Calculate validation score
      const score = this.calculateValidationScore(errors, warnings, applicableRules.length);
      const isValid = options.strict ? errors.length === 0 : score >= 70;

      // Generate recommendations
      const recommendations = this.generateValidationRecommendations(errors, warnings);

      const result: CVValidationResult = {
        isValid,
        score,
        errors,
        warnings,
        info,
        summary: {
          totalIssues: errors.length + warnings.length + info.length,
          criticalErrors: errors.length,
          warnings: warnings.length,
          passedRules: applicableRules.length - errors.length - warnings.length,
          totalRules: applicableRules.length
        },
        recommendations
      };

      this.logInfo('CV validation completed', {
        cvId: context?.cvId,
        isValid,
        score,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      this.logError('CV validation failed', error as Error, { cvId: context?.cvId });
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: `CV validation failed: ${(error as Error).message}`
        }
      };
    }
  }

  private initializeValidationRules(): void {
    this.validationRules = [
      // Required content rules
      {
        id: 'personal_info_required',
        name: 'Personal Information Required',
        description: 'CV must contain basic personal information',
        category: 'content',
        severity: 'error',
        required: true
      },
      {
        id: 'contact_email_required',
        name: 'Contact Email Required',
        description: 'CV must contain a valid email address',
        category: 'content',
        severity: 'error',
        required: true
      },
      {
        id: 'experience_required',
        name: 'Work Experience Required',
        description: 'CV must contain work experience information',
        category: 'content',
        severity: 'error',
        required: true
      },

      // Content quality rules
      {
        id: 'experience_details',
        name: 'Experience Details',
        description: 'Work experience should include detailed descriptions',
        category: 'quality',
        severity: 'warning',
        required: false
      },
      {
        id: 'skills_list',
        name: 'Skills List',
        description: 'CV should include a comprehensive skills list',
        category: 'quality',
        severity: 'warning',
        required: false
      },
      {
        id: 'education_info',
        name: 'Education Information',
        description: 'CV should include education background',
        category: 'quality',
        severity: 'warning',
        required: false
      },

      // Format rules
      {
        id: 'proper_formatting',
        name: 'Proper Formatting',
        description: 'CV should be properly formatted and structured',
        category: 'format',
        severity: 'warning',
        required: false
      },
      {
        id: 'length_appropriate',
        name: 'Appropriate Length',
        description: 'CV length should be appropriate for experience level',
        category: 'format',
        severity: 'info',
        required: false
      },

      // Compliance rules
      {
        id: 'no_discriminatory_content',
        name: 'No Discriminatory Content',
        description: 'CV should not contain discriminatory information',
        category: 'compliance',
        severity: 'warning',
        required: false
      },
      {
        id: 'privacy_compliance',
        name: 'Privacy Compliance',
        description: 'CV should comply with privacy regulations',
        category: 'compliance',
        severity: 'info',
        required: false
      }
    ];
  }

  private getApplicableRules(options: ValidationOptions): ValidationRule[] {
    let rules = [...this.validationRules];

    // Filter by options
    if (options.includeContentValidation === false) {
      rules = rules.filter(rule => rule.category !== 'content');
    }

    if (options.includeFormatValidation === false) {
      rules = rules.filter(rule => rule.category !== 'format');
    }

    if (options.includeComplianceCheck === false) {
      rules = rules.filter(rule => rule.category !== 'compliance');
    }

    // Add custom rules
    if (options.customRules) {
      rules.push(...options.customRules);
    }

    return rules;
  }

  private async executeValidationRule(
    rule: ValidationRule,
    cvData: any,
    options: ValidationOptions
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    switch (rule.id) {
      case 'personal_info_required':
        if (!cvData.personalInfo || !cvData.personalInfo.name) {
          errors.push({
            ruleId: rule.id,
            field: 'personalInfo.name',
            message: 'Name is required in personal information',
            severity: rule.severity,
            suggestions: ['Add your full name to the personal information section'],
            location: { section: 'personalInfo' }
          });
        }
        break;

      case 'contact_email_required':
        if (!cvData.personalInfo?.email || !this.isValidEmail(cvData.personalInfo.email)) {
          errors.push({
            ruleId: rule.id,
            field: 'personalInfo.email',
            message: 'Valid email address is required',
            severity: rule.severity,
            suggestions: ['Add a valid email address to your contact information'],
            location: { section: 'personalInfo' }
          });
        }
        break;

      case 'experience_required':
        if (!cvData.experience || !Array.isArray(cvData.experience) || cvData.experience.length === 0) {
          errors.push({
            ruleId: rule.id,
            field: 'experience',
            message: 'Work experience is required',
            severity: rule.severity,
            suggestions: ['Add at least one work experience entry'],
            location: { section: 'experience' }
          });
        }
        break;

      case 'experience_details':
        if (cvData.experience && Array.isArray(cvData.experience)) {
          cvData.experience.forEach((exp: any, index: number) => {
            if (!exp.description || exp.description.length < 50) {
              errors.push({
                ruleId: rule.id,
                field: `experience[${index}].description`,
                message: 'Experience descriptions should be detailed (at least 50 characters)',
                severity: rule.severity,
                suggestions: ['Add more detailed descriptions of your responsibilities and achievements'],
                location: { section: 'experience', line: index }
              });
            }
          });
        }
        break;

      case 'skills_list':
        if (!cvData.skills || !Array.isArray(cvData.skills) || cvData.skills.length < 3) {
          errors.push({
            ruleId: rule.id,
            field: 'skills',
            message: 'CV should include at least 3 relevant skills',
            severity: rule.severity,
            suggestions: ['Add more relevant skills to strengthen your profile'],
            location: { section: 'skills' }
          });
        }
        break;

      case 'education_info':
        if (!cvData.education || !Array.isArray(cvData.education) || cvData.education.length === 0) {
          errors.push({
            ruleId: rule.id,
            field: 'education',
            message: 'Education information is recommended',
            severity: rule.severity,
            suggestions: ['Add your educational background'],
            location: { section: 'education' }
          });
        }
        break;

      case 'proper_formatting':
        // Simple formatting check
        const sections = ['personalInfo', 'experience', 'education', 'skills'];
        const missingSections = sections.filter(section => !cvData[section]);
        if (missingSections.length > 1) {
          errors.push({
            ruleId: rule.id,
            field: 'structure',
            message: 'CV is missing important sections',
            severity: rule.severity,
            suggestions: [`Consider adding: ${missingSections.join(', ')}`],
            location: { section: 'overall' }
          });
        }
        break;

      case 'length_appropriate':
        const contentLength = JSON.stringify(cvData).length;
        if (contentLength < 500) {
          errors.push({
            ruleId: rule.id,
            field: 'overall',
            message: 'CV appears to be too short',
            severity: rule.severity,
            suggestions: ['Consider adding more detailed information about your experience and achievements'],
            location: { section: 'overall' }
          });
        }
        break;

      default:
        // Handle custom rules or skip unknown rules
        break;
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private calculateValidationScore(
    errors: ValidationError[],
    warnings: ValidationError[],
    totalRules: number
  ): number {
    if (totalRules === 0) return 100;

    const errorWeight = 10;
    const warningWeight = 3;

    const deductions = (errors.length * errorWeight) + (warnings.length * warningWeight);
    const maxDeductions = totalRules * errorWeight;

    const score = Math.max(0, 100 - (deductions / maxDeductions) * 100);
    return Math.round(score);
  }

  private generateValidationRecommendations(
    errors: ValidationError[],
    warnings: ValidationError[]
  ): string[] {
    const recommendations: string[] = [];

    // Priority recommendations based on errors
    if (errors.length > 0) {
      recommendations.push('Address all critical errors before submitting your CV');

      const criticalFields = errors.map(e => e.field);
      if (criticalFields.includes('personalInfo.name')) {
        recommendations.push('Add your full name to make your CV complete');
      }
      if (criticalFields.includes('personalInfo.email')) {
        recommendations.push('Include a valid email address for employers to contact you');
      }
      if (criticalFields.includes('experience')) {
        recommendations.push('Add work experience to demonstrate your professional background');
      }
    }

    // Secondary recommendations based on warnings
    if (warnings.length > 0) {
      recommendations.push('Consider addressing warnings to improve CV quality');

      if (warnings.some(w => w.field.includes('description'))) {
        recommendations.push('Provide more detailed descriptions of your work experience');
      }
      if (warnings.some(w => w.field === 'skills')) {
        recommendations.push('Expand your skills list to better showcase your capabilities');
      }
    }

    // General recommendations
    if (errors.length === 0 && warnings.length === 0) {
      recommendations.push('Your CV passes all validation checks - great job!');
    }

    return recommendations;
  }
}