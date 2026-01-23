/**
 * WatchPartyOverlay Component
 * Mobile-optimized bottom sheet overlay for Watch Party
 */

import { useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Users, MessageSquare } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import { GlassView } from '@bayit/shared/ui'
import WatchPartyHeader from './WatchPartyHeader'
import WatchPartyParticipants from './WatchPartyParticipants'
import WatchPartyChat from './WatchPartyChat'
import { styles } from './WatchPartyOverlay.styles'

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
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <GlassView style={styles.panel} intensity="high">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('watchParty.title')}</Text>
          <Pressable
            onPress={onClose}
            style={({ hovered }) => [
              styles.closeButton,
              hovered && styles.closeButtonHovered,
            ]}
          >
            <X size={isTV ? 20 : 18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.headerSection}>
          <WatchPartyHeader
            roomCode={party.room_code}
            isHost={isHost}
            isSynced={isSynced}
            hostPaused={hostPaused}
            onLeave={onLeave}
            onEnd={onEnd}
          />
        </View>

        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const Icon = tab === 'participants' ? Users : MessageSquare
            const isActive = activeTab === tab
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Icon size={isTV ? 18 : 16} color={isActive ? colors.primary : colors.textMuted} />
                <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
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
