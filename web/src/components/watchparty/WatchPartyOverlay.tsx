import { useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Users, MessageSquare } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import WatchPartyHeader from './WatchPartyHeader'
import WatchPartyParticipants from './WatchPartyParticipants'
import WatchPartyChat from './WatchPartyChat'

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

interface WatchPartyOverlayProps {
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
}

const TABS = ['participants', 'chat'] as const

export default function WatchPartyOverlay({
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
}: WatchPartyOverlayProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('participants')

  if (!party || !isOpen) return null

  return (
    <View className="fixed top-0 left-0 right-0 bottom-0 z-50 justify-end">
      <Pressable className="absolute top-0 left-0 right-0 bottom-0 bg-black/50" onPress={onClose} />

      <GlassView className="max-h-[70%] rounded-t-3xl rounded-b-none" intensity="high">
        <View className="flex-row items-center justify-between p-4 border-b border-white/10">
          <Text className="text-lg font-semibold text-white">{t('watchParty.title')}</Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 items-center justify-center rounded-md hover:bg-white/10"
          >
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View className="p-4 border-b border-white/10">
          <WatchPartyHeader
            roomCode={party.room_code}
            isHost={isHost}
            isSynced={isSynced}
            hostPaused={hostPaused}
            onLeave={onLeave}
            onEnd={onEnd}
          />
        </View>

        <View className="flex-row border-b border-white/10">
          {TABS.map((tab) => {
            const Icon = tab === 'participants' ? Users : MessageSquare
            const isActive = activeTab === tab
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 flex-row items-center justify-center gap-3 py-4 ${
                  isActive ? 'border-b-2 border-purple-600 bg-purple-700/30' : ''
                }`}
              >
                <Icon size={16} color={isActive ? colors.primary : colors.textMuted} />
                <Text className={`text-sm font-medium ${isActive ? 'text-purple-400' : 'text-gray-400'}`}>
                  {tab === 'participants'
                    ? `${t('watchParty.participants')} (${participants.length})`
                    : t('watchParty.chat')}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <ScrollView className="flex-1 min-h-[200px] max-h-[300px]" contentContainerClassName="p-4">
          {activeTab === 'participants' ? (
            <WatchPartyParticipants
              participants={participants}
              hostId={party.host_id}
              currentUserId={currentUserId}
            />
          ) : (
            <WatchPartyChat
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={onSendMessage}
              chatEnabled={party.chat_enabled}
            />
          )}
        </ScrollView>
      </GlassView>
    </View>
  )
}
