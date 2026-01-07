import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
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
      style={[
        styles.panel,
        isOpen ? styles.panelOpen : styles.panelClosed,
      ]}
      intensity="high"
      noBorder
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('watchParty.title')}</Text>
        <Pressable
          onPress={onClose}
          style={({ hovered }) => [
            styles.closeButton,
            hovered && styles.closeButtonHovered,
          ]}
        >
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
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

        <View style={styles.section}>
          <WatchPartyParticipants
            participants={participants}
            hostId={party.host_id}
            currentUserId={currentUserId}
          />
        </View>

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
    </GlassView>
  )
}

const styles = StyleSheet.create({
  panel: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    height: '100vh',
    width: 320,
    zIndex: 40,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 0,
    transitionProperty: 'transform',
    transitionDuration: '300ms',
    transitionTimingFunction: 'ease-out',
  } as any,
  panelOpen: {
    transform: [{ translateX: 0 }],
  },
  panelClosed: {
    transform: [{ translateX: -320 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  closeButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatSection: {
    flex: 1,
    minHeight: 0,
  },
})
