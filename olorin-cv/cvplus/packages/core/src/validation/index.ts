/**
 * Validation Module Exports
 *
 * Exports all components of the modular validation system.
 * Provides backward compatibility with the original validation.service.ts
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

// Core types and interfaces
export * from './types';

// Specialized validators
export { TextValidator } from './text-validator';
export { CVValidator } from './cv-validator';
export { PortalValidator } from './portal-validator';

// Main validation service
export { ValidationService } from './validation-service';