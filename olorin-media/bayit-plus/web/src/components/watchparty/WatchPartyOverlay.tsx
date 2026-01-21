import { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Users, MessageSquare } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
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
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.headerContent}>
          <WatchPartyHeader
            roomCode={party.room_code}
            isHost={isHost}
            isSynced={isSynced}
            hostPaused={hostPaused}
            onLeave={onLeave}
            onEnd={onEnd}
          />
        </View>

        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const Icon = tab === 'participants' ? Users : MessageSquare
            const isActive = activeTab === tab
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Icon size={16} color={isActive ? colors.primary : colors.textMuted} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab === 'participants'
                    ? `${t('watchParty.participants')} (${participants.length})`
                    : t('watchParty.chat')}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
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

const styles = StyleSheet.create({
  overlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    maxHeight: '70%',
    borderTopLeftRadius: borderRadius.xl * 1.5,
    borderTopRightRadius: borderRadius.xl * 1.5,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  headerContent: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    minHeight: 200,
    maxHeight: 300,
  },
  contentInner: {
    padding: spacing.md,
  },
})
