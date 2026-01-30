/**
 * Styles for ChannelChatPanel component
 * Extracted to keep the component under 200 lines.
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'

const GLASS_BG = 'rgba(17, 17, 34, 0.85)'
const GLASS_BLUR = 'blur(20px)'

export const panelStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    width: 340,
    maxHeight: 480,
    backgroundColor: GLASS_BG,
    backdropFilter: GLASS_BLUR as any,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: borderRadius.lg,
    zIndex: 50,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  miniBar: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: GLASS_BG,
    backdropFilter: GLASS_BLUR as any,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 50,
  },
  miniBarTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  miniBarCount: {
    color: colors.textMuted,
    fontSize: 11,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: spacing.xs,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error.DEFAULT,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.buttonText,
    fontSize: 13,
    fontWeight: '600',
  },
})
