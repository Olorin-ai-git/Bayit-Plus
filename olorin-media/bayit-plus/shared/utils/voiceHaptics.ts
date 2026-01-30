/**
 * Voice Haptic Feedback
 * Provides tactile feedback for voice interactions
 *
 * On native (iOS/Android): dynamically loads expo-haptics for real feedback.
 * On web: the dynamic import is skipped via webpackIgnore, and the catch
 * block disables haptics permanently so all calls gracefully no-op.
 */

import { Platform } from 'react-native';

// Lazily loaded expo-haptics module. `false` means load was attempted and failed.
let Haptics: any = null;

async function getHaptics(): Promise<any> {
  if (Haptics !== null || Platform.OS === 'web') return Haptics;
  try {
    Haptics = await import(/* webpackIgnore: true */ 'expo-haptics');
  } catch {
    // expo-haptics not available - disable haptics permanently
    Haptics = false;
  }
  return Haptics;
}

/**
 * Trigger haptic feedback for voice activation
 * Light impact when user activates voice input
 */
export async function voiceActivationFeedback(): Promise<void> {
  const h = await getHaptics();
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
  const h = await getHaptics();
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
  const h = await getHaptics();
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
  const h = await getHaptics();
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
  const h = await getHaptics();
  if (!h) return;

  try {
    await h.notificationAsync(h.NotificationFeedbackType.Warning);
  } catch {
    // Silently fail if haptics unavailable
  }
}
