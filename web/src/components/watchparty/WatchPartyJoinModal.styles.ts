/**
 * WatchPartyJoinModal Styles
 * Extracted StyleSheet definitions for Watch Party Join Modal component
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconBackground: {
    width: isTV ? 80 : 64,
    height: isTV ? 80 : 64,
    borderRadius: isTV ? 24 : 20,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructions: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.glass,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    minHeight: isTV ? 80 : 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: isTV ? spacing.lg : spacing.md,
    fontSize: isTV ? 28 : 24,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: isTV ? 8 : 6,
  },
  inputError: {
    borderColor: colors.error.DEFAULT,
    borderWidth: 2,
  },
  characterCount: {
    position: 'absolute',
    bottom: -spacing.lg,
    right: spacing.xs,
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
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
  joinButton: {
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
  joinButtonHovered: {
    backgroundColor: colors.primaryLight,
    shadowOpacity: 0.7,
    shadowRadius: 16,
  },
  joinButtonText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '700',
    color: colors.background,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
