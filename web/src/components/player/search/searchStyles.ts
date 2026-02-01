/**
 * Live Search Overlay Styles
 * Shared styles for live transcript search components
 */

import { StyleSheet, TextStyle } from 'react-native'
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens'

const TV_MIN_FONT_SIZE = 29
const TV_BODY_FONT_SIZE = 32
const TV_HEADER_FONT_SIZE = 29

interface TvTextStyles {
  headerText: TextStyle
  resultText: TextStyle
  timestampText: TextStyle
  inputText: TextStyle
}

export const getTvStyles = (isTV: boolean): TvTextStyles => ({
  headerText: isTV ? { fontSize: TV_HEADER_FONT_SIZE } : {},
  resultText: isTV ? { fontSize: TV_BODY_FONT_SIZE, lineHeight: 42 } : {},
  timestampText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
  inputText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
})

// Icon colors - exported for use in component JSX (design token references)
export const ICON_COLORS = {
  muted: colors.textMuted,
  secondary: colors.textSecondary,
  primary: colors.primary[400],
}

export const searchStyles = StyleSheet.create({
  // Panel container
  panelContainer: {
    flex: 1,
    backgroundColor: glass.bgStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  panelHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  panelTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  // Search input
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.bgMedium,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: glass.borderLight,
  },
  searchInputContainerFocused: {
    borderColor: colors.primary[400],
    backgroundColor: glass.bgStrong,
  },
  searchInputContainerRTL: {
    flexDirection: 'row-reverse',
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    marginHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  searchInputRTL: {
    textAlign: 'right',
  },
  clearButton: {
    padding: spacing.xs,
  },
  // Result card
  resultCard: {
    backgroundColor: glass.bgLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: glass.borderLight,
  },
  resultCardTV: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  resultHeaderRTL: {
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
  },
  languageBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  languageText: {
    color: colors.primary[400],
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  resultText: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  resultTextRTL: {
    textAlign: 'right',
  },
  highlightedText: {
    backgroundColor: colors.warning,
    color: colors.warningText,
  },
  // Stats bar
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: glass.border,
    marginBottom: spacing.sm,
  },
  statsBarRTL: {
    flexDirection: 'row-reverse',
  },
  statsText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // List
  listContainer: {
    flex: 1,
  },
  // Loading
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
})
