/**
 * RecordOptionsPopover StyleSheet
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

export const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    zIndex: 1000,
    marginBottom: spacing.sm,
  },
  backdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popover: {
    width: 340,
    maxHeight: 480,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionLabel: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#ffffff',
  },
  languageSection: {
    paddingVertical: spacing.sm,
  },
  languageLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageButtonSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: colors.primary.DEFAULT,
  },
  flag: {
    fontSize: 16,
  },
  languageText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  languageTextSelected: {
    color: colors.text,
  },
  startButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
})
