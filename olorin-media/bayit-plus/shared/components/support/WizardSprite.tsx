/**
 * WizardSprite - Platform Dispatcher
 *
 * This file exports the native implementation by default.
 * Platform-specific bundlers will automatically use:
 * - WizardSprite.web.tsx for web builds (webpack)
 * - WizardSprite.native.tsx for iOS/Android/tvOS builds (Metro)
 *
 * This file serves as a fallback for any builds that don't match
 * the specific platform extensions.
 */

export { WizardSprite, SpritesheetType } from './WizardSprite.native';
export type { default } from './WizardSprite.native';
