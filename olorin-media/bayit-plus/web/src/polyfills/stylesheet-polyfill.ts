/**
 * StyleSheet Polyfill for Migration Period
 *
 * Temporary polyfill to prevent crashes from legacy StyleSheet.create usage
 * during the gradual migration to TailwindCSS.
 *
 * This allows migrated components (Footer) to coexist with non-migrated
 * components (Header, Sidebar, etc.) without runtime errors.
 *
 * **IMPORTANT**: This is a TEMPORARY solution. All components should be
 * migrated to TailwindCSS and this polyfill should be REMOVED when migration
 * is complete.
 *
 * @deprecated Remove this file when all components are migrated to TailwindCSS
 */

import { StyleSheet as RNStyleSheet } from 'react-native';
import logger from '@/utils/logger';

// Store the original StyleSheet.create for legacy components
const originalCreate = RNStyleSheet.create;

// Export a polyfill that wraps the original
export const StyleSheet = {
  ...RNStyleSheet,
  create: (styles: any) => {
    try {
      return originalCreate(styles);
    } catch (error) {
      logger.warn(
        'StyleSheet.create failed, returning empty styles',
        'StyleSheetPolyfill',
        error
      );
      // Return empty object to prevent crashes
      return {};
    }
  },
};

// Re-export other StyleSheet utilities
export const { flatten, compose, absoluteFill, hairlineWidth } = RNStyleSheet;
