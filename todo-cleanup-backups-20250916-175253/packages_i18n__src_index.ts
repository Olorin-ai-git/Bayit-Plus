/**
 * CVPlus Internationalization (i18n) Module - Main Exports
 *
 * This module provides comprehensive internationalization support for CVPlus,
 * including translation services, regional localization, and cultural adaptation.
  */

// Main translation service and constants
export * from './services/translation.service';
export * from './constants';
export * from './types';

// Regional optimization framework has been moved to @cvplus/cv-processing
// Legacy exports maintained for backward compatibility during transition
// TODO: Remove these deprecated exports in next major version
// Use: import { ... } from '@cvplus/cv-processing/regional' instead

// Initialize function for React apps
export async function initializeI18n(): Promise<void> {
  const { translationService } = await import('./services/translation.service');
  return translationService.initialize();
}