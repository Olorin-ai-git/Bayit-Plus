/**
 * RecordButton Styles
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

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
  buttonIdle: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
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
  optionsToggle: {
    backgroundColor: 'rgba(17, 17, 34, 0.85)',
    backdropFilter: 'blur(20px)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopRightRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(139, 92, 246, 0.3)',
    minHeight: 40,
  },
})
