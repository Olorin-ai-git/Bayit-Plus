/**
 * Helpers for useTVConstantListening Hook
 *
 * Module initialization and logging helpers for the native
 * AudioCaptureModule on tvOS.
 */

import { NativeModules, TurboModuleRegistry } from 'react-native';
import { logger } from '../../utils/logger';

// Try TurboModule first, fall back to NativeModules
const turboModule = TurboModuleRegistry.get('AudioCaptureModule');
const nativeModule = NativeModules.AudioCaptureModule;

/** Resolved AudioCaptureModule (TurboModule preferred, NativeModule fallback) */
export const AudioCaptureModule = turboModule ?? nativeModule;

/** Tracks whether module status has been logged (log once at startup) */
let hasLoggedModuleStatus = false;

/**
 * Log the AudioCaptureModule availability status once at startup.
 * Subsequent calls are no-ops.
 */
export const logModuleStatus = () => {
  if (hasLoggedModuleStatus) return;
  hasLoggedModuleStatus = true;

  if (AudioCaptureModule) {
    logger.info('AudioCaptureModule: available', { module: 'TVVoice' });
  } else {
    logger.info('AudioCaptureModule: not available (expected on simulator)', { module: 'TVVoice' });
  }
};
