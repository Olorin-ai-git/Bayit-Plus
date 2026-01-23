/**
 * WatchPartyButton Styles
 * Extracted StyleSheet definitions for Watch Party Button component
 */

import { StyleSheet, I18nManager } from 'react-native'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

export const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: isTV ? spacing.md : spacing.sm,
    paddingVertical: isTV ? spacing.sm : spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buttonHovered: {
    backgroundColor: colors.glassLight,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: isTV ? 16 : 13,
    fontWeight: '600',
    color: colors.text,
  },
  activeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: isTV ? spacing.md : spacing.sm,
    paddingVertical: isTV ? spacing.sm : spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.glassPurpleLight,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  hostButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  activeButtonHovered: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderColor: colors.primary,
  },
  activeText: {
    fontSize: isTV ? 16 : 13,
    fontWeight: '600',
    color: colors.primary,
  },
  hostText: {
    color: '#F59E0B',
  },
  pulseContainer: {
    position: 'relative',
    width: isTV ? 12 : 10,
    height: isTV ? 12 : 10,
  },
  pulseDot: {
    position: 'absolute',
    width: isTV ? 12 : 10,
    height: isTV ? 12 : 10,
    borderRadius: isTV ? 6 : 5,
    backgroundColor: '#A855F7',
  },
  hostPulseDot: {
    backgroundColor: '#F59E0B',
  },
  pulseRing: {
    position: 'absolute',
    width: isTV ? 12 : 10,
    height: isTV ? 12 : 10,
    borderRadius: isTV ? 6 : 5,
    backgroundColor: '#A855F7',
  },
  hostPulseRing: {
    backgroundColor: '#F59E0B',
  },
  dropdown: {
    position: 'absolute',
    left: I18nManager.isRTL ? 'auto' : 0,
    right: I18nManager.isRTL ? 0 : 'auto',
    bottom: '100%',
    marginBottom: spacing.sm,
    width: isTV ? 240 : 192,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(17, 17, 34, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 50,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: isTV ? spacing.md : spacing.sm,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
  },
  dropdownItemHovered: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  dropdownText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.text,
  },
})
