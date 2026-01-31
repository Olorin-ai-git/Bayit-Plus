/**
 * SeriesRuleCard Styles
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens'

export const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardInactive: {
    opacity: 0.6,
  },
  header: {
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerContent: {
    flex: 1,
  },
  ruleName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  matchTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  badges: {
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statsRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statsText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  deleteButton: {
    backgroundColor: `${colors.error}15`,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
})
