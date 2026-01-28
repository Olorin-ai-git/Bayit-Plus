/**
 * Olorin Glass UI - Web Components
 *
 * Glass UI component library for web platforms:
 * - React web applications
 * - WebOS TV
 * - Tizen TV
 *
 * Usage:
 * ```tsx
 * import { useGlassTheme } from '@olorin/glass-ui/web';
 * ```
 *
 * NOTE: Web components will be added as they are migrated from the shared folder.
 * See packages/ui/MIGRATION.md for migration status.
 */

// Re-export all native components (web-compatible via React Native Web)
export * from '../native/index';

// Re-export hooks (web-compatible)
export { useGlassTheme } from '../hooks/useGlassTheme';

// Re-export theme
export * from '../theme';
