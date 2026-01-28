/**
 * Accessibility Manager
 * Utilities for WCAG 2.1 AA compliance, TalkBack support, and screen reader optimization
 */

import { AccessibilityInfo, View, ViewProps } from 'react-native';
import type { ReactNode } from 'react';

/**
 * Accessibility label patterns
 */
export interface AccessibilityLabel {
  label: string;
  hint?: string;
  role?: 'button' | 'checkbox' | 'radiobutton' | 'switch' | 'tab' | 'link';
  state?: 'disabled' | 'checked' | 'unchecked' | 'selected';
}

/**
 * Color contrast levels
 */
export interface ContrastRatio {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
}

/**
 * Accessibility features for components
 */
export const ACCESSIBILITY_PROPS = {
  // Button accessibility
  BUTTON: {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityHint: 'Double tap to activate',
  },

  // Link accessibility
  LINK: {
    accessible: true,
    accessibilityRole: 'link',
    accessibilityHint: 'Double tap to open link',
  },

  // Checkbox accessibility
  CHECKBOX: {
    accessible: true,
    accessibilityRole: 'checkbox',
  },

  // Radio button accessibility
  RADIO: {
    accessible: true,
    accessibilityRole: 'radio',
  },

  // Switch accessibility
  SWITCH: {
    accessible: true,
    accessibilityRole: 'switch',
  },

  // Tab accessibility
  TAB: {
    accessible: true,
    accessibilityRole: 'tab',
  },

  // Heading accessibility
  HEADING: {
    accessible: true,
    accessibilityRole: 'header',
  },

  // List accessibility
  LIST: {
    accessible: true,
    accessibilityRole: 'list',
  },

  // List item accessibility
  LIST_ITEM: {
    accessible: true,
    accessibilityRole: 'listitem',
  },

  // Image accessibility (always needs label)
  IMAGE: {
    accessible: true,
    accessibilityRole: 'image',
  },
};

/**
 * Create accessible button props
 */
export function createAccessibleButton(label: string, hint?: string): Partial<ViewProps> {
  return {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint || 'Double tap to activate',
  };
}

/**
 * Create accessible link props
 */
export function createAccessibleLink(label: string, url: string): Partial<ViewProps> {
  return {
    accessible: true,
    accessibilityRole: 'link',
    accessibilityLabel: label,
    accessibilityHint: `Opens ${url}`,
  };
}

/**
 * Create accessible checkbox props
 */
export function createAccessibleCheckbox(label: string, checked: boolean): Partial<ViewProps> {
  return {
    accessible: true,
    accessibilityRole: 'checkbox',
    accessibilityLabel: label,
    accessibilityState: { checked },
    accessibilityHint: checked ? 'Checked' : 'Not checked',
  };
}

/**
 * Create accessible switch props
 */
export function createAccessibleSwitch(label: string, enabled: boolean): Partial<ViewProps> {
  return {
    accessible: true,
    accessibilityRole: 'switch',
    accessibilityLabel: label,
    accessibilityState: { checked: enabled },
    accessibilityHint: enabled ? 'Enabled' : 'Disabled',
  };
}

/**
 * Announce message to screen reader
 * Useful for dynamic updates, alerts, notifications
 */
export async function announceForAccessibility(message: string): Promise<void> {
  try {
    await AccessibilityInfo.announceForAccessibility(message);
  } catch (error) {
    // Silent fail - announce not available
  }
}

/**
 * Set accessibility focus
 */
export async function setAccessibilityFocus(viewTag: number): Promise<void> {
  try {
    await AccessibilityInfo.setAccessibilityFocus(viewTag);
  } catch (error) {
    // Silent fail - focus not available
  }
}

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
}

/**
 * Calculate color contrast ratio (WCAG formula)
 * Values closer to 21 are better
 */
export function calculateContrastRatio(foreground: string, background: string): ContrastRatio {
  const fgLuminance = getLuminance(foreground);
  const bgLuminance = getLuminance(background);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: parseFloat(ratio.toFixed(2)),
    wcagAA: ratio >= 4.5, // 4.5:1 for normal text, 3:1 for large text
    wcagAAA: ratio >= 7, // 7:1 for normal text, 4.5:1 for large text
  };
}

/**
 * Get relative luminance of a color
 */
function getLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

/**
 * WCAG 2.1 AA Compliance Checklist
 */
export const WCAG_CHECKLIST = {
  // Perceivable
  PERCEIVABLE: [
    'Color is not the only way to distinguish information',
    'Text has sufficient contrast (4.5:1 for normal, 3:1 for large)',
    'Text size is at least 12px',
    'Images have alt text or labels',
  ],

  // Operable
  OPERABLE: [
    'All interactive elements are keyboard accessible',
    'Focus order is logical and visible',
    'No keyboard traps',
    'Touch targets are at least 44x44 dp',
    'No flashing content (more than 3 per second)',
    'Page can be navigated with keyboard',
  ],

  // Understandable
  UNDERSTANDABLE: [
    'Language is clear and simple',
    'Labels describe input fields',
    'Error messages are clear',
    'Actions are predictable',
    'Help is available',
  ],

  // Robust
  ROBUST: [
    'Code is valid and well-formed',
    'Screen readers can interpret content',
    'ARIA attributes are used correctly',
    'Component roles are semantic',
  ],
};

/**
 * Minimum touch target sizes
 */
export const TOUCH_TARGET_SIZES = {
  MINIMUM: 44, // 44x44 dp (WCAG 2.1 AA)
  RECOMMENDED: 48, // 48x48 dp (Material Design)
  LARGE: 56, // 56x56 dp (Material Design large buttons)
};

/**
 * Recommended font sizes for accessibility
 */
export const ACCESSIBLE_FONT_SIZES = {
  SMALL: 12,
  NORMAL: 14,
  LARGE: 18,
  XLARGE: 24,
  HEADING: 32,
};

/**
 * Create accessible heading
 */
export function createAccessibleHeading(level: 1 | 2 | 3 | 4 | 5 | 6): Partial<ViewProps> {
  return {
    accessible: true,
    accessibilityRole: 'header',
    accessibilityLabel: `Heading level ${level}`,
  };
}

/**
 * Get minimum touch target style
 */
export function getMinimumTouchTargetStyle() {
  return {
    minWidth: TOUCH_TARGET_SIZES.MINIMUM,
    minHeight: TOUCH_TARGET_SIZES.MINIMUM,
    justifyContent: 'center',
    alignItems: 'center',
  };
}
