/**
 * WatchPartyChat Styles
 * StyleSheet definitions for Watch Party Chat component
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: isTV ? 80 : 64,
  },
  emptyText: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
  },
  inputContainer: {
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  systemMessageContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  systemMessageText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowReverse: {
    flexDirection: 'row-reverse',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleEmoji: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bubbleOwn: {
    backgroundColor: 'rgba(109, 40, 217, 0.3)',
  },
  bubbleOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  userName: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '500',
    color: colors.primaryLight,
    marginBottom: 2,
  },
  textEmoji: {
    fontSize: isTV ? 36 : 30,
  },
  textNormal: {
    fontSize: isTV ? 16 : 14,
    color: colors.text,
  },
  timestamp: {
    fontSize: isTV ? 12 : 10,
    marginTop: spacing.xs,
    opacity: 0.6,
  },
  timestampOwn: {
    color: colors.primaryLight,
  },
  timestampOther: {
    color: colors.textSecondary,
  },
})
