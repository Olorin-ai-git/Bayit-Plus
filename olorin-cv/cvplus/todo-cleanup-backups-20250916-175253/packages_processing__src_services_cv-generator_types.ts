// @ts-ignore
/**
 * CV Generator Types - Re-export Facade
 *
 * MIGRATION NOTICE: This module has been moved to staging-for-submodules/cv-processing/
 * for future extraction to @cvplus/cv-processing submodule.
 *
 * This file maintains backward compatibility by re-exporting from the staging area.
 * All existing imports will continue to work without changes.
 *
 * @deprecated Use import from @cvplus/cv-processing when submodule is created
 * @author Gil Klainert
 * @since 2025-09-14
  */

// TEMPORARILY DISABLED: Staging area import disabled, cv-processing not built yet
// export * from '../../staging-for-submodules/cv-processing/services/cv-generator/types';

// Temporary fallback types for backward compatibility
export interface CVGeneratorOptions {
  template?: string;
  format?: 'pdf' | 'html' | 'docx';
  theme?: string;
}

export interface CVGeneratorResult {
  success: boolean;
  url?: string;
  error?: string;
}

// TODO: Re-enable when @cvplus/cv-processing is built
// export * from '@cvplus/cv-processing/cv-generator/types';
