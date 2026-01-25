/**
 * WatchPartyChatInput Styles
 * StyleSheet definitions for Watch Party Chat Input component
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'

export const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  emojiPanel: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    zIndex: 50,
  },
  emojiButton: {
    width: isTV ? 80 : 44,
    height: isTV ? 80 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  emojiButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiText: {
    fontSize: isTV ? 24 : 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleEmojiButton: {
    width: isTV ? 80 : 44,
    height: isTV ? 80 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  micButton: {
    width: isTV ? 80 : 44,
    height: isTV ? 80 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    transition: 'all 0.2s ease',
  } as any,
  micButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    transform: [{ scale: 1.1 }],
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: isTV ? 80 : 44,
    fontSize: isTV ? 16 : 14,
    color: colors.text,
  },
  sendButton: {
    width: isTV ? 80 : 44,
    height: isTV ? 80 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButtonActive: {
    backgroundColor: colors.primaryDark,
  },
})
