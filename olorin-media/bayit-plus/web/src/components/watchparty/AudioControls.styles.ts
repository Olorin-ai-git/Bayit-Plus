/**
 * AudioControls Styles
 * StyleSheet definitions for Watch Party Audio Controls component
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    position: 'relative',
    width: isTV ? 80 : 44,
    height: isTV ? 80 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  buttonConnecting: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  buttonMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  buttonSpeaking: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  buttonActive: {
    backgroundColor: 'rgba(109, 40, 217, 0.3)',
  },
  speakingPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  speakingText: {
    fontSize: isTV ? 14 : 12,
    color: colors.success.DEFAULT,
  },
})
