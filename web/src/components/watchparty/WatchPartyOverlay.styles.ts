/**
 * WatchPartyOverlay Styles
 * StyleSheet definitions for Watch Party Overlay component
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

export const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    maxHeight: '70%',
    borderTopLeftRadius: borderRadius.xl * 1.5,
    borderTopRightRadius: borderRadius.xl * 1.5,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    width: isTV ? 80 : 44,
    height: isTV ? 80 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  closeButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: isTV ? 80 : 44,
    paddingVertical: spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    backgroundColor: 'rgba(109, 40, 217, 0.3)',
  },
  tabText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primaryLight,
  },
  tabTextInactive: {
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
    minHeight: isTV ? 240 : 200,
    maxHeight: isTV ? 360 : 300,
  },
  scrollContent: {
    padding: spacing.md,
  },
})
