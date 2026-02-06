/**
 * Microphone Permission Utilities
 * Browser-compatible microphone permission checking and requesting
 * Used by the streaming voice pipeline for pre-warm and interaction start
 */

import { logger } from '../utils/logger';

const log = logger.scope('MicrophonePermission');

/**
 * Check if streaming voice features are supported in the current environment
 */
export function isStreamingSupported(): boolean {
  return typeof window !== 'undefined' && typeof WebSocket !== 'undefined'
    && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Request microphone permission from the user
 * Returns false if denied, not supported, or blocked by permissions policy
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (status.state === 'denied') return false;
    } catch {
      // Some browsers don't support querying microphone permission - continue to try getUserMedia
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error: any) {
    if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
        || error?.message?.includes('Permissions policy')) {
      return false;
    }
    log.debug('Microphone permission request failed', { error: error?.message });
    return false;
  }
}

/**
 * Passively check current microphone permission state without triggering a browser prompt
 * Returns 'granted', 'denied', 'prompt', or 'unknown'
 */
export async function checkMicrophonePermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state as 'granted' | 'denied' | 'prompt';
  } catch {
    return 'unknown';
  }
}

export default { isStreamingSupported, requestMicrophonePermission, checkMicrophonePermissionState };
