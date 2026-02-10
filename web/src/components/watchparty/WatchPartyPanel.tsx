/**
 * WatchPartyPanel Component
 * Desktop side-panel layout for Watch Party (used instead of overlay on non-mobile)
 */

import { useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Users, MessageSquare } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { GlassView } from '@bayit/shared/ui'
import { useDirection } from '@bayit/shared/hooks/useDirection'
import WatchPartyHeader from './WatchPartyHeader'
import WatchPartyParticipants from './WatchPartyParticipants'
import WatchPartyChat from './WatchPartyChat'
import { styles } from './WatchPartyPanel.styles'

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
  currentUserId?: string
  onLeave: () => void
  onEnd: () => void
  onSendMessage: (message: string, type?: string) => void
}

const TABS = ['participants', 'chat'] as const

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
}: WatchPartyPanelProps) {
  const { t } = useTranslation()
  const { isRTL } = useDirection()
  const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('participants')

  if (!party || !isOpen) return null

  return (
    <View
      style={[
        styles.panel,
        isRTL ? styles.panelRTL : styles.panelLTR,
        styles.panelOpen,
      ]}
    >
      <View style={styles.glassBackground} />
      <GlassView style={{ flex: 1 }} intensity="high">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('watchParty.title')}</Text>
          <Pressable
            onPress={onClose}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.closeButton,
              hovered && styles.closeButtonHovered,
            ]}
          >
            <X size={isTV ? 20 : 18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <WatchPartyHeader
          roomCode={party.room_code}
          isHost={isHost}
          isSynced={isSynced}
          hostPaused={hostPaused}
          onLeave={onLeave}
          onEnd={onEnd}
        />

        <View style={styles.section}>
          {TABS.map((tab) => {
            const Icon = tab === 'participants' ? Users : MessageSquare
            const isActive = activeTab === tab
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}
              >
                <Icon size={isTV ? 18 : 16} color={isActive ? colors.primary.DEFAULT : colors.textMuted} />
                <Text style={{ color: isActive ? colors.primary.DEFAULT : colors.textMuted, fontWeight: isActive ? '600' : '400' }}>
                  {tab === 'participants'
                    ? `${t('watchParty.participants')} (${participants.length})`
                    : t('watchParty.chat')}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
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
