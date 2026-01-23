/**
 * SceneSearchResultCard Styles
 */

import { StyleSheet } from 'react-native'
import { colors, tvFontSize } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

export const MIN_TOUCH_TARGET = 44

export const resultCardStyles = StyleSheet.create({
  card: {
    padding: isTV ? 16 : 12,
    borderRadius: 8,
    marginBottom: isTV ? 12 : 8,
    minHeight: isTV ? 96 : 80,
  },
  cardActive: {
    borderWidth: isTV ? 2 : 1,
    borderColor: colors.glassBorderStrong,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: isTV ? 12 : 8,
  },
  cardHovered: {
    backgroundColor: colors.glassLight,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? 16 : 12,
  },
  contentRTL: {
    flexDirection: 'row-reverse',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.glassPurpleLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timestampContainerTV: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  timestampTV: {
    fontSize: tvFontSize.sm,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? 12 : 8,
    marginBottom: isTV ? 6 : 4,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  titleTV: {
    fontSize: tvFontSize.lg,
  },
  titleActive: {
    color: colors.primaryLight,
  },
  episodeBadge: {
    backgroundColor: colors.glassPurple,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  episodeBadgeTV: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  episodeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  episodeTextTV: {
    fontSize: tvFontSize.xs,
  },
  matchedText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  matchedTextTV: {
    fontSize: tvFontSize.base,
    lineHeight: 26,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: isTV ? 8 : 6,
  },
  scoreRowRTL: {
    flexDirection: 'row-reverse',
  },
  scoreBarContainer: {
    flex: 1,
    height: isTV ? 4 : 3,
    backgroundColor: colors.glassLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scoreText: {
    fontSize: 10,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    minWidth: 28,
  },
  scoreTextTV: {
    fontSize: tvFontSize.xs,
    minWidth: 40,
  },
  // RTL fix: Use textAlign: 'left' instead of 'right' for RTL
  scoreTextLTR: {
    textAlign: 'right',
  },
  scoreTextRTL: {
    textAlign: 'left',
  },
  playButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassLight,
  },
  playButtonTV: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
  playButtonHovered: {
    backgroundColor: colors.glassLight,
  },
})
