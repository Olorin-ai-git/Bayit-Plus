/**
 * WatchPartyPanel Component
 * Side panel for active Watch Party with participants, chat, and controls
 */

import { View, Text, Pressable, ScrollView, StyleSheet, I18nManager } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
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

const PANEL_WIDTH = isTV ? 400 : 320

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: PANEL_WIDTH,
    zIndex: 40,
  },
  panelLTR: {
    left: I18nManager.isRTL ? undefined : 0,
    right: I18nManager.isRTL ? 0 : undefined,
  },
  panelRTL: {
    right: I18nManager.isRTL ? 0 : undefined,
    left: I18nManager.isRTL ? undefined : 0,
  },
  panelOpen: {
    transform: I18nManager.isRTL
      ? [{ translateX: 0 }]
      : [{ translateX: 0 }],
  },
  panelClosed: {
    transform: I18nManager.isRTL
      ? [{ translateX: PANEL_WIDTH }]
      : [{ translateX: -PANEL_WIDTH }],
  },
  glassBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 17, 34, 0.95)',
    backdropFilter: 'blur(20px)',
    borderLeftWidth: I18nManager.isRTL ? 0 : 1.5,
    borderRightWidth: I18nManager.isRTL ? 1.5 : 0,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 85, 247, 0.2)',
  },
  headerTitle: {
    fontSize: isTV ? 20 : 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    width: isTV ? 40 : 32,
    height: isTV ? 40 : 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonHovered: {
    backgroundColor: colors.glassLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168, 85, 247, 0.2)',
  },
  chatSection: {
    flex: 1,
    minHeight: 300,
  },
})
