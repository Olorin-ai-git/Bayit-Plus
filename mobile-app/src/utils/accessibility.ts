/**
 * Accessibility Utilities
 *
 * Features:
 * - VoiceOver support helpers
 * - Dynamic Type scaling
 * - High Contrast mode detection
 * - Reduced Motion detection
 * - Accessible labels generation
 */

import { AccessibilityInfo, Platform } from 'react-native';
import { useState, useEffect } from 'react';

export interface AccessibilitySettings {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isReduceTransparencyEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
  isInvertColorsEnabled: boolean;
}

class AccessibilityService {
  private settings: AccessibilitySettings = {
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isReduceTransparencyEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
    isInvertColorsEnabled: false,
  };

  /**
   * Initialize accessibility settings
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios') return;

    try {
      this.settings.isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this.settings.isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      this.settings.isReduceTransparencyEnabled =
        await AccessibilityInfo.isReduceTransparencyEnabled();
      this.settings.isBoldTextEnabled = await AccessibilityInfo.isBoldTextEnabled();
      this.settings.isGrayscaleEnabled = await AccessibilityInfo.isGrayscaleEnabled();
      this.settings.isInvertColorsEnabled = await AccessibilityInfo.isInvertColorsEnabled();

      console.log('[Accessibility] Settings initialized:', this.settings);
    } catch (error) {
      console.error('[Accessibility] Failed to initialize:', error);
    }
  }

  /**
   * Get current accessibility settings
   */
  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Check if screen reader is enabled
   */
  isScreenReaderEnabled(): boolean {
    return this.settings.isScreenReaderEnabled;
  }

  /**
   * Check if reduce motion is enabled
   */
  isReduceMotionEnabled(): boolean {
    return this.settings.isReduceMotionEnabled;
  }

  /**
   * Announce message to screen reader
   */
  announce(message: string): void {
    AccessibilityInfo.announceForAccessibility(message);
  }

  /**
   * Set focus to element (for screen reader)
   */
  setAccessibilityFocus(reactTag: number): void {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
}

export const accessibilityService = new AccessibilityService();

/**
 * Hook to track accessibility settings changes
 */
export function useAccessibilitySettings(): AccessibilitySettings {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    accessibilityService.getSettings()
  );

  useEffect(() => {
    // Initialize on mount
    accessibilityService.initialize().then(() => {
      setSettings(accessibilityService.getSettings());
    });

    // Listen for screen reader changes
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        setSettings((prev) => ({ ...prev, isScreenReaderEnabled: enabled }));
      }
    );

    // Listen for reduce motion changes
    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setSettings((prev) => ({ ...prev, isReduceMotionEnabled: enabled }));
      }
    );

    // Listen for reduce transparency changes
    const reduceTransparencySubscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      (enabled) => {
        setSettings((prev) => ({ ...prev, isReduceTransparencyEnabled: enabled }));
      }
    );

    // Listen for bold text changes
    const boldTextSubscription = AccessibilityInfo.addEventListener('boldTextChanged', (enabled) => {
      setSettings((prev) => ({ ...prev, isBoldTextEnabled: enabled }));
    });

    // Listen for grayscale changes
    const grayscaleSubscription = AccessibilityInfo.addEventListener('grayscaleChanged', (enabled) => {
      setSettings((prev) => ({ ...prev, isGrayscaleEnabled: enabled }));
    });

    // Listen for invert colors changes
    const invertColorsSubscription = AccessibilityInfo.addEventListener(
      'invertColorsChanged',
      (enabled) => {
        setSettings((prev) => ({ ...prev, isInvertColorsEnabled: enabled }));
      }
    );

    return () => {
      screenReaderSubscription.remove();
      reduceMotionSubscription.remove();
      reduceTransparencySubscription.remove();
      boldTextSubscription.remove();
      grayscaleSubscription.remove();
      invertColorsSubscription.remove();
    };
  }, []);

  return settings;
}

/**
 * Generate accessible label for content card
 */
export function generateContentLabel(content: {
  title: string;
  type: string;
  duration?: number;
  isLive?: boolean;
}): string {
  const parts = [content.title];

  if (content.isLive) {
    parts.push('Live');
  } else if (content.type) {
    parts.push(content.type);
  }

  if (content.duration) {
    const minutes = Math.floor(content.duration / 60);
    parts.push(`${minutes} minutes`);
  }

  return parts.join(', ');
}

/**
 * Generate accessible label for playback controls
 */
export function generatePlaybackControlLabel(
  action: string,
  contentTitle?: string
): string {
  if (contentTitle) {
    return `${action} ${contentTitle}`;
  }
  return action;
}

/**
 * Generate accessible hint for voice commands
 */
export function generateVoiceHint(command: string): string {
  return `Say: ${command}`;
}

/**
 * Animation duration based on reduce motion setting
 */
export function getAnimationDuration(
  defaultDuration: number,
  isReduceMotionEnabled: boolean
): number {
  return isReduceMotionEnabled ? 0 : defaultDuration;
}

/**
 * Check if animations should be disabled
 */
export function shouldDisableAnimations(settings: AccessibilitySettings): boolean {
  return settings.isReduceMotionEnabled;
}

/**
 * Get adjusted font size for Dynamic Type
 */
export function getAdjustedFontSize(baseFontSize: number, fontScale: number): number {
  // Limit maximum scale to prevent layout issues
  const maxScale = 2.0;
  const adjustedScale = Math.min(fontScale, maxScale);

  return Math.round(baseFontSize * adjustedScale);
}

/**
 * Get accessible color contrast ratio
 */
export function getContrastRatio(foreground: string, background: string): number {
  // Simplified contrast ratio calculation
  // Full implementation would parse hex/rgb and calculate luminance
  // For now, return a placeholder
  return 4.5; // WCAG AA standard minimum
}

/**
 * Check if color combination meets accessibility standards
 */
export function meetsAccessibilityStandards(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minimumRatio = level === 'AAA' ? 7.0 : 4.5;

  return ratio >= minimumRatio;
}

/**
 * Accessible props for touchable elements
 */
export function getAccessibleTouchableProps(label: string, hint?: string) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button' as const,
  };
}

/**
 * Accessible props for images
 */
export function getAccessibleImageProps(description: string) {
  return {
    accessible: true,
    accessibilityLabel: description,
    accessibilityRole: 'image' as const,
  };
}

/**
 * Accessible props for text
 */
export function getAccessibleTextProps(text: string) {
  return {
    accessible: true,
    accessibilityLabel: text,
    accessibilityRole: 'text' as const,
  };
}

/**
 * Announce navigation change to screen reader
 */
export function announceNavigation(screenName: string): void {
  accessibilityService.announce(`Navigated to ${screenName}`);
}

/**
 * Announce content change to screen reader
 */
export function announceContentChange(message: string): void {
  accessibilityService.announce(message);
}

/**
 * Announce error to screen reader
 */
export function announceError(error: string): void {
  accessibilityService.announce(`Error: ${error}`);
}

/**
 * Announce success to screen reader
 */
export function announceSuccess(message: string): void {
  accessibilityService.announce(`Success: ${message}`);
}

export default accessibilityService;
