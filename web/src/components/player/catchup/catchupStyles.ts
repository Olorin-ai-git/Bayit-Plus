/**
 * Catchup Component Styles
 * Shared styles for catchup components with tvOS support
 */

import { StyleSheet, TextStyle } from 'react-native'
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens'

const TV_MIN_FONT_SIZE = 29
const TV_BODY_FONT_SIZE = 32
const TV_HEADER_FONT_SIZE = 29

interface TvTextStyles {
  headerText: TextStyle
  bodyText: TextStyle
  timestampText: TextStyle
  labelText: TextStyle
}

export const getTvStyles = (isTV: boolean): TvTextStyles => ({
  headerText: isTV ? { fontSize: TV_HEADER_FONT_SIZE } : {},
  bodyText: isTV ? { fontSize: TV_BODY_FONT_SIZE, lineHeight: 42 } : {},
  timestampText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
  labelText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
})

export const LANGUAGE_COLORS: Record<string, string> = {
  he: '#60A5FA',
  en: '#34D399',
  es: '#F59E0B',
  ar: '#A78BFA',
  default: '#9CA3AF',
}

export const catchupStyles = StyleSheet.create({
  panelContainer: {
    flex: 1,
    backgroundColor: glass.bgStrong,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: glass.border,
    maxWidth: 420,
    maxHeight: 500,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  panelHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  panelTitle: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  statsBarRTL: {
    flexDirection: 'row-reverse',
  },
  statsText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  listContainer: {
    flex: 1,
  },
  segmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentCardTV: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  segmentCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: colors.primary[400],
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  segmentHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampContainerRTL: {
    flexDirection: 'row-reverse',
  },
  timestampText: {
    color: colors.primary[400],
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  languageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  languageText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  segmentTextRTL: {
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  timelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: glass.bgMedium,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: glass.borderLight,
  },
  timelineButtonHovered: {
    backgroundColor: glass.bgStrong,
    borderColor: glass.border,
  },
  timelineButtonLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
})
