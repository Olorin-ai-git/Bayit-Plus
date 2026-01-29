/**
 * Voice Haptic Feedback
 * Provides tactile feedback for voice interactions
 *
 * INSTALLATION REQUIRED:
 * npm install expo-haptics --save
 * or
 * yarn add expo-haptics
 */

import { Platform } from 'react-native';

// Haptics are only available on native platforms (iOS/Android).
// On web, all exported functions gracefully no-op.
let Haptics: any = null;

function getHaptics(): any {
  if (Haptics !== null || Platform.OS === 'web') return Haptics;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    Haptics = require('expo-haptics');
  } catch {
    // expo-haptics not installed - disable haptics permanently
    Haptics = false;
  }
  return Haptics;
}

/**
 * Trigger haptic feedback for voice activation
 * Light impact when user activates voice input
 */
export async function voiceActivationFeedback(): Promise<void> {
  const h = getHaptics();
  if (!h) return;

  try {
    await h.impactAsync(h.ImpactFeedbackStyle.Light);
  } catch {
    // Silently fail if haptics unavailable
  }
}

/**
 * Trigger haptic feedback for successful voice command
 * Medium impact for confirmation
 */
export async function voiceSuccessFeedback(): Promise<void> {
  const h = getHaptics();
  if (!h) return;

  try {
    await h.notificationAsync(h.NotificationFeedbackType.Success);
  } catch {
    // Silently fail if haptics unavailable
  }
}

/**
 * Trigger haptic feedback for voice error
 * Heavy impact for error notification
 */
export async function voiceErrorFeedback(): Promise<void> {
  const h = getHaptics();
  if (!h) return;

  try {
    await h.notificationAsync(h.NotificationFeedbackType.Error);
  } catch {
    // Silently fail if haptics unavailable
  }
}

/**
 * Trigger haptic feedback for mode change
 * Selection feedback for UI mode changes
 */
export async function voiceModeChangeFeedback(): Promise<void> {
  const h = getHaptics();
  if (!h) return;

  try {
    await h.selectionAsync();
  } catch {
    // Silently fail if haptics unavailable
  }
}

/**
 * Trigger haptic feedback for listening state
 * Warning feedback when listening starts
 */
export async function voiceListeningFeedback(): Promise<void> {
  const h = getHaptics();
  if (!h) return;

  try {
    await h.notificationAsync(h.NotificationFeedbackType.Warning);
  } catch {
    // Silently fail if haptics unavailable
  }
}
