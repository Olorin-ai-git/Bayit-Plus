/**
 * Highlight Overlay Styles
 * Shared styles for highlight components with tvOS 10-foot UI support
 */

import { StyleSheet, TextStyle } from 'react-native'
import { colors, spacing, borderRadius, fontSize, glass } from '@olorin/design-tokens'

const TV_MIN_FONT_SIZE = 29
const TV_BODY_FONT_SIZE = 32
const TV_HEADER_FONT_SIZE = 29

interface TvTextStyles {
  headerText: TextStyle
  typeText: TextStyle
  transcriptText: TextStyle
  timestampText: TextStyle
}

export const getTvStyles = (isTV: boolean): TvTextStyles => ({
  headerText: isTV ? { fontSize: TV_HEADER_FONT_SIZE } : {},
  typeText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
  transcriptText: isTV ? { fontSize: TV_BODY_FONT_SIZE, lineHeight: 42 } : {},
  timestampText: isTV ? { fontSize: TV_MIN_FONT_SIZE } : {},
})

// Icon colors - exported for use in component JSX (design token references)
export const ICON_COLORS = {
  muted: colors.textMuted,
  secondary: colors.textSecondary,
  primary: colors.primary[400],
}

// Colors for different highlight types - semantic colors for detection categories
export const HIGHLIGHT_COLORS = {
  emotional: { bg: 'rgba(239, 68, 68, 0.2)', text:colors.error.DEFAULT, icon:colors.error.DEFAULT},
  entity: { bg: 'rgba(59, 130, 246, 0.2)', text: colors.primary[400], icon: colors.primary.DEFAULT },
  keyword: { bg: 'rgba(16, 185, 129, 0.2)', text:colors.success.DEFAULT, icon:colors.success.DEFAULT},
  dramatic: { bg: 'rgba(168, 85, 247, 0.2)', text: colors.accent, icon: colors.accent },
}

export const highlightStyles = StyleSheet.create({
  // Panel container (for sidebar)
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
    marginBottom: spacing.md,
  },
  panelHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  panelTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  // Overlay container (for floating display)
  overlayContainer: {
    position: 'absolute',
    top: 80,
    right: spacing.md,
    maxWidth: 320,
    zIndex: 100,
  },
  overlayContainerRTL: {
    right: undefined,
    left: spacing.md,
  },
  overlayContainerTV: {
    maxWidth: 480,
    top: 120,
    right: spacing.xl,
  },
  // Highlight card
  highlightCard: {
    backgroundColor: glass.bgStrong,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: glass.border,
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  highlightCardTV: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  // Card header
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeContainerRTL: {
    flexDirection: 'row-reverse',
  },
  headerText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Type badge
  typeBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  // Confidence indicator
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  // Transcript text
  transcriptText: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  transcriptTextRTL: {
    textAlign: 'right',
  },
  // Timestamp
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampContainerRTL: {
    flexDirection: 'row-reverse',
  },
  timestampText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  // Dismiss button
  dismissButton: {
    minWidth: 28,
    minHeight: 28,
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Error message
  errorText: {
    color: colors.error.DEFAULT,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontSize: fontSize.sm,
  },
})
