import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Crown, Mic, MicOff, User } from 'lucide-react'
import { colors } from '@bayit/shared/theme'

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
    <View className="gap-3">
      <Text className="text-sm font-medium text-gray-400 px-2">
        {t('watchParty.participants')} ({participants.length})
      </Text>
      <View className="gap-2">
        {sortedParticipants.map((participant) => {
          const isHost = participant.user_id === hostId
          const isCurrentUser = participant.user_id === currentUserId

          return (
            <View
              key={participant.user_id}
              className={`flex-row items-center gap-4 p-3 rounded-lg bg-white/5 border ${
                participant.is_speaking ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-transparent'
              }`}
            >
              <View className={`w-8 h-8 rounded-full items-center justify-center ${
                isHost ? 'bg-amber-500/20' : 'bg-white/10'
              }`}>
                {isHost ? (
                  <Crown size={16} color="#FBBF24" />
                ) : (
                  <User size={16} color={colors.textMuted} />
                )}
              </View>

              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-3">
                  <Text className="text-sm font-medium text-white" numberOfLines={1}>
                    {participant.user_name}
                  </Text>
                  {isCurrentUser && (
                    <Text className="text-xs text-gray-400">
                      ({t('watchParty.you')})
                    </Text>
                  )}
                </View>
                {isHost && (
                  <Text className="text-xs text-amber-400">
                    {t('watchParty.host')}
                  </Text>
                )}
              </View>

              <View className="w-6 items-center">
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
