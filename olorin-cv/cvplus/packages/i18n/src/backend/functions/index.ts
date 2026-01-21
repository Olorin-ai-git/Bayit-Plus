/**
 * @fileoverview i18n Firebase Functions exports
 * Server-side internationalization functions for CVPlus
  */

// Core translation functions
// NOTE: Temporarily disabled due to TranslationService API mismatch - needs refactoring
// export { translateDynamic, translateBatch } from './translateDynamic';

// NOTE: CV-specific translation functions moved to @cvplus/cv-processing:
// - translateCV (moved to cv-processing submodule)
// - translateProfessional (moved to cv-processing submodule)

// NOTE: User language management functions moved to @cvplus/auth:
// - getUserLanguage (moved to auth submodule)
// - updateUserLanguage (moved to auth submodule)

// Translation management functions
// NOTE: Temporarily disabled due to TranslationService API mismatch - needs refactoring
// export { getTranslationStatus, getTranslationProgress } from './getTranslationStatus';
export { updateTranslations, deleteTranslationKeys } from './updateTranslations';

// Bulk operations
export { bulkTranslation, getBulkTranslationStatus } from './bulkTranslation';