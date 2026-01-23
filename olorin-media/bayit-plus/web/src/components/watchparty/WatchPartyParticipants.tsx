/**
 * WatchPartyParticipants Component
 * List of participants in Watch Party with host indicator and audio status
 */

import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Crown, Mic, MicOff, User } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import { styles } from './WatchPartyParticipants.styles'

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
      <Text style={styles.header}>
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
                styles.participantCard,
                participant.is_speaking ? styles.participantSpeaking : styles.participantNormal
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  isHost ? styles.avatarHost : styles.avatarNormal
                ]}
              >
                {isHost ? (
                  <Crown size={isTV ? 18 : 16} color="#FBBF24" />
                ) : (
                  <User size={isTV ? 18 : 16} color={colors.textMuted} />
                )}
              </View>

              <View style={styles.infoContainer}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName} numberOfLines={1}>
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
                  <MicOff size={isTV ? 18 : 16} color="#F87171" />
                ) : (
                  <Mic
                    size={isTV ? 18 : 16}
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
