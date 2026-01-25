/**
 * GlassToast Accessibility
 * Screen reader support and accessibility utilities
 */

import { AccessibilityInfo, Platform } from 'react-native';
import type { NotificationLevel } from './types';

const LEVEL_LABELS: Record<NotificationLevel, string> = {
  debug: 'Debug',
  info: 'Information',
  warning: 'Warning',
  success: 'Success',
  error: 'Error',
};

/**
 * Get accessibility label for notification level
 */
export const getLevelLabel = (level: NotificationLevel): string => {
  return LEVEL_LABELS[level];
};

/**
 * Get accessibility live region priority
 */
export const getLiveRegionPriority = (
  level: NotificationLevel
): 'polite' | 'assertive' => {
  return level === 'error' || level === 'warning' ? 'assertive' : 'polite';
};

/**
 * Announce notification to screen reader
 */
export const announceToScreenReader = (
  message: string,
  title: string | undefined,
  level: NotificationLevel
): void => {
  const announcement = title
    ? `${getLevelLabel(level)}: ${title}. ${message}`
    : `${getLevelLabel(level)}: ${message}`;

  if (Platform.OS === 'web') {
    announceToWeb(announcement, level);
  } else {
    AccessibilityInfo.announceForAccessibility(announcement);
  }
};

/**
 * Web-specific screen reader announcement
 */
const announceToWeb = (announcement: string, level: NotificationLevel): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', getLiveRegionPriority(level));
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.style.position = 'absolute';
  liveRegion.style.left = '-10000px';
  liveRegion.style.width = '1px';
  liveRegion.style.height = '1px';
  liveRegion.style.overflow = 'hidden';
  liveRegion.textContent = announcement;

  document.body.appendChild(liveRegion);

  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
};

/**
 * Get accessibility hint for action button
 */
export const getActionHint = (actionLabel: string): string => {
  return `Double tap to ${actionLabel}`;
};

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false; // Assume screen readers handle ARIA properly on web
  }

  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
};
