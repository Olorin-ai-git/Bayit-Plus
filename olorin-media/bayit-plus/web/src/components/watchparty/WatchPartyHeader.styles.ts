/**
 * WatchPartyHeader Styles
 * StyleSheet definitions for Watch Party Header component
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
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
    color: '#9CA3AF',
  },
  codeText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    fontFamily: 'Courier',
    color: colors.text,
    letterSpacing: 2,
  },
  iconButton: {
    width: isTV ? 40 : 36,
    height: isTV ? 40 : 36,
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
    paddingVertical: spacing.sm,
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
    color: '#FCA5A5',
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
    color: '#D1D5DB',
  },
})
