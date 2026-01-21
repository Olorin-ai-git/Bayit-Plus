/**
 * Wizard Avatar Component - Platform-Agnostic Entry Point
 * Automatically routes to platform-specific implementation
 *
 * PLATFORMS: Web, iOS (React Native), tvOS
 * DESIGN SYSTEM: Glass Components + TailwindCSS Only
 *
 * Platform Resolution:
 * - Web: Metro bundler resolves to WizardAvatar.web.tsx (HTML5 video)
 * - iOS/Android/tvOS: Metro bundler resolves to WizardAvatar.native.tsx (react-native-video)
 *
 * Metro bundler automatically resolves .web.tsx and .native.tsx extensions
 * based on the target platform during build. This file exports from .native.tsx
 * and Metro re-routes to .web.tsx when building for web.
 */

export type { WizardAvatarProps } from './WizardAvatar.native';
export { WizardAvatar, default } from './WizardAvatar.native';
