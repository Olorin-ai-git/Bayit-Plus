/**
 * SceneSearchPanel Styles
 * Shared styles for scene search components
 */

import { StyleSheet } from 'react-native'
import { colors, fontSizeTV } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { PLATFORM_CONFIG, isPhone, isTablet } from './platformConfig'

export const MIN_TOUCH_TARGET = PLATFORM_CONFIG.touchTargets.minHeight
export const RESULT_CARD_HEIGHT = isPhone ? 96 : isTablet ? 92 : isTV ? 100 : 88

export const sceneSearchStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isTV ? 24 : 20,
    paddingVertical: isTV ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? 12 : 8,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  titleTV: {
    fontSize: fontSizeTV.xl,
  },
  resultCount: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  resultCountTV: {
    fontSize: fontSizeTV.base,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? 12 : 8,
    paddingHorizontal: isTV ? 20 : 16,
    paddingVertical: isTV ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchRowRTL: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
  },
  listContent: {
    padding: isTV ? 12 : 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTV ? 64 : 48,
    gap: isTV ? 16 : 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyTextTV: {
    fontSize: fontSizeTV.lg,
  },
  errorText: {
    fontSize: 14,
    color: colors.error.DEFAULT,
    textAlign: 'center',
  },
  errorTextTV: {
    fontSize: fontSizeTV.lg,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isTV ? 16 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderLight,
  },
  navRowRTL: {
    flexDirection: 'row-reverse',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: isTV ? 80 : MIN_TOUCH_TARGET,
    minHeight: isTV ? 56 : MIN_TOUCH_TARGET,
    paddingHorizontal: isTV ? 16 : 12,
    paddingVertical: isTV ? 12 : 8,
    borderRadius: 8,
    backgroundColor: colors.glassLight,
    gap: isTV ? 8 : 4,
  },
  navButtonRTL: {
    flexDirection: 'row-reverse',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navText: {
    fontSize: 14,
    color: colors.text,
  },
  navTextTV: {
    fontSize: fontSizeTV.base,
  },
  navCounter: {
    fontSize: 14,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  navCounterTV: {
    fontSize: fontSizeTV.lg,
  },
})
