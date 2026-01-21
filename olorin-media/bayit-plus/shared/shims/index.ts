/**
 * Shared Shims Package
 *
 * Provides platform-agnostic shims for libraries that differ between
 * Expo (mobile-app, web) and React Native TV (tv-app, tvos-app).
 *
 * Usage in TV apps:
 * - Add "@bayit/shared-shims" path alias pointing to this directory
 * - Import from "@bayit/shared-shims" or re-export in platform-specific shims
 */

export * from './expo-linear-gradient';
export * from './expo-vector-icons';

// Re-export defaults
export { default as LinearGradient } from './expo-linear-gradient';
export { default as VectorIcons } from './expo-vector-icons';
