/**
 * GlassToast Styles
 * StyleSheet styles for cross-platform toast notifications
 */

import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../../theme';
import type { NotificationLevel } from './types';

// WCAG AA verified contrast ratios on dark backgrounds
export const LEVEL_COLORS: Record<
  NotificationLevel,
  {
    bg: string;
    border: string;
    text: string;
    icon: string;
    emoji: string;
  }
> = {
  debug: {
    bg: 'rgba(100, 116, 139, 0.15)',
    border: 'rgba(148, 163, 184, 0.4)',
    text: '#e2e8f0',
    icon: '#cbd5e1',
    emoji: '🐛',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(96, 165, 250, 0.4)',
    text: '#dbeafe',
    icon: '#93c5fd',
    emoji: 'ℹ️',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(251, 191, 36, 0.5)',
    text: '#fef3c7',
    icon: '#fcd34d',
    emoji: '⚠️',
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(74, 222, 128, 0.4)',
    text: '#d1fae5',
    icon: '#86efac',
    emoji: '✅',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(248, 113, 113, 0.4)',
    text: '#fee2e2',
    icon: '#fca5a5',
    emoji: '❌',
  },
};

const PLATFORM_SIZES = {
  mobile: { min: 300, max: 360 },
  tablet: { min: 360, max: 450 },
  web: { min: 400, max: 450 },
  tv: { min: 500, max: 600 },
};

const SWIPE_THRESHOLD = {
  ios: 50,
  android: 60,
  web: 80,
  default: 50,
};

export const getSwipeThreshold = (): number => {
  return SWIPE_THRESHOLD[Platform.OS] || SWIPE_THRESHOLD.default;
};

export const getContainerWidth = (isTv: boolean = false): number => {
  if (isTv) {
    return PLATFORM_SIZES.tv.min;
  }

  if (Platform.OS === 'web') {
    return PLATFORM_SIZES.web.min;
  }

  return PLATFORM_SIZES.mobile.min;
};

export const baseStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: PLATFORM_SIZES.mobile.min,
    maxWidth: PLATFORM_SIZES.mobile.max,
    minHeight: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  webGlass: Platform.OS === 'web' ? {
    // @ts-ignore - Web-specific CSS properties
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  } : {},
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  dismissText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: fontSize.sm,
    fontWeight: '400',
    lineHeight: fontSize.sm * 1.5,
  },
  actionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});

export const tvStyles = StyleSheet.create({
  container: {
    minWidth: PLATFORM_SIZES.tv.min,
    maxWidth: PLATFORM_SIZES.tv.max,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
  },
  message: {
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
  },
  actionButton: {
    minWidth: 140,
    minHeight: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  dismissButton: {
    minWidth: 48,
    minHeight: 48,
  },
  dismissText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export const containerStyles = StyleSheet.create({
  topContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
});
