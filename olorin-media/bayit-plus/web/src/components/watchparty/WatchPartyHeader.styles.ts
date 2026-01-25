/**
 * WatchPartyHeader Styles
 * StyleSheet definitions for Watch Party Header component
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'

export const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeLabel: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  codeText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    fontFamily: 'Courier',
    color: colors.text,
    letterSpacing: 2,
  },
  iconButton: {
    width: isTV ? 80 : 44,
    height: isTV ? 80 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  iconButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: isTV ? 80 : 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  endButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  endButtonHovered: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  endButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.error.DEFAULT,
  },
  leaveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  leaveButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  leaveButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
})
