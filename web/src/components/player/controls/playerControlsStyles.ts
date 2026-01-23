/**
 * PlayerControls Styles
 * Shared styles for player control components
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius, tvFontSize } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

export const MIN_TOUCH_TARGET = 44
export const TV_TOUCH_TARGET = 56

export const controlStyles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: isTV ? spacing.md : 0,
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? spacing.md : spacing.sm,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? spacing.md : spacing.sm,
  },
  controlButton: {
    width: isTV ? TV_TOUCH_TARGET : MIN_TOUCH_TARGET,
    height: isTV ? TV_TOUCH_TARGET : MIN_TOUCH_TARGET,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonHovered: {
    backgroundColor: colors.glassLight,
  },
  controlButtonActive: {
    backgroundColor: colors.glassPurpleLight,
  },
  skipButton: {
    flexDirection: 'row',
    gap: isTV ? 4 : 2,
    width: isTV ? 72 : 52,
  },
  skipText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
  },
  skipTextTV: {
    fontSize: tvFontSize.xs,
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sliderContainer: {
    width: isTV ? 120 : 80,
    height: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  timeTextTV: {
    fontSize: tvFontSize.base,
  },
  speedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.glassPurpleLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  speedBadgeTV: {
    fontSize: tvFontSize.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  settingsButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
