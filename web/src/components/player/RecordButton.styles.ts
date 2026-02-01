/**
 * RecordButton Styles
 */

import { StyleSheet, ViewStyle } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

/**
 * Get button idle style with RTL-aware border radius
 * In LTR: right corners are flat (split button on right)
 * In RTL: left corners are flat (split button on left)
 */
export const getButtonIdleStyle = (isRTL: boolean): ViewStyle => ({
  ...(isRTL
    ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }
    : { borderTopRightRadius: 0, borderBottomRightRadius: 0 }),
})

/**
 * Get options toggle style with RTL-aware border radius and borders
 * In LTR: rounded on right, border on left
 * In RTL: rounded on left, border on right
 */
export const getOptionsToggleStyle = (isRTL: boolean): ViewStyle => ({
  backgroundColor: 'rgba(17, 17, 34, 0.85)',
  backdropFilter: 'blur(20px)' as any,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  borderWidth: 1.5,
  borderColor: 'rgba(139, 92, 246, 0.3)',
  minHeight: 40,
  ...(isRTL
    ? {
        borderTopLeftRadius: borderRadius.xl,
        borderBottomLeftRadius: borderRadius.xl,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        borderRightWidth: 1,
        borderRightColor: 'rgba(139, 92, 246, 0.3)',
        borderLeftWidth: 1.5,
      }
    : {
        borderTopRightRadius: borderRadius.xl,
        borderBottomRightRadius: borderRadius.xl,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(139, 92, 246, 0.3)',
        borderRightWidth: 1.5,
      }),
})

export const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 200,
  },
  buttonGroup: {
    alignItems: 'center',
    gap: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(17, 17, 34, 0.85)',
    backdropFilter: 'blur(20px)',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    minHeight: 40,
    shadowColor: 'rgba(139, 92, 246, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: 'rgba(239, 68, 68, 0.6)',
    shadowColor: 'rgba(239, 68, 68, 1)',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  // buttonIdle styles moved to getButtonIdleStyle() for RTL support
  buttonHovered: {
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    borderColor: 'rgba(139, 92, 246, 0.7)',
    transform: [{ scale: 1.03 }],
  },
  buttonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  // optionsToggle styles moved to getOptionsToggleStyle() for RTL support
})
