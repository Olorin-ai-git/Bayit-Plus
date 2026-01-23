import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import WatchPartyHeader from './WatchPartyHeader'
import WatchPartyParticipants from './WatchPartyParticipants'
import WatchPartyChat from './WatchPartyChat'
import AudioControls from './AudioControls'

interface Participant {
  user_id: string
  user_name: string
  is_muted?: boolean
  is_speaking?: boolean
}

interface Message {
  id?: string
  user_id: string
  user_name: string
  content: string
  message_type?: 'text' | 'emoji' | 'system'
  created_at: string
}

interface Party {
  room_code: string
  host_id: string
  chat_enabled: boolean
}

interface WatchPartyPanelProps {
  isOpen: boolean
  onClose: () => void
  party: Party | null
  participants: Participant[]
  messages: Message[]
  isHost: boolean
  isSynced: boolean
  hostPaused: boolean
  currentUserId: string
  onLeave: () => void
  onEnd: () => void
  onSendMessage: (message: string, type?: string) => void
  // Audio props
  audioEnabled?: boolean
  isMuted?: boolean
  isSpeaking?: boolean
  isAudioConnecting?: boolean
  isAudioConnected?: boolean
  onToggleMute?: () => void
}

export default function WatchPartyPanel({
  isOpen,
  onClose,
  party,
  participants,
  messages,
  isHost,
  isSynced,
  hostPaused,
  currentUserId,
  onLeave,
  onEnd,
  onSendMessage,
  // Audio props
  audioEnabled = false,
  isMuted = true,
  isSpeaking = false,
  isAudioConnecting = false,
  isAudioConnected = false,
  onToggleMute,
}: WatchPartyPanelProps) {
  const { t } = useTranslation()

  if (!party) return null

  return (
    <GlassView
      className="fixed top-0 left-0 h-screen w-80 z-40 border-l border-white/10 rounded-none transition-transform duration-300 ease-out"
      style={[isOpen ? styles.panelOpen : styles.panelClosed]}
      intensity="high"
      noBorder
    >
      <View className="flex-row items-center justify-between p-4 border-b border-white/10">
        <Text className="text-lg font-semibold text-white">{t('watchParty.title')}</Text>
        <Pressable
          onPress={onClose}
          className="w-8 h-8 items-center justify-center rounded-md hover:bg-white/10"
        >
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <WatchPartyHeader
          roomCode={party.room_code}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          onLeave={onLeave}
          onEnd={onEnd}
        />

        {/* Audio Controls */}
        {audioEnabled && (
          <View className="pt-4 border-t border-white/10">
            <AudioControls
              isMuted={isMuted}
              isSpeaking={isSpeaking}
              isConnecting={isAudioConnecting}
              isConnected={isAudioConnected}
              onToggleMute={onToggleMute}
            />
          </View>
        )}

        <View className="pt-4 border-t border-white/10">
          <WatchPartyParticipants
            participants={participants}
            hostId={party.host_id}
            currentUserId={currentUserId}
          />
        </View>

        {party.chat_enabled && (
          <View className="flex-1 pt-4 border-t border-white/10 min-h-0">
            <WatchPartyChat
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={onSendMessage}
              chatEnabled={party.chat_enabled}
            />
          </View>
        )}
      </ScrollView>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  panelOpen: {
    transform: [{ translateX: 0 }],
  },
  panelClosed: {
    transform: [{ translateX: -320 }], // -80 in rem = -320px
  },
})
