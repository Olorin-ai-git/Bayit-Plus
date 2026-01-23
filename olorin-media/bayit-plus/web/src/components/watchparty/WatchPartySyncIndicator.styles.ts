/**
 * WatchPartySyncIndicator Styles
 * StyleSheet definitions for Watch Party Sync Indicator component
 */

import { StyleSheet } from 'react-native'
import { spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '500',
  },
  containerPaused: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  textPaused: {
    color: colors.gold,
  },
  containerSynced: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  textSynced: {
    color: colors.success,
  },
  containerSyncing: {
    backgroundColor: 'rgba(109, 40, 217, 0.2)',
    borderColor: 'rgba(109, 40, 217, 0.3)',
  },
  textSyncing: {
    color: colors.info,
  },
})
