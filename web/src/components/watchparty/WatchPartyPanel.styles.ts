/**
 * WatchPartyPanel Styles
 * Extracted StyleSheet definitions for Watch Party Panel component
 */

import { StyleSheet, I18nManager } from 'react-native'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

const PANEL_WIDTH = isTV ? 400 : 320

export const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: PANEL_WIDTH,
    zIndex: 40,
  },
  panelLTR: {
    left: I18nManager.isRTL ? undefined : 0,
    right: I18nManager.isRTL ? 0 : undefined,
  },
  panelRTL: {
    right: I18nManager.isRTL ? 0 : undefined,
    left: I18nManager.isRTL ? undefined : 0,
  },
  panelOpen: {
    transform: I18nManager.isRTL
      ? [{ translateX: 0 }]
      : [{ translateX: 0 }],
  },
  panelClosed: {
    transform: I18nManager.isRTL
      ? [{ translateX: PANEL_WIDTH }]
      : [{ translateX: -PANEL_WIDTH }],
  },
  glassBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 17, 34, 0.95)',
    backdropFilter: 'blur(20px)',
    borderLeftWidth: I18nManager.isRTL ? 0 : 1.5,
    borderRightWidth: I18nManager.isRTL ? 1.5 : 0,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 85, 247, 0.2)',
  },
  headerTitle: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: isTV ? 80 : 44,
    height: isTV ? 80 : 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonHovered: {
    backgroundColor: colors.glassLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168, 85, 247, 0.2)',
  },
  chatSection: {
    flex: 1,
    minHeight: 300,
  },
})
