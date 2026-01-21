import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Crown, Mic, MicOff, User } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

interface Participant {
  user_id: string
  user_name: string
  is_muted?: boolean
  is_speaking?: boolean
}

interface WatchPartyParticipantsProps {
  participants: Participant[]
  hostId: string
  currentUserId: string
}

export default function WatchPartyParticipants({ participants, hostId, currentUserId }: WatchPartyParticipantsProps) {
  const { t } = useTranslation()

  if (!participants?.length) return null

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.user_id === hostId) return -1
    if (b.user_id === hostId) return 1
    return 0
  })

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('watchParty.participants')} ({participants.length})
      </Text>
      <View style={styles.list}>
        {sortedParticipants.map((participant) => {
          const isHost = participant.user_id === hostId
          const isCurrentUser = participant.user_id === currentUserId

          return (
            <View
              key={participant.user_id}
              style={[
                styles.participant,
                participant.is_speaking && styles.participantSpeaking,
              ]}
            >
              <View style={[styles.avatar, isHost && styles.avatarHost]}>
                {isHost ? (
                  <Crown size={16} color="#FBBF24" />
                ) : (
                  <User size={16} color={colors.textMuted} />
                )}
              </View>

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {participant.user_name}
                  </Text>
                  {isCurrentUser && (
                    <Text style={styles.youLabel}>
                      ({t('watchParty.you')})
                    </Text>
                  )}
                </View>
                {isHost && (
                  <Text style={styles.hostLabel}>
                    {t('watchParty.host')}
                  </Text>
                )}
              </View>

              <View style={styles.micContainer}>
                {participant.is_muted ? (
                  <MicOff size={16} color="#F87171" />
                ) : (
                  <Mic
                    size={16}
                    color={participant.is_speaking ? '#34D399' : colors.textMuted}
                  />
                )}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  participantSpeaking: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarHost: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  youLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  hostLabel: {
    fontSize: 12,
    color: '#FBBF24',
  },
  micContainer: {
    width: 24,
    alignItems: 'center',
  },
})
