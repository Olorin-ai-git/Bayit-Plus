/**
 * WatchPartyCreateModal Styles
 * Extracted StyleSheet definitions for Watch Party Create Modal component
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'

export const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  contentInfo: {
    flex: 1,
    minWidth: 0,
  },
  contentLabel: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contentTitle: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: isTV ? 80 : 44,
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  optionCardHovered: {
    backgroundColor: colors.glassLight,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  optionText: {
    flex: 1,
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.text,
  },
  checkbox: {
    width: isTV ? 48 : 28,
    height: isTV ? 48 : 28,
    borderRadius: isTV ? 8 : 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  checkboxUnchecked: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    minHeight: isTV ? 80 : 44,
    paddingVertical: isTV ? spacing.md : spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonHovered: {
    backgroundColor: colors.glassLight,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  createButton: {
    flex: 1,
    minHeight: isTV ? 80 : 44,
    paddingVertical: isTV ? spacing.md : spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonHovered: {
    backgroundColor: colors.primaryLight,
    shadowOpacity: 0.7,
    shadowRadius: 16,
  },
  createButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '700',
    color: colors.background,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
