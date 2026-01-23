/**
 * WatchPartyPanel Component
 * Side panel for active Watch Party with participants, chat, and controls
 */

import { View, Text, Pressable, ScrollView, I18nManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import WatchPartyHeader from './WatchPartyHeader'
import WatchPartyParticipants from './WatchPartyParticipants'
import WatchPartyChat from './WatchPartyChat'
import AudioControls from './AudioControls'
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
  currentUserId: string
  onLeave: () => void
  onEnd: () => void
  onSendMessage: (message: string, type?: string) => void
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
  audioEnabled = false,
  isMuted = true,
  isSpeaking = false,
  isAudioConnecting = false,
  isAudioConnected = false,
  onToggleMute,
}: WatchPartyPanelProps) {
  const { t } = useTranslation()
  const closeFocus = useTVFocus({ styleType: 'button' })

  if (!party) return null

  return (
    <View
      style={[
        styles.panel,
        I18nManager.isRTL ? styles.panelRTL : styles.panelLTR,
        isOpen ? styles.panelOpen : styles.panelClosed,
      ]}
    >
      {/* Glass Background */}
      <View style={styles.glassBackground} />

      {/* Panel Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('watchParty.title', 'Watch Party')}</Text>
        <Pressable
          onPress={onClose}
          onFocus={closeFocus.handleFocus}
          onBlur={closeFocus.handleBlur}
          focusable={true}
          style={({ hovered, pressed }) => [
            styles.closeButton,
            (hovered || pressed) && styles.closeButtonHovered,
            closeFocus.isFocused && closeFocus.focusStyle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
        >
          <X size={isTV ? 22 : 18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Panel Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Room Info and Controls */}
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
          <View style={styles.section}>
            <AudioControls
              isMuted={isMuted}
              isSpeaking={isSpeaking}
              isConnecting={isAudioConnecting}
              isConnected={isAudioConnected}
              onToggleMute={onToggleMute}
            />
          </View>
        )}

        {/* Participants List */}
        <View style={styles.section}>
          <WatchPartyParticipants
            participants={participants}
            hostId={party.host_id}
            currentUserId={currentUserId}
          />
        </View>

        {/* Chat */}
        {party.chat_enabled && (
          <View style={[styles.section, styles.chatSection]}>
            <WatchPartyChat
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={onSendMessage}
              chatEnabled={party.chat_enabled}
            />
          </View>
        )}
      </ScrollView>
    </View>
  )
}
