/**
 * SceneSearchPanel Styles
 * Shared styles for scene search components
 */

import { StyleSheet } from 'react-native'
import { colors, tvFontSize } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

export const MIN_TOUCH_TARGET = 44
export const RESULT_CARD_HEIGHT = 88

export const sceneSearchStyles = StyleSheet.create({
  panelContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    width: isTV ? 400 : 320,
    zIndex: 40,
  },
  panel: {
    flex: 1,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isTV ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  titleTV: {
    fontSize: tvFontSize.xl,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  resultCountTV: {
    fontSize: tvFontSize.base,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTV ? 12 : 8,
    padding: isTV ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderLight,
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
    fontSize: tvFontSize.lg,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  errorTextTV: {
    fontSize: tvFontSize.lg,
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
    fontSize: tvFontSize.base,
  },
  navCounter: {
    fontSize: 14,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  navCounterTV: {
    fontSize: tvFontSize.lg,
  },
})
