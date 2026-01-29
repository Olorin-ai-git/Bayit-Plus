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

// Dynamic import to avoid errors when expo-haptics is not installed on web.
let Haptics: any = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Haptics = require(/* webpackIgnore: true */ 'expo-haptics');
  } catch {
    // Haptics unavailable on this platform
  }
}

/**
 * Trigger haptic feedback for voice activation
 * Light impact when user activates voice input
 */
export async function voiceActivationFeedback(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Silently fail if haptics unavailable
  }
}

/**
 * Trigger haptic feedback for successful voice command
 * Medium impact for confirmation
 */
export async function voiceSuccessFeedback(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    // Silently fail if haptics unavailable
  }
}

/**
 * Trigger haptic feedback for voice error
 * Heavy impact for error notification
 */
export async function voiceErrorFeedback(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    // Silently fail if haptics unavailable
  }
}

/**
 * Trigger haptic feedback for mode change
 * Selection feedback for UI mode changes
 */
export async function voiceModeChangeFeedback(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;

  try {
    await Haptics.selectionAsync();
  } catch (error) {
    // Silently fail if haptics unavailable
  }
}

/**
 * Trigger haptic feedback for listening state
 * Warning feedback when listening starts
 */
export async function voiceListeningFeedback(): Promise<void> {
  if (!Haptics || Platform.OS === 'web') return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    // Silently fail if haptics unavailable
  }
}
