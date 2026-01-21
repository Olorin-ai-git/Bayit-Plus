/**
 * Main Validation Service
 *
 * Orchestrates all validation modules and provides the main API.
 * Extracted from validation.service.ts for better modularity.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

import { ParsedCV } from '../types/job';
import { PortalConfig } from '../types/portal';
import { ValidationResult, ValidationOptions } from './types';
import { TextValidator } from './text-validator';
import { CVValidator } from './cv-validator';
import { PortalValidator } from './portal-validator';

export class ValidationService {
  private textValidator: TextValidator;
  private cvValidator: any;
  private portalValidator: PortalValidator;

  constructor() {
    this.textValidator = new TextValidator();
    this.cvValidator = CVValidator;
    this.portalValidator = new PortalValidator();
  }

  /**
   * Validates complete CV data
    */
  validateCV(cv: ParsedCV, _options: ValidationOptions = {}): ValidationResult {
    const allErrors: any[] = [];
    const sanitizedCV: any = {};
    const data = cv.extractedData;

    // Validate personal information
    if (data?.personalInfo) {
      const personalResult = this.cvValidator.validatePersonalInfo(data.personalInfo);
      allErrors.push(...personalResult.errors);
      sanitizedCV.personalInfo = personalResult.sanitizedData;
    }

    // Validate work experience
    if (data?.experience) {
      const expResult = this.cvValidator.validateExperience(data.experience);
      allErrors.push(...expResult.errors);
      sanitizedCV.workExperience = expResult.sanitizedData;
    }

    // Validate skills
    if (data?.skills) {
      const skillsResult = this.cvValidator.validateSkills(data.skills);
      allErrors.push(...skillsResult.errors);
      sanitizedCV.skills = skillsResult.sanitizedData;
    }

    // Validate education
    if (data?.education) {
      const eduResult = this.cvValidator.validateEducation(data.education);
      allErrors.push(...eduResult.errors);
      sanitizedCV.education = eduResult.sanitizedData;
    }

    // Validate projects (if present) - optional field not in base type
    const dataWithOptional = data as any;
    if (dataWithOptional?.projects) {
      const projectsResult = this.validateProjects(dataWithOptional.projects);
      allErrors.push(...projectsResult.errors);
      sanitizedCV.projects = projectsResult.sanitizedData;
    }

    // Validate certifications (already in type)
    if (data?.certifications) {
      const certsResult = this.validateCertifications(data.certifications);
      allErrors.push(...certsResult.errors);
      sanitizedCV.certifications = certsResult.sanitizedData;
    }

    return {
      isValid: allErrors.filter(e => e.severity === 'error').length === 0,
      errors: allErrors,
      sanitizedData: sanitizedCV
    };
  }

  /**
   * Validates portal configuration
    */
  validatePortalConfig(config: PortalConfig, _options: ValidationOptions = {}): ValidationResult {
    return this.portalValidator.validatePortalConfig(config);
  }

  /**
   * Validates individual text field
    */
  validateText(text: string, fieldName: string, maxLength: number = 1000): ValidationResult {
    return this.textValidator.validateText(text, fieldName, maxLength);
  }

  /**
   * Validates email address
    */
  validateEmail(email: string): ValidationResult {
    return this.textValidator.validateEmail(email);
  }

  /**
   * Validates URL
    */
  validateUrl(url: string, fieldName: string = 'url'): ValidationResult {
    return this.textValidator.validateUrl(url, fieldName);
  }

  /**
   * Validates date string
    */
  validateDate(date: string, fieldName: string = 'date'): ValidationResult {
    return this.textValidator.validateDate(date, fieldName);
  }

  /**
   * Validates projects array
    */
  private validateProjects(projects: any[]): ValidationResult {
    const errors: any[] = [];
    const sanitizedData: any[] = [];

    if (!Array.isArray(projects)) {
      return { isValid: true, errors: [], sanitizedData: [] };
    }

    projects.forEach((project, index) => {
      const sanitizedProject: any = {};

      // Validate project name
      if (project.name) {
        const nameResult = this.textValidator.validateText(
          project.name,
          `projects[${index}].name`,
          100
        );
        errors.push(...nameResult.errors);
        sanitizedProject.name = nameResult.sanitizedData;
      }

      // Validate description
      if (project.description) {
        const descResult = this.textValidator.validateText(
          project.description,
          `projects[${index}].description`,
          1000
        );
        errors.push(...descResult.errors);
        sanitizedProject.description = descResult.sanitizedData;
      }

      // Validate URL
      if (project.url) {
        const urlResult = this.textValidator.validateUrl(
          project.url,
          `projects[${index}].url`
        );
        errors.push(...urlResult.errors);
        sanitizedProject.url = urlResult.sanitizedData;
      }

      // Validate technologies array
      if (Array.isArray(project.technologies)) {
        sanitizedProject.technologies = [];
        project.technologies.forEach((tech: string, techIndex: number) => {
          const techResult = this.textValidator.validateText(
            tech,
            `projects[${index}].technologies[${techIndex}]`,
            50
          );
          errors.push(...techResult.errors);
          if (techResult.sanitizedData) {
            sanitizedProject.technologies.push(techResult.sanitizedData);
          }
        });
      }

      sanitizedData.push(sanitizedProject);
    });

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Validates certifications array
    */
  private validateCertifications(certifications: any[]): ValidationResult {
    const errors: any[] = [];
    const sanitizedData: any[] = [];

    if (!Array.isArray(certifications)) {
      return { isValid: true, errors: [], sanitizedData: [] };
    }

    certifications.forEach((cert, index) => {
      const sanitizedCert: any = {};

      // Validate certification name
      if (cert.name) {
        const nameResult = this.textValidator.validateText(
          cert.name,
          `certifications[${index}].name`,
          150
        );
        errors.push(...nameResult.errors);
        sanitizedCert.name = nameResult.sanitizedData;
      }

      // Validate issuer
      if (cert.issuer) {
        const issuerResult = this.textValidator.validateText(
          cert.issuer,
          `certifications[${index}].issuer`,
          100
        );
        errors.push(...issuerResult.errors);
        sanitizedCert.issuer = issuerResult.sanitizedData;
      }

      // Validate date
      if (cert.date) {
        const dateResult = this.textValidator.validateDate(
          cert.date,
          `certifications[${index}].date`
        );
        errors.push(...dateResult.errors);
        sanitizedCert.date = dateResult.sanitizedData;
      }

      // Validate URL (optional)
      if (cert.url) {
        const urlResult = this.textValidator.validateUrl(
          cert.url,
          `certifications[${index}].url`
        );
        errors.push(...urlResult.errors);
        sanitizedCert.url = urlResult.sanitizedData;
      }

      sanitizedData.push(sanitizedCert);
    });

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      sanitizedData
    };
  }
}