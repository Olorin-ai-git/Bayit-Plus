/**
 * WatchPartyParticipants Styles
 * StyleSheet definitions for Watch Party Participants component
 */

import { StyleSheet } from 'react-native'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'

export const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
  },
  participantSpeaking: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  participantNormal: {
    borderColor: 'transparent',
  },
  avatar: {
    width: isTV ? 40 : 32,
    height: isTV ? 40 : 32,
    borderRadius: isTV ? 20 : 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHost: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  avatarNormal: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '500',
    color: colors.text,
  },
  youLabel: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  hostLabel: {
    fontSize: isTV ? 14 : 12,
    color: colors.gold,
  },
  micContainer: {
    width: isTV ? 28 : 24,
    alignItems: 'center',
  },
})
